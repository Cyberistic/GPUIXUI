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
 *   nub scripts/smoke-build.ts [--base-url <url>] [--port <n>] [--no-build]
 *
 * Exit `0` pass, `1` the site is broken, `2` the check could not run (build or
 * preview failed) — the same "unverified is not a pass" rule as the native
 * smoke suite (plan 020).
 */

import {
  SetupError,
  startDocsPreview,
  type PreviewServer,
} from "./preview-server.ts";

const REQUEST_TIMEOUT_MS = 15_000;
const CONCURRENCY = 6;

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
    return { status: response.status, body: await response.text() };
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

const auditPage = async (
  baseUrl: string,
  path: string,
): Promise<ReadonlyArray<Problem>> => {
  const problems: Problem[] = [];
  const fail = (what: string): void => {
    problems.push({ where: path, what });
  };

  const page = await request(baseUrl + path);
  if (page === null) {
    fail("request failed");
    return problems;
  }
  if (page.status !== 200) {
    fail(`expected 200, got ${page.status}`);
    return problems;
  }

  if (title(page.body) === "") fail("no <title>");
  const headings = [...page.body.matchAll(/<h1\b/g)].length;
  if (headings !== 1) fail(`expected one <h1>, found ${headings}`);
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

  const pageProblems = await mapLimit(paths, CONCURRENCY, (path) =>
    auditPage(baseUrl, path),
  ).then((groups) => groups.flat());
  problems.push(...pageProblems);
  console.log(`smoke: pages ${paths.length} checked`);

  const html = await mapLimit(paths, CONCURRENCY, (path) =>
    request(baseUrl + path),
  );
  const targets = [
    ...new Set(
      html.flatMap((page) => (page === null ? [] : internalTargets(page.body))),
    ),
  ].sort();
  const linkProblems = await auditLinks(baseUrl, targets);
  problems.push(...linkProblems);
  console.log(`smoke: links ${targets.length} checked`);

  const searchChecks = [
    {
      query: "button",
      expected: "/docs/components/button",
      what: "a component name from the registry index",
    },
    {
      query: "aria-checked",
      expected: "/docs/components/checkbox",
      what: "a component page's documented prose",
    },
    {
      query: "DialogTitle",
      expected: "/docs/components/dialog",
      what: "an exported part name from the registry",
    },
  ] as const;

  const searchProblems = await Promise.all(
    searchChecks.map(async (check) => {
      const where = `/api/search?query=${check.query}`;
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
      return urls.some((url) => url.startsWith(check.expected))
        ? []
        : [
            {
              where,
              what: `no result under ${check.expected} for ${check.what}`,
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

    const problems = await audit(baseUrl);
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
