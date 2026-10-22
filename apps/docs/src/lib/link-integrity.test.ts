import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { packageCollections } from "./collection-routes";

/**
 * Every link a mounted page writes resolves to a mounted page (and heading).
 *
 * Nothing else notices a dead link. The sidebar guard holds `meta.json` to the
 * files, but a page's prose can point anywhere: when `IconButton` landed its
 * page, the Primitives index silently stopped linking it, and two component
 * pages linked `/docs/keyboard-shortcuts` when the page lives at
 * `/docs/components/keyboard-shortcuts`. A renamed heading breaks an anchor the
 * same way, and neither failure shows up in a build.
 *
 * The known defects are listed rather than hidden: a link this guard cannot
 * resolve is either fixed or argued here with its owner, and an entry that stops
 * matching a real dead link fails so the list cannot outlive the defect.
 */

const root = new URL("../../../../", import.meta.url);

interface Page {
  /** The file, for a failure message a reader can open. */
  readonly file: string;
  /** The mounted URL, with `index` collapsed and no trailing slash. */
  readonly url: string;
  readonly source: string;
}

const walk = (
  dir: URL,
  filePrefix: string,
  urlFor: (slug: string) => string,
  slug = "",
): ReadonlyArray<Page> =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = `${slug}${entry.name}`;
    if (entry.isDirectory())
      return walk(
        new URL(`${entry.name}/`, dir),
        filePrefix,
        urlFor,
        `${path}/`,
      );
    if (!entry.name.endsWith(".mdx")) return [];

    const bare = path.replace(/\.mdx$/, "").replace(/\/index$/, "");
    return [
      {
        file: `${filePrefix}${path}`,
        url: urlFor(bare),
        source: readFileSync(new URL(entry.name, dir), "utf8"),
      },
    ];
  });

/** The pages this site writes. */
const sitePages = walk(
  new URL("apps/docs/content/docs/", root),
  "apps/docs/content/docs/",
  (slug) => (slug === "" ? "/docs" : `/docs/${slug}`),
);

/** The pages a package ships, mounted as collections. */
const packagePages = packageCollections.flatMap((collection) => {
  const dir = new URL(`${collection.dir}/`, root);
  // A collection is mounted before its package writes its pages.
  if (!existsSync(dir)) return [];
  return walk(
    dir,
    `${collection.dir}/`,
    (slug) => `${collection.route}/${slug}`,
  );
});

const pages: ReadonlyArray<Page> = [...sitePages, ...packagePages];

/** Routes outside the docs tree that a page may link to. */
const extraRoutes: ReadonlyArray<string> = ["/"];

const mounted = new Set<string>([
  ...pages.map((page) => page.url),
  ...extraRoutes,
]);

/** Drop fenced code: a snippet's `](/docs/…)` is sample text, not a link. */
const prose = (source: string): string => {
  const kept: string[] = [];
  let fenced = false;

  for (const line of source.split("\n")) {
    if (line.trimStart().startsWith("```")) {
      fenced = !fenced;
      continue;
    }
    if (!fenced) kept.push(line);
  }

  return kept.join("\n");
};

/**
 * The GitHub anchor a heading gets, as Fumadocs renders it: lowercased, every
 * character outside letters, digits, spaces, hyphens and underscores dropped,
 * spaces to hyphens, and a repeat suffixed `-1`, `-2`, …
 *
 * Verified against the dev server's rendered ids — `### Tray / menu bar` is
 * `tray--menu-bar` (the slash leaves both spaces) and `## \`isTerminal()\`` is
 * `isterminal`.
 */
