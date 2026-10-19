import { describe, expect, it } from "vitest";
import { valueExports } from "./api-values.generated";
import { promotedNameRank, TOKEN_MATCH_RANK } from "./generated-search";
import { tokensApiSearchEntry } from "./tokens-api-search";

/**
 * Guards plan 569. The Tokens API function table is authored MDX, so exact
 * `focusRing` reached a table chunk, but the lexical index tokenises the
 * camelCase name as one word and `focus ring` returned Number field prose. The
 * entry promotes the package's real helper names; these tests fail if a
 * promoted name is not a real token export, if a helper is missing from the
 * promotion set, or if a plain word (`alpha`) starts being promoted.
 */
const helpers = valueExports.filter(
  (value) =>
    value.package.startsWith("@gpuixui/tokens") &&
    value.visibility === "public" &&
    (value.kind === "function" || value.kind === "hook"),
);

describe("tokens API search entry", () => {
  it("promotes only names the package really exports", () => {
    const real = new Set(helpers.map((value) => value.name));
    expect(real.size).toBeGreaterThan(0);
    expect(
      tokensApiSearchEntry.names.filter((name) => !real.has(name)),
    ).toEqual([]);
  });

  it("promotes the two helpers written as prose", () => {
    expect(tokensApiSearchEntry.names).toContain("focusRing");
    expect(tokensApiSearchEntry.names).toContain("elevationShadow");
    expect(promotedNameRank(tokensApiSearchEntry, "focus ring")).toBe(
      TOKEN_MATCH_RANK,
    );
    expect(promotedNameRank(tokensApiSearchEntry, "elevation shadow")).toBe(
      TOKEN_MATCH_RANK,
    );
  });

  it("does not promote a plain helper name", () => {
    expect(helpers.map((value) => value.name)).toContain("alpha");
    expect(tokensApiSearchEntry.names).not.toContain("alpha");
    expect(promotedNameRank(tokensApiSearchEntry, "alpha")).toBeUndefined();
  });

  it("points at the functions heading the page renders", () => {
    expect(tokensApiSearchEntry.index.url).toBe("/docs/tokens-api#functions");
  });
});
