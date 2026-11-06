import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

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
    slug === "" ? "/" : `/${slug}`,
  ),
  ...["primitives", "components", "icons"].flatMap((pkg) =>
    walk(
      join(appDir, `../../packages/${pkg}/docs`),
      (slug) => `/${pkg}/${slug}`,
    ),
  ),
];

const staticRoutes = readdirSync(join(appDir, "src/routes"))
  .filter((name) => /^[a-z-]+\.tsx$/.test(name) && name !== "index.tsx")
  .map((name) => `/${name.replace(/\.tsx$/, "")}`);

const agentRoutes = ["/llms.txt", "/llms-full.txt"];

const urls = new Set([
  "/",
  ...agentRoutes,
  ...staticRoutes,
  ...mounted.map(({ url }) => url),
]);

const landingFiles: ReadonlyArray<string> = readdirSync(
  join(appDir, "src/components/landing"),
)
  .filter((name) => name.endsWith(".tsx") || name.endsWith(".ts"))
  .map((name) => join(appDir, `src/components/landing/${name}`));

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

    expect(targets).toContain("/getting-started");
    expect(targets).toContain("/");
  });
});
