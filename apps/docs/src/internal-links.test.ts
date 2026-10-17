import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Guards every literal `/docs` link the site writes (plan 438). The menu, the
 * index and related-component links are derived; prose and the hand-written app
 * components are not, so a renamed page leaves a link that 404s while every
 * other test stays green.
 *
 * Bug guarded (plan 438): `layouts.mdx` linked `/docs/components/grid`, a route
 * with no page — `Grid` shares the Stack page — and no test noticed because
 * `content.test.ts` checks the sidebar and `content-references.test.ts` checks
 * `<include>` targets, not prose URLs.
 *
 * `node:fs`/`node:path` are deliberate here: this is a vitest boundary reading
 * real files, like `content.test.ts` and `prose-truth.test.ts`, and there is no
 * Effect runtime in `apps/docs` (plan 411 §5).
 */

const appRoot = fileURLToPath(new URL("..", import.meta.url));
const contentRoot = join(appRoot, "content", "docs");
const srcRoot = join(appRoot, "src");

const walk = (dir: string): ReadonlyArray<string> =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });

interface Link {
  /** The file that writes the link, app-relative. */
  readonly source: string;
  readonly destination: string;
}

/** Markdown prose links: `[Grid](/docs/components/stack)`. */
const markdownLink = /\]\((\/docs[^)\s]*)\)/g;

/** Literal JSX links in the app's own components: `href="/docs/installation"`. */
const jsxLink = /\bhref="(\/docs[^"]*)"/g;

const destinations = (body: string, pattern: RegExp): ReadonlyArray<string> =>
  [...body.matchAll(pattern)].flatMap((match) => match[1] ?? []);

const contentLinks: ReadonlyArray<Link> = walk(contentRoot)
  .filter((path) => path.endsWith(".mdx"))
  .flatMap((path) =>
    destinations(readFileSync(path, "utf8"), markdownLink).map(
      (destination) => ({
        source: relative(appRoot, path),
        destination,
      }),
    ),
  );

const sourceLinks: ReadonlyArray<Link> = walk(srcRoot)
  .filter(
    (path) =>
      (path.endsWith(".ts") || path.endsWith(".tsx")) &&
      !path.endsWith(".test.ts") &&
      !path.endsWith(".test.tsx"),
  )
  .flatMap((path) =>
    destinations(readFileSync(path, "utf8"), jsxLink).map((destination) => ({
      source: relative(appRoot, path),
      destination,
    })),
  );

/** A computed destination (`${slug}`) is resolved by the component's own test. */
const links = [...contentLinks, ...sourceLinks].filter(
  (link) => !link.destination.includes("${"),
);

/** Does Fumadocs resolve this URL to a page file? `/docs` is the index page. */
const resolves = (destination: string): boolean => {
  const [path = ""] = destination.split(/[?#]/);
  const clean = path.replace(/\/+$/, "");
  if (clean === "/docs") return existsSync(join(contentRoot, "index.mdx"));
  if (!clean.startsWith("/docs/")) return false;
  const slug = clean.slice("/docs/".length);
  return (
    existsSync(join(contentRoot, `${slug}.mdx`)) ||
    existsSync(join(contentRoot, slug, "index.mdx"))
  );
};

describe("internal link integrity", () => {
  it("scans the content tree and the app, so an empty walk cannot pass", () => {
    expect(contentLinks.length).toBeGreaterThan(30);
    expect(sourceLinks.length).toBeGreaterThan(0);
  });

  it("resolves every /docs link to a page", () => {
    const broken = links
      .filter((link) => !resolves(link.destination))
      .map((link) => `${link.source}: ${link.destination}`);
    expect(broken).toEqual([]);
  });
});
