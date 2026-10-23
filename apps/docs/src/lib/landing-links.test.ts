import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The landing page is the site's front door, and its links are written in
 * components, not MDX: the page-level link guard walks `content/docs`, so a CTA
 * pointing at a page that was renamed or never mounted would 404 from the only
 * page a first-time reader sees, and the build would stay green.
 *
 * The mounted set is read from the collections the site serves.
 */

const appDir = fileURLToPath(new URL("../../", import.meta.url));

interface Mounted {
  readonly file: string;
  readonly url: string;
}

const walk = (
  dir: string,
  urlFor: (slug: string) => string,
  slug = "",
): ReadonlyArray<Mounted> =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = `${slug}${entry.name}`;
    if (entry.isDirectory()) {
      return walk(join(dir, entry.name), urlFor, `${path}/`);
    }
    if (!entry.name.endsWith(".mdx")) return [];
    const bare = path.replace(/\.mdx$/, "").replace(/(?:^|\/)index$/, "");
    return [{ file: path, url: urlFor(bare) }];
  });

const mounted: ReadonlyArray<Mounted> = [
  ...walk(join(appDir, "content/docs"), (slug) =>
    slug === "" ? "/docs" : `/docs/${slug}`,
  ),
  ...["primitives", "components", "icons"].flatMap((pkg) =>
    walk(
      join(appDir, `../../packages/${pkg}/docs`),
      (slug) => `/docs/${pkg}/${slug}`,
    ),
  ),
];

const urls = new Set(["/", ...mounted.map(({ url }) => url)]);

const landingFiles: ReadonlyArray<string> = readdirSync(
  join(appDir, "src/components/landing"),
)
  .filter((name) => name.endsWith(".tsx") || name.endsWith(".ts"))
  .map((name) => join(appDir, `src/components/landing/${name}`));

/** Every internal path the landing's components and data write. */
const links: ReadonlyArray<{ readonly file: string; readonly href: string }> =
  landingFiles.flatMap((file) =>
    [...readFileSync(file, "utf8").matchAll(/href[=:]\s*"(\/[^"#?]*)/g)].map(
      (match) => ({
        file: file.slice(appDir.length),
        href: match[1] ?? "",
      }),
    ),
  );

describe("the landing page's links", () => {
  it("point only at pages the site mounts", () => {
    // A silent zero would pass the dead-link filter without reading anything.
    expect(links.length).toBeGreaterThanOrEqual(8);
    expect(urls.size).toBeGreaterThanOrEqual(50);

    const dead = links
      .filter(
        ({ href }) => !urls.has(href === "/" ? "/" : href.replace(/\/$/, "")),
      )
      .map(({ file, href }) => `${file}: ${href}`);

    expect(dead).toEqual([]);
  });

  it("send a new reader to the quick-start and the component index", () => {
    const targets = links.map(({ href }) => href);

    expect(targets).toContain("/docs/getting-started");
    expect(targets).toContain("/docs");
  });
});
