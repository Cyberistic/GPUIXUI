import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { packageCollections } from "./collection-routes";
import { uniqueSearchPages } from "./search-index";

interface Fixture {
  readonly url: string;
  readonly title: string;
}

const page = (url: string, title: string): Fixture => ({ url, title });
const urls = (pages: ReadonlyArray<Fixture>): ReadonlyArray<string> =>
  pages.map(({ url }) => url);

describe("the search index's page list", () => {
  it("keeps a curated page in place of the package page it shadows", () => {
    const curated = page("/components/dialog", "Dialog");
    const packaged = page("/components/dialog", "Dialog (package)");

    expect(uniqueSearchPages([curated], [[packaged]])).toEqual([curated]);
  });

  it("keeps every package page whose URL is still free", () => {
    const site = [page("/", "GPUIxUI")];
    const primitives = [page("/primitives/slider", "Slider")];
    const components = [
      page("/components/dialog", "Dialog"),
      page("/components/tabs", "Tabs"),
    ];

    expect(urls(uniqueSearchPages(site, [primitives, components]))).toEqual([
      "/",
      "/primitives/slider",
      "/components/dialog",
      "/components/tabs",
    ]);
  });

  it("cannot emit one URL twice, whichever collection repeats it", () => {
    const pages = uniqueSearchPages(
      [page("/getting-started", "Theming")],
      [
        [page("/getting-started", "Theming again")],
        [page("/getting-started", "Theming once more")],
      ],
    );

    expect(urls(pages)).toEqual(["/getting-started"]);
  });

  it("is the rule the route indexes with, not a copy nothing uses", () => {
    const route = readFileSync(
      new URL("../routes/api/search.ts", import.meta.url),
      "utf8",
    );

    expect(route).toContain("uniqueSearchPages(");
    expect(route).toContain("packageSources.map(");
  });

  it("indexes every collection the site mounts, from the collections themselves", () => {
    expect(packageCollections.length).toBeGreaterThanOrEqual(9);

    const module = readFileSync(
      new URL("./package-docs.ts", import.meta.url),
      "utf8",
    );

    expect(module).toContain(
      "export const packageSources = packageCollections.map(",
    );
    expect(module).not.toContain("export const packageSources = [");

    expect(module).toContain("satisfies Record<PackageOrigin");
  });
});
