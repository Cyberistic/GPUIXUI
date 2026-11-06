import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { curatedPrimitiveTwins, curatedTwinOf } from "./curated-twins";
import { packageCollections } from "./collection-routes";
import {
  isPageRow,
  parseSearchReadout,
  searchCases,
  searchInput,
  searchTrigger,
} from "../../scripts/search-probe";

const root = new URL("../../../../", import.meta.url);

interface Page {
  readonly file: string;
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

const pages: ReadonlyArray<Page> = [
  ...walk(
    new URL("apps/docs/content/docs/", root),
    "apps/docs/content/docs/",
    (slug) => (slug === "" || slug === "index" ? "/" : `/${slug}`),
  ),
  ...packageCollections.flatMap((collection) =>
    walk(
      new URL(`${collection.dir}/`, root),
      `${collection.dir}/`,
      (slug) => `${collection.route}/${slug}`,
    ),
  ),
];

const served = new Map(
  pages
    .filter((page) => curatedTwinOf(page.url) === undefined)
    .map((page) => [page.url, page] as const),
);

const policy = readFileSync(new URL("docs/preview-strategy.md", root), "utf8");

describe("the search dialog", () => {
  it("reads the options, the highlighted result and the address, refusing a short line", () => {
    expect(
      parseSearchReadout(
        "/architecture /primitives/slider|/architecture|/components/button",
      ),
    ).toEqual({
      options: ["/architecture", "/primitives/slider"],
      active: "/architecture",
      path: "/components/button",
    });
    expect(parseSearchReadout("|/architecture|/")?.options).toEqual([]);

    expect(parseSearchReadout("/architecture|")).toBeUndefined();
    expect(parseSearchReadout("/a|/a|/a|extra")).toBeUndefined();
    expect(parseSearchReadout("")).toBeUndefined();
  });

  it("tells a page row from one of its sections", () => {
    expect(isPageRow("/components/button", "/components/button")).toBe(true);

    expect(isPageRow("/components/button-14", "/components/button")).toBe(
      false,
    );
  });

  it("names only pages the site serves, and refuses only the pages it retires", () => {
    for (const searchCase of searchCases) {
      expect(
        served.has(searchCase.expected),
        `${searchCase.query}: ${searchCase.expected} is not a served page`,
      ).toBe(true);
      expect(
        curatedTwinOf(searchCase.expected),
        `${searchCase.expected} is a retired twin, not the page to land on`,
      ).toBeUndefined();

      for (const absent of searchCase.absent) {
        expect(
          served.has(absent),
          `${searchCase.query}: ${absent} is served, so it cannot be refused`,
        ).toBe(false);
        expect(
          curatedTwinOf(absent),
          `${searchCase.query}: ${absent} is not a retired twin`,
        ).toBe(searchCase.expected);
      }
    }
  });

  it("covers a package page, a site page and a curated twin", () => {
    const expected = new Set(
      searchCases.map((searchCase) => searchCase.expected),
    );
    const packages = packageCollections.map((collection) => collection.route);

    expect(
      [...expected].some((url) =>
        packages.some((route) => url.startsWith(`${route}/`)),
      ),
      "no query finds a page only a package writes",
    ).toBe(true);
    expect(
      [...expected].some(
        (url) => !packages.some((route) => url.startsWith(`${route}/`)),
      ),
      "no query finds a page only the site writes",
    ).toBe(true);

    const retired = curatedPrimitiveTwins.filter((twin) =>
      searchCases.some(
        (searchCase) =>
          searchCase.expected === twin.curated &&
          searchCase.absent.includes(twin.retired),
      ),
    );
    expect(
      retired.length,
      "no query proves a curated page wins its retired package twin",
    ).toBeGreaterThan(0);
  });

  it("types through React's input, then submits the highlighted result", () => {
    const probe = readFileSync(
      new URL("apps/docs/scripts/search-probe.ts", root),
      "utf8",
    );

    expect(probe).toContain("HTMLInputElement.prototype");
    expect(probe).toContain('new InputEvent("input"');

    expect(probe).toContain("firstReady(");

    expect(probe.indexOf("const submit")).toBeGreaterThan(
      probe.indexOf("const readResults"),
    );
    expect(probe).toContain('key: "Enter"');
    expect(probe).toContain("data-state");
    expect(searchTrigger).toContain("data-search");
    expect(searchInput).toContain("combobox");
  });

  it("records the measurement in the policy and the site's ledger", () => {
    expect(policy).toContain("### The search path is measured");
    expect(policy).toContain("nub apps/docs/scripts/search-probe.ts");
    expect(policy).toContain("slider → /primitives/slider");
    expect(policy).toContain("two minutes → /getting-started");
    expect(policy).toContain("button → /components/button");
    expect(policy).toContain("not `/primitives/button`");
    expect(policy).toContain("HTMLInputElement.prototype");

    const readme = readFileSync(new URL("apps/docs/README.md", root), "utf8");
    expect(readme).toContain("scripts/search-probe.ts");
  });
});