const slug = (heading: string): string =>
  heading
    .replace(/`/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 _-]/g, "")
    .replace(/ /g, "-");

const anchorsOf = (source: string): ReadonlySet<string> => {
  const seen = new Map<string, number>();
  for (const match of prose(source).matchAll(/^#{2,6} +(.+)$/gm)) {
    const base = slug(match[1] ?? "");
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    if (count > 0) seen.set(`${base}-${count}`, 0);
  }
  return new Set(seen.keys());
};

// A curated page shadows the package page at its URL, so the first page read
// (the site's) owns the anchors a `#hash` link resolves against.
const anchors = new Map<string, ReadonlySet<string>>();
for (const page of pages) {
  if (!anchors.has(page.url)) anchors.set(page.url, anchorsOf(page.source));
}

interface Link {
  readonly from: string;
  /** The page's own URL, so a relative link resolves against it. */
  readonly url: string;
  readonly target: string;
}

/** Every in-site link a page writes, in markdown or in a JSX `href`. */
const linksOf = (page: Page): ReadonlyArray<Link> => {
  const body = prose(page.source);
  const found = [
    ...[...body.matchAll(/\]\(([^()\s]+)\)/g)].map((match) => match[1]),
    ...[...body.matchAll(/\shref="([^"]+)"/g)].map((match) => match[1]),
  ];

  return found.flatMap((target) =>
    target === undefined ||
    target.startsWith("http") ||
    target.startsWith("mailto:") ||
    target.startsWith("data:") ||
    /\.(?:png|jpe?g|svg|gif|webp|ico|mdx?|json|ts|tsx|css)$/i.test(target)
      ? []
      : [{ from: page.file, url: page.url, target }],
  );
};

/**
 * Links that are dead today, with the owner that fixes them. `TODO.md` →
 * Interlocks carries the task; the guard fails when an entry here no longer
 * matches a dead link, so a fix must delete its row.
 *
 * Empty: the three cross-links between the keyboard-shortcut and hotkey-recorder
 * pages omitted the `/docs/components` prefix; the components workstream
 * corrected them.
 */
const knownDeadLinks: ReadonlyArray<{
  readonly from: string;
  readonly target: string;
  readonly reason: string;
}> = [];

/** Resolve a link, or say why it cannot resolve. */
const deadReason = (link: Link): string | undefined => {
  const [path = "", hash] = link.target.split("#");
  const [route = ""] = path.split("?");
  const url =
    route === ""
      ? link.url
      : new URL(route, `https://docs.local${link.url}`).pathname.replace(
          /\/$/,
          "",
        );
  const known = anchors.get(url);

  if (route === "" && hash !== undefined && hash !== "") {
    return known?.has(hash) === true
      ? undefined
      : `no heading #${hash} on ${url}`;
  }
  if (!mounted.has(url)) return `no mounted page at ${url}`;
  if (hash === undefined || hash === "" || known === undefined)
    return undefined;
  return known.has(hash) ? undefined : `no heading #${hash} on ${url}`;
};

const dead = pages.flatMap((page) =>
  linksOf(page)
    .map((link) => ({ link, reason: deadReason(link) }))
    .flatMap(({ link, reason }) =>
      reason === undefined ? [] : [{ ...link, reason }],
    ),
);

describe("the site's links", () => {
  it("slug a heading the way the rendered page does", () => {
    expect(slug("The look picker")).toBe("the-look-picker");
    expect(slug("Tray / menu bar")).toBe("tray--menu-bar");
    expect(slug("`isTerminal()`")).toBe("isterminal");
    expect(slug("Native view / webview")).toBe("native-view--webview");
  });

  it("report a repeated heading under a suffixed anchor", () => {
    const seen = anchorsOf("## Example\n\ntext\n\n## Example\n\ntext\n");

    expect([...seen]).toEqual(["example", "example-1"]);
  });

  it("mount every link a page writes", () => {
    const unexplained = dead.filter(
      (link) =>
        !knownDeadLinks.some(
          (known) => known.from === link.from && known.target === link.target,
        ),
    );

    expect(
      unexplained.map(
        (link) => `${link.from}: ${link.target} — ${link.reason}`,
      ),
    ).toEqual([]);
  });

  it("keeps the known defects a live, argued list", () => {
    const stale = knownDeadLinks.filter(
      (known) =>
        !dead.some(
          (link) => link.from === known.from && link.target === known.target,
        ),
    );

    expect(
      stale.map(
        (known) => `${known.from}: ${known.target} is not dead — drop the row`,
      ),
    ).toEqual([]);
  });
});
