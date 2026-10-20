#!/usr/bin/env node
/**
 * Built-site smoke check (plan 439).
 *
 * The docs suite reads the source tree; this script reads the **production
 * build**. It builds `apps/docs`, serves the worker with `vite preview`, then
 * crawls the sitemap and proves that every page rendered, every internal link
 * resolves, search answers, an unknown slug is 404 and robots points at the
 * sitemap. A page that throws during SSR or a layout that loses its `<h1>` is
 * invisible to the MDX guards and fatal here.
 *
 * Since plan 510 every page must also carry the document head the site claims:
 * a description, `og:title`/`og:url`/an absolute `og:image`, a Twitter card, an
 * SVG icon and a PNG fallback, an apple-touch icon, a link to the install
 * manifest and a light/dark `theme-color`; the brand assets those tags name must
 * resolve to an image, and the manifest must be the module's own document with
 * icons that answer as PNGs (plan 516). A head without them used to pass,
 * because a missing tag is not a broken link.
 *
 *   nub scripts/smoke-build.ts [--base-url <url>] [--port <n>] [--no-build]
 *
 * Exit `0` pass, `1` the site is broken, `2` the check could not run (build or
 * preview failed) — the same "unverified is not a pass" rule as the native
 * smoke suite (plan 020).
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import {
  SetupError,
  startDocsPreview,
  type PreviewServer,
} from "./preview-server.ts";
import { highContrastLightTheme } from "@gpuixui/tokens";
import { MANIFEST_ICONS, renderManifest } from "../src/lib/site-manifest.ts";
import { SITE_NAME } from "../src/lib/site-head.ts";

const REQUEST_TIMEOUT_MS = 15_000;
const CONCURRENCY = 6;

/**
 * The shared client graph once carried `lucide-react`'s whole namespace: 1 849
 * icon records in one 701 KiB chunk on every page, because
 * `lucideIconsPlugin()` resolves names through `import { icons }`. The site
 * declares no `icon`, so the fix removed the plugin (plan 604). The full set
 * measured 1 849 records in one file; this site's tree-shaken glyphs measured
 * 24 in total, 15 in the largest asset. The limit is far above real use and far
 * below the set.
 */
const CLIENT_ASSETS = new URL(
  "../../../apps/docs/dist/client/assets/",
  import.meta.url,
);
const LUCIDE_ICON_RECORD = /name:`[a-z0-9-]+`,size:\d+,node:/g;
const ICON_RECORD_LIMIT = 100;

interface Options {
  readonly baseUrl: string | null;
  readonly build: boolean;
  readonly port: number | null;
}

interface Problem {
  readonly where: string;
  readonly what: string;
}

interface Fetched {
  readonly status: number;
  readonly body: string;
  readonly contentType: string | null;
}

const usage =
  "usage: nub scripts/smoke-build.ts [--base-url <url>] [--port <n>] [--no-build]";

const parseBaseUrl = (value: string): string => {
  try {
    const url = new URL(value);
    return url.origin + url.pathname.replace(/\/$/, "");
  } catch {
    throw new SetupError(`--base-url is not a URL: ${value}`);
  }
};

const parseOptions = (argv: ReadonlyArray<string>): Options => {
  let baseUrl: string | null = null;
  let build = true;
  let port: number | null = null;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === undefined) continue;
    if (argument === "--no-build") {
      build = false;
      continue;
    }
    if (argument === "--help" || argument === "-h") {
      console.log(usage);
      process.exit(0);
    }
    if (argument === "--base-url" || argument === "--port") {
      const value = argv[index + 1];
      if (value === undefined) {
        throw new SetupError(`${argument} needs a value`);
      }
      index += 1;
      if (argument === "--base-url") {
        baseUrl = parseBaseUrl(value);
      } else {
        const parsed = Number.parseInt(value, 10);
        if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65_535) {
          throw new SetupError(`--port is not a port: ${value}`);
        }
        port = parsed;
      }
      continue;
    }
    throw new SetupError(`unknown argument: ${argument}\n${usage}`);
  }

  return { baseUrl, build, port };
};

const request = async (url: string): Promise<Fetched | null> => {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    return {
      status: response.status,
      body: await response.text(),
      contentType: response.headers.get("content-type"),
    };
  } catch {
    return null;
  }
};

const mapLimit = async <A, B>(
  items: ReadonlyArray<A>,
  limit: number,
  visit: (item: A) => Promise<B>,
): Promise<ReadonlyArray<B>> => {
  const results: B[] = [];
  for (let start = 0; start < items.length; start += limit) {
    const chunk = items.slice(start, start + limit);
    results.push(...(await Promise.all(chunk.map(visit))));
  }
  return results;
};

const title = (html: string): string =>
  html.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim() ?? "";

const canonical = (html: string): string | null => {
  for (const match of html.matchAll(/<link\b[^>]*>/g)) {
    const tag = match[0];
    if (!/\brel="canonical"/.test(tag)) continue;
    return tag.match(/\bhref="([^"]+)"/)?.[1] ?? null;
  }
  return null;
};

