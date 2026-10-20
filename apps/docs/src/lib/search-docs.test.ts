import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  indexedSurfaces,
  SCENE_INSTRUCTION_RANK,
  searchLimits,
  searchRanks,
} from "./search-docs";
import {
  generatedSearchEntries,
  parseSearchLimit,
  DEFAULT_SEARCH_LIMIT,
  MAX_SEARCH_LIMIT,
} from "./search";
import { SCENE_MATCH_RANK } from "./scene-search";
import {
  DESCRIPTION_MATCH_RANK,
  PHRASE_TYPO_MATCH_RANK,
  TYPO_MATCH_RANK,
} from "./search-ranks";
import { TOKEN_MATCH_RANK } from "./generated-search";

/**
 * Guards plan 610's data: the Site search page renders rank constants and a
 * document list from `search-docs.ts`, and this suite compares both with the
 * modules that own them. It fails when a constant is remembered instead of
 * imported, when the scene rank drifts, when a generated document is added
 * without a page row, and when a path the page tells a reader to open is gone.
 */

const docsRoot = new URL("../../", import.meta.url);

describe("search ranks", () => {
  it("documents every exported rank constant at its real value", () => {
    const rendered = searchRanks.map((rank) => ({
      constant: rank.constant,
      value: rank.value,
    }));

    expect(rendered).toEqual([
      {
        constant: "PHRASE_TYPO_MATCH_RANK",
        value: String(PHRASE_TYPO_MATCH_RANK),
      },
      {
        constant: "SCENE_INSTRUCTION_RANK",
        value: String(SCENE_MATCH_RANK),
      },
      { constant: "TOKEN_MATCH_RANK", value: String(TOKEN_MATCH_RANK) },
      {
        constant: "DESCRIPTION_MATCH_RANK",
        value: String(DESCRIPTION_MATCH_RANK),
      },
      { constant: "TYPO_MATCH_RANK", value: String(TYPO_MATCH_RANK) },
    ]);
  });

  it("orders the rows from strongest to weakest, never the reverse", () => {
    const values = searchRanks.map((rank) => Number(rank.value));

    expect(values).toEqual([...values].sort((left, right) => left - right));
    expect(values[0]).toBeLessThan(
      values[values.length - 1] ?? Number.POSITIVE_INFINITY,
    );
  });

  it("keeps the scene literal equal to the real scene rank", () => {
    expect(SCENE_INSTRUCTION_RANK).toBe(SCENE_MATCH_RANK);
  });
});

describe("search limits", () => {
  it("renders the route's default and maximum", () => {
    expect(searchLimits).toEqual({
      default: DEFAULT_SEARCH_LIMIT,
      max: MAX_SEARCH_LIMIT,
    });
    expect(searchLimits.default).toBeLessThan(searchLimits.max);
  });

  it("states the clamping the route really performs", () => {
    expect(parseSearchLimit(null)).toBe(DEFAULT_SEARCH_LIMIT);
    expect(parseSearchLimit("not-a-number")).toBe(DEFAULT_SEARCH_LIMIT);
    expect(parseSearchLimit("0")).toBe(1);
    expect(parseSearchLimit("999")).toBe(MAX_SEARCH_LIMIT);
    expect(parseSearchLimit("3")).toBe(3);
  });
});

describe("indexed surfaces", () => {
  it("lists exactly the generated documents the registry index carries", () => {
    const documented = indexedSurfaces
      .map((surface) => `${surface.title} :: ${surface.url}`)
      .sort();
    const real = generatedSearchEntries
      .map((entry) => `${entry.index.title} :: ${entry.index.url}`)
      .sort();

    expect(documented).toEqual(real);
  });

  it("has one row per URL and a description for each", () => {
    const urls = indexedSurfaces.map((surface) => surface.url);

    expect(new Set(urls).size).toBe(urls.length);
    expect(
      indexedSurfaces.filter((surface) => surface.what.trim().length === 0),
    ).toEqual([]);
  });
});

describe("search-docs paths", () => {
  const paths = [
    "src/lib/search.ts",
    "src/lib/search-ranks.ts",
    "src/lib/generated-search.ts",
    "src/lib/page-aliases.ts",
    "src/lib/component-aliases.ts",
    "src/lib/typo.ts",
    "src/routes/api/search.ts",
    "src/search/search-focus.tsx",
    "scripts/smoke-build.ts",
  ];

  it("names files that exist", () => {
    const missing = paths.filter(
      (path) => !existsSync(new URL(path, docsRoot)),
    );

    expect(missing).toEqual([]);
  });

  it("imports the ranks instead of typing them", () => {
    const source = readFileSync(
      new URL("./search-docs.ts", import.meta.url),
      "utf8",
    );

    expect(source).toContain('from "./search-ranks"');
    expect(source).toContain('from "./generated-search"');
  });
});
