import { describe, expect, it } from "vitest";
import {
  indexQueryParam,
  indexQuerySearch,
  indexQueryFromSearch,
  indexQueryValue,
} from "./component-index-query";

const params = (search: string): ReadonlyArray<readonly [string, string]> => [
  ...new URLSearchParams(search).entries(),
];

describe("the docs indexes' URL filter", () => {
  it("reads the filter a link carries", () => {
    expect(indexQueryFromSearch("?q=dialog")).toBe("dialog");
    expect(indexQueryFromSearch("?scene=parity&q=DialogFooter")).toBe(
      "DialogFooter",
    );
    expect(indexQueryFromSearch("?q=command+menu")).toBe("command menu");
    expect(indexQueryFromSearch("?q=onCheckedChange")).toBe("onCheckedChange");
  });

  it("opens unfiltered when the URL carries none", () => {
    expect(indexQueryFromSearch("")).toBe("");
    expect(indexQueryFromSearch("?scene=parity")).toBe("");
  });

  it("keeps every parameter the page already carries", () => {
    expect(params(indexQuerySearch("dialog", "?scene=parity"))).toEqual([
      ["scene", "parity"],
      [indexQueryParam, "dialog"],
    ]);
    expect(
      params(indexQuerySearch("dialog", "?scene=parity&only=bar")),
    ).toEqual([
      ["scene", "parity"],
      ["only", "bar"],
      [indexQueryParam, "dialog"],
    ]);
  });

  it("round-trips every query, punctuation included", () => {
    const queries = [
      "dialog",
      "command menu",
      "aria-orientation",
      "StateStyle",
    ];

    expect(
      queries.map((query) => indexQueryFromSearch(indexQuerySearch(query))),
    ).toEqual(queries);
  });

  it("writes the filter once, replacing the value it already carried", () => {
    expect(params(indexQuerySearch("switch", "?q=dialog"))).toEqual([
      [indexQueryParam, "switch"],
    ]);
  });

  it("removes the parameter for an empty filter instead of writing `?q=`", () => {
    expect(indexQuerySearch("", "?scene=parity&q=dialog")).toBe(
      "?scene=parity",
    );
    expect(indexQuerySearch("   ", "?q=dialog")).toBe("");
    expect(indexQuerySearch("", "")).toBe("");
  });

  it("does not carry surrounding space into the URL", () => {
    expect(indexQueryValue("  dialog  ")).toBe("dialog");
    expect(indexQuerySearch("  dialog  ")).toBe("?q=dialog");
  });
});