/** One attribute of a start tag, or `null` when the tag does not carry it. */
const attribute = (tag: string, name: string): string | null =>
  tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1] ?? null;

const metaTags = (html: string): ReadonlyArray<string> =>
  [...html.matchAll(/<meta\b[^>]*>/g)].map((match) => match[0]);

/** The `content` of the first `<meta name|property="key">`, if any. */
const metaContent = (
  html: string,
  attributeName: "name" | "property",
  key: string,
): string | null => {
  const tag = metaTags(html).find(
    (entry) => attribute(entry, attributeName) === key,
  );
  return tag === undefined ? null : attribute(tag, "content");
};

/** Every `<meta name="key">` tag, so a duplicate or a missing one is visible. */
const metaEntries = (
  html: string,
  attributeName: "name" | "property",
  key: string,
): ReadonlyArray<{
  readonly content: string | null;
  readonly media: string | null;
}> =>
  metaTags(html).flatMap((tag) =>
    attribute(tag, attributeName) === key
      ? [
          {
            content: attribute(tag, "content"),
            media: attribute(tag, "media"),
          },
        ]
      : [],
  );

/** The `href` of a `<link rel="…">`, optionally narrowed by its `type`. */
const linkHref = (html: string, rel: string, type?: string): string | null => {
  const tag = [...html.matchAll(/<link\b[^>]*>/g)]
    .map((match) => match[0])
    .find(
      (entry) =>
        attribute(entry, "rel") === rel &&
        (type === undefined || attribute(entry, "type") === type),
    );
  return tag === undefined ? null : attribute(tag, "href");
};

const internalTargets = (html: string): ReadonlyArray<string> =>
  [...html.matchAll(/(?:href|src)="(\/[^"]*)"/g)].flatMap((match) => {
    const target = match[1];
    if (target === undefined) return [];
    const path = target.split(/[?#]/)[0];
    return path === undefined || path === "" ? [] : [path];
  });

/** The `url` of every entry in an `/api/search` response; a bad body is no answer. */
const searchUrls = (body: string): ReadonlyArray<string> => {
  const payload: unknown = JSON.parse(body);
  return Array.isArray(payload)
    ? payload.flatMap((entry: unknown) =>
        typeof entry === "object" &&
        entry !== null &&
        "url" in entry &&
        typeof entry.url === "string"
          ? [entry.url]
          : [],
      )
    : [];
};

/** Element ids in rendered HTML; a script body is data, not markup. */
const elementIds = (html: string): ReadonlySet<string> =>
  new Set(
    [
      ...html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .matchAll(/<[a-z][^>]*\sid="([^"]+)"/g),
    ].flatMap((match) => (match[1] === undefined ? [] : [match[1]])),
  );

interface FragmentLink {
  /** The sitemap path that writes the link. */
  readonly source: string;
  /** The path the fragment is checked in. */
  readonly target: string;
  readonly fragment: string;
}

/** `href="#x"` and `href="/docs/…#x"`; external links and bare `#` are not ours. */
const fragmentLinks = (
  source: string,
  html: string,
): ReadonlyArray<FragmentLink> =>
  [...html.matchAll(/\bhref="([^"]*#[^"]*)"/g)].flatMap((match) => {
    const raw = match[1];
    if (raw === undefined || raw.startsWith("//")) return [];
    const [path = "", fragment = ""] = raw.split("#");
    if (fragment === "" || /^[a-z][a-z0-9+.-]*:/i.test(raw)) return [];
    const target = path === "" ? source : path;
    if (!target.startsWith("/")) return [];
    try {
      return [{ source, target, fragment: decodeURIComponent(fragment) }];
    } catch {
      return [{ source, target, fragment }];
    }
  });

