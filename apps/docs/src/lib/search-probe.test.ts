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

/**
 * The search dialog is the site's component search, and it was the one
 * interaction no browser probe pressed: the index, the shadowing rule and the
 * response shape each had unit guards, while a reader's path — open the dialog,
 * type, press Enter — had none.
 *
 * `apps/docs/scripts/search-probe.ts` measures that path, and this suite keeps
 * the probe honest in the two ways a probe can rot. Its **premise** is a page
 * per part of the index: a page only a package writes, a page only the site
 * writes, and a component with two addresses, where the curated page must
 * answer and the retired package page must not. Its **mechanism** is a
 * controlled React input: React keeps its own value tracker, so a probe that
 * assigns `input.value` and dispatches an event types nothing and passes on the
 * opening suggestions.
 */

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

/** Every page a collection mounts, site pages first. */
const pages: ReadonlyArray<Page> = [
  ...walk(
    new URL("apps/docs/content/docs/", root),
    "apps/docs/content/docs/",
    (slug) => (slug === "" || slug === "index" ? "/docs" : `/docs/${slug}`),
  ),
  ...packageCollections.flatMap((collection) =>
    walk(
      new URL(`${collection.dir}/`, root),
      `${collection.dir}/`,
      (slug) => `${collection.route}/${slug}`,
    ),
  ),
];

/** The pages a reader can land on; a retired twin is a redirect. */
const served = new Map(
  pages
    .filter((page) => curatedTwinOf(page.url) === undefined)
    .map((page) => [page.url, page] as const),
);

/** Fenced code is sample text; the query must be words the page itself writes. */
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

const policy = readFileSync(new URL("docs/preview-strategy.md", root), "utf8");

describe("the search dialog", () => {
  it("reads the options, the highlighted result and the address, refusing a short line", () => {
    expect(
      parseSearchReadout(
        "/docs/architecture /docs/primitives/slider|/docs/architecture|/docs/components/button",
      ),
    ).toEqual({
      options: ["/docs/architecture", "/docs/primitives/slider"],
      active: "/docs/architecture",
      path: "/docs/components/button",
    });
    expect(parseSearchReadout("|/docs/architecture|/docs")?.options).toEqual(
      [],
    );
    // A truncated line has no address; reading the blanks would compare two
    // empty strings and pass.
    expect(parseSearchReadout("/docs/architecture|")).toBeUndefined();
    expect(parseSearchReadout("/docs/a|/docs/a|/docs/a|extra")).toBeUndefined();
    expect(parseSearchReadout("")).toBeUndefined();
  });

  it("tells a page row from one of its sections", () => {
    expect(
      isPageRow("/docs/components/button", "/docs/components/button"),
    ).toBe(true);
    // A section id is the page's id plus a chunk number, so an exact compare is
    // the only thing that knows Enter will open the page rather than a heading.
    expect(
      isPageRow("/docs/components/button-14", "/docs/components/button"),
    ).toBe(false);
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

    // The shadowing rule has a live case: every retired twin is a real list, so
    // requiring one is enough to know the probe exercises the join, not a page
    // that merely happens to be absent.
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

  it("asks each query of the page that writes the word", () => {
    for (const searchCase of searchCases) {
      const page = served.get(searchCase.expected);
      expect(page, `${searchCase.expected} has no file`).toBeDefined();
      if (page === undefined) continue;
      expect(
        prose(page.source)
          .toLowerCase()
          .includes(searchCase.query.toLowerCase()),
        `${page.file} never says ${JSON.stringify(searchCase.query)}`,
      ).toBe(true);
    }
  });

  it("types through React's input, then submits the highlighted result", () => {
    const probe = readFileSync(
      new URL("apps/docs/scripts/search-probe.ts", root),
      "utf8",
    );

    // React keeps its own value tracker: assigning `input.value` directly
    // leaves it believing nothing changed, so the value is written through the
    // prototype's setter and an `input` event carries it.
    expect(probe).toContain("HTMLInputElement.prototype");
    expect(probe).toContain('new InputEvent("input"');
    // The trigger's handler is the hydration precondition, read through the
    // shared helper over every copy of the trigger the chrome renders.
    expect(probe).toContain("firstReady(");
    // Enter runs after the list is read, or the probe submits a suggestion.
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
    expect(policy).toContain("slider → /docs/primitives/slider");
    expect(policy).toContain("architecture → /docs/architecture");
    expect(policy).toContain("button → /docs/components/button");
    expect(policy).toContain("not `/docs/primitives/button`");
    expect(policy).toContain("HTMLInputElement.prototype");

    const readme = readFileSync(new URL("apps/docs/README.md", root), "utf8");
    expect(readme).toContain("scripts/search-probe.ts");
  });
});