const auditPage = (
  path: string,
  page: Fetched | null,
): ReadonlyArray<Problem> => {
  const problems: Problem[] = [];
  const fail = (what: string): void => {
    problems.push({ where: path, what });
  };

  if (page === null) {
    fail("request failed");
    return problems;
  }
  if (page.status !== 200) {
    fail(`expected 200, got ${page.status}`);
    return problems;
  }

  if (title(page.body) === "") fail("no <title>");
  const headingLevels = [...page.body.matchAll(/<h([1-6])[^>]*>/g)].flatMap(
    (match) => {
      const level = match[1];
      return level === undefined ? [] : [Number.parseInt(level, 10)];
    },
  );
  const h1Count = headingLevels.filter((level) => level === 1).length;
  if (h1Count !== 1) fail(`expected one <h1>, found ${h1Count}`);
  const jump = headingLevels.reduce<string | null>((found, level, index) => {
    if (found !== null) return found;
    const previous = headingLevels[index - 1];
    return previous !== undefined && level > previous + 1
      ? `h${previous} → h${level}`
      : null;
  }, null);
  if (jump !== null) fail(`heading order skips: ${jump}`);
  const landmarks = [...page.body.matchAll(/<main\b/g)].length;
  if (landmarks !== 1) fail(`expected one <main>, found ${landmarks}`);
  if (!/<html[^>]*\slang="en"/.test(page.body)) fail('no <html lang="en">');

  const href = canonical(page.body);
  if (href === null) {
    fail("no canonical link");
  } else {
    try {
      const expected = path;
      const actual = new URL(href).pathname;
      if (actual !== expected)
        fail(`canonical ${actual}, expected ${expected}`);
    } catch {
      fail(`canonical is not absolute: ${href}`);
    }
  }

  // The document head (plan 510). A missing tag is not a broken link, so none
  // of these failures used to surface on the crawl.
  const description = metaContent(page.body, "name", "description");
  if (description === null || description.trim() === "")
    fail("no meta description");

  const ogTitle = metaContent(page.body, "property", "og:title");
  if (ogTitle === null || ogTitle.trim() === "") fail("no og:title");

  const ogUrl = metaContent(page.body, "property", "og:url");
  if (ogUrl === null) {
    fail("no og:url");
  } else {
    try {
      const actual = new URL(ogUrl).pathname;
      if (actual !== path) fail(`og:url ${actual}, expected ${path}`);
    } catch {
      fail(`og:url is not absolute: ${ogUrl}`);
    }
  }

  const ogImage = metaContent(page.body, "property", "og:image");
  if (ogImage === null) {
    fail("no og:image");
  } else {
    try {
      new URL(ogImage);
    } catch {
      fail(`og:image is not absolute: ${ogImage}`);
    }
  }

  const twitterCard = metaContent(page.body, "name", "twitter:card");
  if (twitterCard !== "summary_large_image")
    fail(`twitter:card is ${twitterCard ?? "missing"}`);

  if (linkHref(page.body, "icon", "image/svg+xml") === null)
    fail("no svg rel=icon");
  if (linkHref(page.body, "icon", "image/png") === null)
    fail("no png rel=icon");
  if (linkHref(page.body, "apple-touch-icon") === null)
    fail("no rel=apple-touch-icon");
  if (linkHref(page.body, "manifest") === null) fail("no rel=manifest");
  // TanStack keys a meta by `name` and keeps one per key, so a name meta can be
  // dropped silently; the crawl reads the built page, not the head module.
  if (metaContent(page.body, "name", "application-name") !== SITE_NAME)
    fail("application-name is not the site name");
  if (
    metaContent(page.body, "name", "apple-mobile-web-app-title") !== SITE_NAME
  )
    fail("no apple-mobile-web-app-title");

  const themeColors = metaEntries(page.body, "name", "theme-color");
  if (themeColors.length !== 2) {
    fail(`expected two theme-color metas, found ${themeColors.length}`);
  }
  for (const entry of themeColors) {
    if (entry.media === null) fail("theme-color has no media query");
    if (!/^#[0-9a-f]{6}$/i.test(entry.content ?? ""))
      fail(`theme-color ${entry.content ?? "missing"} is not #rrggbb`);
  }

  return problems;
};

const auditLinks = async (
  baseUrl: string,
  targets: ReadonlyArray<string>,
): Promise<ReadonlyArray<Problem>> =>
  mapLimit(targets, CONCURRENCY, async (path) => {
    const response = await request(baseUrl + path);
    if (response === null) return [{ where: path, what: "request failed" }];
    return response.status >= 400
      ? [{ where: path, what: `expected < 400, got ${response.status}` }]
      : [];
  }).then((groups) => groups.flat());

const auditClientBundle = (): ReadonlyArray<Problem> => {
  // A `--base-url` run may point at a deployment this checkout did not build.
  if (!existsSync(CLIENT_ASSETS)) return [];
  let total = 0;
  const problems = readdirSync(CLIENT_ASSETS)
    .filter((name) => name.endsWith(".js"))
    .flatMap((name) => {
      const file = new URL(name, CLIENT_ASSETS);
      const records = [
        ...readFileSync(file, "utf8").matchAll(LUCIDE_ICON_RECORD),
      ].length;
      total += records;
      return records > ICON_RECORD_LIMIT
        ? [
            {
              where: `/assets/${name}`,
              what: `ships ${records} lucide icon records (limit ${ICON_RECORD_LIMIT}); no page in this site declares an icon (plan 604)`,
            },
          ]
        : [];
    });
  console.log(`smoke: client bundle checked — ${total} lucide icon records`);
  return problems;
};

const audit = async (baseUrl: string): Promise<ReadonlyArray<Problem>> => {
  const problems: Problem[] = [];
  const sitemap = await request(`${baseUrl}/sitemap.xml`);
  if (sitemap === null) {
    throw new SetupError(`cannot reach ${baseUrl}/sitemap.xml`);
  }
  if (sitemap.status !== 200) {
    return [
      { where: "/sitemap.xml", what: `expected 200, got ${sitemap.status}` },
    ];
  }

  const paths = [
    ...new Set(
      [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].flatMap((match) => {
        const loc = match[1];
        if (loc === undefined) return [];
        try {
          return [new URL(loc).pathname];
        } catch {
          problems.push({ where: loc, what: "sitemap <loc> is not absolute" });
          return [];
        }
      }),
    ),
  ];
  if (paths.length === 0) {
    problems.push({ where: "/sitemap.xml", what: "no <loc> entries" });
    return problems;
  }
  for (const required of ["/docs/components/button", "/docs/api-reference"]) {
    if (!paths.includes(required)) {
      problems.push({
        where: "/sitemap.xml",
        what: `missing ${required}`,
      });
    }
  }
  console.log(`smoke: sitemap ${paths.length} pages`);

  const fetched = await mapLimit(paths, CONCURRENCY, async (path) => ({
    path,
    page: await request(baseUrl + path),
  }));
  const pages = fetched.filter(
    (entry): entry is { path: string; page: Fetched } =>
      entry.page !== null && entry.page.status === 200,
  );

  const pageProblems = fetched.flatMap(({ path, page }) =>
    auditPage(path, page),
  );
  problems.push(...pageProblems);
  console.log(`smoke: pages ${paths.length} checked`);

  const targets = [
    ...new Set(pages.flatMap(({ page }) => internalTargets(page.body))),
  ].sort();
  const linkProblems = await auditLinks(baseUrl, targets);
  problems.push(...linkProblems);
  console.log(`smoke: links ${targets.length} checked`);

  // The brand assets the head names (plan 510). The crawl reaches an icon
  // through `href`, but `og:image` rides in a meta `content`, so without this
  // a renamed card would still share a 404.
  const cards = new Set(
    pages.flatMap(({ page }) => {
      const value = metaContent(page.body, "property", "og:image");
      return value === null ? [] : [value];
    }),
  );
  if (cards.size > 1) {
    problems.push({
      where: "/head",
      what: `og:image differs across pages: ${[...cards].join(", ")}`,
    });
  }
  const brandTargets = [
    ...new Map(
      pages
        .flatMap(({ path, page }) =>
          [
            metaContent(page.body, "property", "og:image"),
            linkHref(page.body, "icon"),
            linkHref(page.body, "apple-touch-icon"),
          ].flatMap((value) => {
            if (value === null) return [];
            try {
              return [{ path: new URL(value, baseUrl).pathname, source: path }];
            } catch {
              return [];
            }
          }),
        )
        .map((target) => [target.path, target] as const),
    ).values(),
  ];
  const brandProblems = await mapLimit(
    brandTargets,
    CONCURRENCY,
    async (target) => {
      const response = await request(baseUrl + target.path);
      if (response === null)
        return [
          { where: target.path, what: `${target.source}: request failed` },
        ];
      if (response.status !== 200)
        return [
          {
            where: target.path,
            what: `${target.source}: expected 200, got ${response.status}`,
          },
        ];
      return response.contentType?.startsWith("image/") === true
        ? []
        : [
            {
              where: target.path,
              what: `${target.source}: content-type ${response.contentType ?? "missing"} is not an image`,
            },
          ];
    },
  ).then((groups) => groups.flat());
  problems.push(...brandProblems);
  console.log(`smoke: brand ${brandTargets.length} assets checked`);

  // The install metadata (plan 516). The route serves the module's document
  // byte for byte, so a stale or hand-written manifest fails here even though
  // the unit suite already decoded the module's output.
  const manifest = await request(`${baseUrl}/site.webmanifest`);
  if (manifest === null) {
    problems.push({ where: "/site.webmanifest", what: "request failed" });
  } else if (manifest.status !== 200) {
    problems.push({
      where: "/site.webmanifest",
      what: `expected 200, got ${manifest.status}`,
    });
  } else {
    if (
      manifest.contentType?.startsWith("application/manifest+json") !== true
    ) {
      problems.push({
        where: "/site.webmanifest",
        what: `content-type ${manifest.contentType ?? "missing"} is not application/manifest+json`,
      });
    }
    if (manifest.body !== renderManifest()) {
      problems.push({
        where: "/site.webmanifest",
        what: "the served document is not renderManifest()",
      });
    }
  }

  const manifestIcons = await mapLimit(
    MANIFEST_ICONS,
    CONCURRENCY,
    async (icon) => {
      const path = new URL(icon.src, baseUrl).pathname;
      const response = await request(baseUrl + path);
      if (response === null)
        return [{ where: path, what: "manifest icon: request failed" }];
      return response.status === 200 && response.contentType === "image/png"
        ? []
        : [
            {
              where: path,
              what: `manifest icon: expected 200 image/png, got ${response.status} ${response.contentType ?? "missing"}`,
            },
          ];
    },
  ).then((groups) => groups.flat());
  problems.push(...manifestIcons);
  console.log(`smoke: install metadata checked`);

  // Machine discovery (plan 525). Both documents are generated from the page
  // tree, so the index and the sitemap must agree in both directions: a page a
  // crawler sees cannot be absent from the index, and an index link cannot point
  // at a page this site does not serve.
  const llmsIndex = await request(`${baseUrl}/llms.txt`);
  const llmsFull = await request(`${baseUrl}/llms-full.txt`);
  for (const [path, response] of [
    ["/llms.txt", llmsIndex],
    ["/llms-full.txt", llmsFull],
  ] as const) {
    if (response === null) {
      problems.push({ where: path, what: "request failed" });
    } else if (response.status !== 200) {
      problems.push({
        where: path,
        what: `expected 200, got ${response.status}`,
      });
    } else if (response.contentType?.startsWith("text/plain") !== true) {
      problems.push({
        where: path,
        what: `content-type ${response.contentType ?? "missing"} is not text/plain`,
      });
    }
  }
  if (llmsIndex?.status === 200) {
    const linked = new Set(
      [...llmsIndex.body.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)].flatMap(
        (match) => {
          const url = match[1];
          if (url === undefined) return [];
          try {
            return [new URL(url).pathname];
          } catch {
            problems.push({ where: "/llms.txt", what: `${url} is not a URL` });
            return [];
          }
        },
      ),
    );
    const documented = paths.filter((path) => path.startsWith("/docs"));
    for (const path of documented) {
      if (!linked.has(path)) {
        problems.push({ where: "/llms.txt", what: `missing ${path}` });
      }
    }
    for (const path of linked) {
      if (!paths.includes(path)) {
        problems.push({
          where: "/llms.txt",
          what: `links ${path}, which the sitemap does not serve`,
        });
      }
    }
    if (!llmsIndex.body.startsWith("# GPUIXUI")) {
      problems.push({
        where: "/llms.txt",
        what: "does not open with # GPUIXUI",
      });
    }
  }
  if (
    llmsFull?.status === 200 &&
    (!llmsFull.body.includes("# Buttons") ||
      !llmsFull.body.includes("Source: https://"))
  ) {
    problems.push({
      where: "/llms-full.txt",
      what: "does not render the Buttons page as Markdown",
    });
  }
  console.log(`smoke: llms discovery checked`);

  // Per-page Markdown (plan 596). The route serves one page as the same
  // `llms()` render the full document carries, and the built page offers it.
  const pageMarkdown = await request(`${baseUrl}/docs/components/button.md`);
  if (pageMarkdown === null) {
    problems.push({
      where: "/docs/components/button.md",
      what: "request failed",
    });
  } else if (pageMarkdown.status !== 200) {
    problems.push({
      where: "/docs/components/button.md",
      what: `expected 200, got ${pageMarkdown.status}`,
    });
  } else if (pageMarkdown.contentType?.startsWith("text/markdown") !== true) {
    problems.push({
      where: "/docs/components/button.md",
      what: `content-type ${pageMarkdown.contentType ?? "missing"} is not text/markdown`,
    });
  } else if (
    !pageMarkdown.body.startsWith("# Buttons") ||
    pageMarkdown.body.includes("---\ntitle:")
  ) {
    problems.push({
      where: "/docs/components/button.md",
      what: "is not the rendered Buttons Markdown",
    });
  }

  const missingMarkdown = await request(`${baseUrl}/docs/nope.md`);
  if (missingMarkdown === null || missingMarkdown.status !== 404) {
    problems.push({
      where: "/docs/nope.md",
      what:
        missingMarkdown === null
          ? "request failed"
          : `expected 404, got ${missingMarkdown.status}`,
    });
  }

  const buttonPage = pages.find(
    ({ path }) => path === "/docs/components/button",
  );
  const controls =
    buttonPage === undefined
      ? null
      : [
          "Copy Markdown",
          "View as Markdown",
          'href="/docs/components/button.md"',
        ].filter((text) => !buttonPage.page.body.includes(text));
  if (controls === null || controls.length > 0) {
    problems.push({
      where: "/docs/components/button",
      what:
        controls === null
          ? "is not in the sitemap, so its Markdown control cannot be checked"
          : `does not offer ${controls.join(", ")}`,
    });
  }
  console.log(`smoke: page markdown checked`);

  const ids = new Map(
    pages.map(({ path, page }) => [path, elementIds(page.body)] as const),
  );
  const anchors = [
    ...new Map(
      pages
        .flatMap(({ path, page }) => fragmentLinks(path, page.body))
        .map(
          (link) =>
            [`${link.source}→${link.target}#${link.fragment}`, link] as const,
        ),
    ).values(),
  ];
  const anchorProblems = anchors.flatMap(({ source, target, fragment }) => {
    const targetIds = ids.get(target);
    // A target outside the sitemap is not a claim this check makes; the link
    // audit already proves it answers below 400.
    if (targetIds === undefined) return [];
    return targetIds.has(fragment)
      ? []
      : [
          {
            where: source,
            what: `#${fragment} has no element with that id in ${target}`,
          },
        ];
  });
  problems.push(...anchorProblems);
  console.log(`smoke: anchors ${anchors.length} checked`);

  const searchChecks = [
    {
      query: "button",
      expected: "/docs/components/button",
      first: false,
      what: "a component name from the registry index",
    },
    {
      query: "aria-checked",
      expected: "/docs/components/checkbox",
      first: false,
      what: "a component page's documented prose",
    },
    {
      query: "DialogTitle",
      expected: "/docs/components/dialog",
      first: false,
      what: "an exported part name from the registry",
    },
    {
      query: "checkboxState",
      expected: "/docs/api-values",
      first: false,
      what: "a helper name from the generated value index",
    },
    {
      query: "Spinner",
      expected: "/docs/components/spinner",
      first: true,
      what: "an exported symbol that is not the record's title",
    },
    {
      query: "destructiveSoft",
      expected: "/docs/theming",
      first: true,
      what: "a token role from the generated token index",
    },
    {
      query: highContrastLightTheme.colors.borderStrong,
      expected: "/docs/theming#high-contrast",
      first: true,
      what: "a pasted high-contrast token value",
    },
    {
      query: "modal-focus-trap",
      expected: "/docs/capabilities",
      first: true,
      what: "a scenario id from the generated capability index",
    },
    {
      query: "chevrons-up-down",
      expected: "/docs/components/icon",
      first: true,
      what: "an icon name from the generated catalogue",
    },
    {
      query: "aria-valuenow",
      expected: "/docs/accessibility",
      first: true,
      what: "a missing ARIA attribute from the generated accessibility index",
    },
    {
      query: "testId",
      expected: "/docs/component-api",
      first: true,
      what: "a shared host prop from the generated host-prop index",
    },
    {
      query: "shared host props",
      expected: "/docs/component-api",
      first: true,
      what: "the shared host props section's own heading",
    },
    {
      query: "alertdialog",
      expected: "/docs/components/confirm-dialog",
      first: true,
      what: "an ARIA name recovered by the fourth alias pass",
    },
    {
      query: "scrollbar",
      expected: "/docs/components/scroll-area",
      first: true,
      what: "a reader's word for the scroll container",
    },
    {
      query: "a11y",
      expected: "/docs/accessibility",
      first: true,
      what: "a page summary word recovered by the fourth pass",
    },
    {
      query: "webview",
      expected: "/docs",
      first: true,
      what: "the Introduction's one-word negative",
    },
    {
      query: "z-index",
      expected: "/docs/component-api",
      first: true,
      what: "the layering convention's DOM word",
    },
    {
      query: "textbox",
      expected: "/docs/components/text-input",
      first: true,
      what: "reader vocabulary for a component's title",
    },
    {
      query: "one time password",
      expected: "/docs/components/otp-field",
      first: true,
      what: "reader vocabulary that expands an abbreviation",
    },
    {
      query: "typeahead",
      expected: "/docs/components/combobox",
      first: true,
      what: "reader vocabulary recovered by the second alias pass",
    },
    {
      query: "cmdk",
      expected: "/docs/components/command-menu",
      first: true,
      what: "reader vocabulary recovered by the third alias pass",
    },
    {
      query: "macos",
      expected: "/docs/theming",
      first: true,
      what: "a platform name authored in the Theming summary",
    },
    {
      query: "datagrid",
      expected: "/docs/data-display",
      first: true,
      what: "an alternate name authored in a page summary",
    },
    {
      query: "table",
      expected: "/docs/data-display",
      first: true,
      what: "a page's authored description when the page index returned prose",
    },
    {
      query: "aria",
      expected: "/docs/accessibility",
      first: true,
      what: "the summary that names the ARIA surface",
    },
    {
      query: "focus ring",
      expected: "/docs/tokens-api",
      first: true,
      what: "a promoted helper name the lexical index cannot retrieve",
    },
    {
      query: "elevation shadow",
      expected: "/docs/tokens-api",
      first: true,
      what: "a synthesized page candidate beside the same-URL table chunk",
    },
    {
      query: "semantic roles",
      expected: "/docs/theming#semantic-roles",
      first: true,
      what: "a generated token table that already answered",
    },
    {
      query: "spacing",
      expected: "/docs/theming",
      first: true,
      what: "a token group named by the page that owns it",
    },
    {
      query: "font family",
      expected: "/docs/typography",
      first: true,
      what: "a type family named by the typography page",
    },
    {
      query: "screenshot",
      expected: "/docs/previews",
      first: true,
      what: "a preview tier named by the preview guide",
    },
    {
      query: "wheel up",
      expected: "/docs/components/message-scroller",
      first: true,
      what: "a live scene's instruction from the generated scene index",
    },
    {
      query: "live scene",
      expected: "/docs/previews",
      first: true,
      what: "the scene index itself",
    },
    {
      query: "prerequisites",
      expected: "/docs/installation",
      first: true,
      what: "the installation page's prerequisites section",
    },
    {
      query: "platform support",
      expected: "/docs/installation",
      first: true,
      what: "the native binding target table",
    },
    {
      query: "line height",
      expected: "/docs/typography",
      first: true,
      what: "a typographic measure a suffix tier stole",
    },
    {
      query: "does it work on windows",
      expected: "/docs/installation",
      first: true,
      what: "a reader's platform question",
    },
    {
      query: "i18n",
      expected: "/docs/layouts",
      first: true,
      what: "the localization vocabulary",
    },
    {
      query: "botton",
      expected: "/docs/components/button",
      first: true,
      what: "a one-edit misspelling of a component name",
    },
    {
      query: "acordian",
      expected: "/docs/components/accordion",
      first: true,
      what: "a misspelling the lexical index never retrieves",
    },
    {
      query: "theem editr",
      expected: "/docs/theme-editor",
      first: true,
      what: "a misspelling of a whole two-word title",
    },
    {
      query: "buton group",
      expected: "/docs/components/button-group",
      first: true,
      what: "a phrase typo that a token match used to steal",
    },
    {
      query: "tag input",
      expected: "/docs/components/tag-input",
      first: true,
      what: "a component whose title is not the reader's phrase",
    },
    {
      query: "transparency",
      expected: "/docs/styling",
      first: true,
      what: "a style field named by the page that renders it",
    },
    {
      query: "theme",
      expected: "/docs/theming",
      first: true,
      what: "an inflected page title",
    },
    {
      query: "capability",
      expected: "/docs/capabilities",
      first: true,
      what: "a plural page title",
    },
    {
      query: "tree",
      expected: "/docs/data-display",
      first: true,
      what: "a Tier 3 subject named by its owning page",
    },
    {
      query: "diff",
      expected: "/docs/roadmap",
      first: true,
      what: "a roadmap target's one-word name",
    },
    {
      query: "toolbar",
      expected: "/docs/roadmap",
      first: true,
      what: "a promoted roadmap alias",
    },
    {
      query: "quickstart",
      expected: "/docs/getting-started",
      first: true,
      what: "the Getting started summary's quickstart word",
    },
    {
      query: "props table",
      expected: "/docs/api-reference",
      first: true,
      what: "the generated props tables named by the API reference summary",
    },
    {
      query: "appearance",
      expected: "/docs/dark-mode",
      first: true,
      what: "the OS appearance the Dark mode summary owns",
    },
    {
      query: "github",
      expected: "/docs/contributing",
      first: true,
      what: "the repository destination the Contributing summary names",
    },
    {
      query: "setup",
      expected: "/docs/installation",
      first: true,
      what: "the Installation summary's setup word",
    },
    {
      query: "helper text",
      expected: "/docs/components/inline-validation",
      first: true,
      what: "the helper-text alias of Inline validation",
    },
    {
      query: "compound",
      expected: "/docs/component-api",
      first: true,
      what: "the compound convention the Component API summary names",
    },
    {
      query: "sorting",
      expected: "/docs/data-display",
      first: true,
      what: "the sorting subject the Data display summary names",
    },
    {
      query: "npm",
      expected: "/docs/installation",
      first: true,
      what: "the package manager the Installation summary names",
    },
    {
      query: "worktree",
      expected: "/docs/contributing",
      first: true,
      what: "the worktrees the Contributing summary names",
    },
    {
      query: "svg",
      expected: "/docs/components/icon",
      first: true,
      what: "a reader's word for the icon set, which only the alias table names",
    },
    {
      query: "planned",
      expected: "/docs/roadmap",
      first: true,
      what: "the target status the Roadmap summary names",
    },
    {
      query: "resize",
      expected: "/docs/workspace",
      first: true,
      what: "an inflected summary word (`resizable`)",
    },
    {
      query: "favicon",
      expected: "/docs/contributing",
      first: true,
      what: "the docs site's own output, which only the Contributing page documents",
    },
    {
      query: "graph",
      expected: "/docs/data-display",
      first: true,
      what: "a subject word the Data display summary names (`graphs`)",
    },
    {
      query: "page actions",
      expected: "/docs/contributing#site-output",
      first: true,
      what: "the page-action vocabulary plan 596 shipped",
    },
    {
      query: "open source",
      expected: "/docs/license",
      first: true,
      what: "the open-source word the License summary names",
    },
    {
      query: "theme switch",
      expected: "/docs/dark-mode",
      first: true,
      what: "a page alias a component's title token and scene instruction outrank",
    },
    {
      query: "hint",
      expected: "/docs/components/inline-validation",
      first: true,
      what: "a component alias recovered beside `helper text`",
    },
    {
      query: "react",
      expected: "/docs/getting-started",
      first: true,
      what: "the integration word a token table's provider section outranks",
    },
    {
      query: "how to install",
      expected: "/docs/installation",
      first: true,
      what: "the installation twin of `how to use`",
    },
    {
      query: "easing",
      expected: "/docs/theming",
      first: true,
      what: "a timing word the motion section answers, which returned nothing before",
    },
    {
      query: "keyboard",
      expected: "/docs/component-api",
      first: true,
      what: "the keyboard contract a keycap's picture outranked",
    },
    {
      query: "effect",
      expected: "/docs/architecture",
      first: true,
      what: "the runtime section a keyboard table's `Effect` column outranked",
    },
    {
      query: "browser",
      expected: "/docs/architecture",
      first: true,
      what: "the render table the Project browser pattern outranked",
    },
    {
      query: "hydration",
      expected: "/docs/architecture",
      first: true,
      what: "the site's server-render and hydration model, which returned nothing",
    },
    {
      query: "benchmark",
      expected: "/docs/performance",
      first: true,
      what: "the performance vocabulary, which returned nothing before plan 605",
    },
    {
      query: "className",
      expected: "/docs/styling",
      first: true,
      what: "the styling vocabulary a React reader brings, which returned nothing before plan 606",
    },
    {
      query: "tailwind",
      expected: "/docs/styling",
      first: true,
      what: "the styling model page, which did not exist before plan 606",
    },
  ] as const;

  const searchProblems = await Promise.all(
    searchChecks.map(async (check) => {
      const where = `/api/search?query=${encodeURIComponent(check.query)}`;
      const response = await request(baseUrl + where);
      if (response === null || response.status !== 200) {
        return [
          {
            where,
            what:
              response === null
                ? "request failed"
                : `expected 200, got ${response.status}`,
          },
        ];
      }
      const urls = searchUrls(response.body);
      const matched =
        check.first === true
          ? urls[0]?.startsWith(check.expected) === true
          : urls.some((url) => url.startsWith(check.expected));
      return matched
        ? []
        : [
            {
              where,
              what:
                check.first === true
                  ? `the first result is not under ${check.expected} for ${check.what}`
                  : `no result under ${check.expected} for ${check.what}`,
            },
          ];
    }),
  );
  problems.push(...searchProblems.flat());

  for (const path of ["/api/search", "/api/search?query="]) {
    const empty = await request(baseUrl + path);
    if (empty === null || empty.status !== 200) {
      problems.push({
        where: path,
        what:
          empty === null
            ? "request failed"
            : `expected 200, got ${empty.status}`,
      });
      continue;
    }
    const payload: unknown = JSON.parse(empty.body);
    if (!Array.isArray(payload) || payload.length !== 0) {
      problems.push({ where: path, what: "a blank query must return []" });
    }
  }
  console.log("smoke: search checked");

  const missing = await request(`${baseUrl}/docs/this-page-does-not-exist`);
  if (missing === null || missing.status !== 404) {
    problems.push({
      where: "/docs/this-page-does-not-exist",
      what:
        missing === null
          ? "request failed"
          : `expected 404, got ${missing.status}`,
    });
  } else {
    const headings = [...missing.body.matchAll(/<h1\b/g)].length;
    if (headings !== 1) {
      problems.push({
        where: "/docs/this-page-does-not-exist",
        what: `expected one <h1>, found ${headings}`,
      });
    }
    const landmarks = [...missing.body.matchAll(/<main\b/g)].length;
    if (landmarks !== 1) {
      problems.push({
        where: "/docs/this-page-does-not-exist",
        what: `expected one <main>, found ${landmarks}`,
      });
    }
  }
  console.log("smoke: not-found checked");

  const robots = await request(`${baseUrl}/robots.txt`);
  if (robots === null || robots.status !== 200) {
    problems.push({
      where: "/robots.txt",
      what:
        robots === null
          ? "request failed"
          : `expected 200, got ${robots.status}`,
    });
  } else if (!/^Sitemap:\s*https?:\/\//m.test(robots.body)) {
    problems.push({ where: "/robots.txt", what: "no absolute Sitemap: line" });
  }
  console.log("smoke: robots checked");

  return problems;
};

const main = async (): Promise<number> => {
  let preview: PreviewServer | null = null;
  try {
    const options = parseOptions(process.argv.slice(2));
    let baseUrl = options.baseUrl;

    if (baseUrl === null) {
      const server = await startDocsPreview({
        build: options.build,
        port: options.port,
      });
      preview = server;
      baseUrl = server.baseUrl;
    }

    const problems = [...auditClientBundle(), ...(await audit(baseUrl))];
    if (problems.length === 0) return 0;
    for (const problem of problems) {
      console.error(`FAIL ${problem.where}: ${problem.what}`);
    }
    console.error(`smoke: ${problems.length} problem(s)`);
    return 1;
  } catch (error) {
    if (error instanceof SetupError) {
      console.error(`smoke: not verified — ${error.message}`);
      return 2;
    }
    throw error;
  } finally {
    if (preview !== null) await preview.stop();
  }
};

const code = await main();
if (code === 0) console.log("smoke: ok");
process.exitCode = code;
