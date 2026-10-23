import { describe, expect, it } from "vitest";
import {
  componentIndexParam,
  componentIndexSearch,
  indexQueryFromSearch,
  indexQueryValue,
} from "./component-index-query";

/**
 * The component index filter travels on the page URL.
 *
 * Bug guarded: the index kept its query in React state alone, so a filtered
 * view could not be linked and a reload painted the whole list again — while
 * the page promised the reader a filter over a hundred-odd rows. The platform
 * switch already carries its state in the address bar; this is the same rule.
 *
 * The reader is pure, so the cases below hold both directions of the round
 * trip, the parameters it must not touch, and the clean-URL rule.
 */

const params = (search: string): ReadonlyArray<readonly [string, string]> => [
  ...new URLSearchParams(search).entries(),
];

describe("the component index's URL filter", () => {
  it("reads the filter a link carries", () => {
    expect(indexQueryFromSearch("?q=dialog")).toBe("dialog");
    expect(indexQueryFromSearch("?platform=win32&q=DialogFooter")).toBe(
      "DialogFooter",
    );
    expect(indexQueryFromSearch("?q=command+menu")).toBe("command menu");
    expect(indexQueryFromSearch("?q=onCheckedChange")).toBe("onCheckedChange");
  });

  it("opens unfiltered when the URL carries none", () => {
    expect(indexQueryFromSearch("")).toBe("");
    expect(indexQueryFromSearch("?platform=win32")).toBe("");
  });

  it("keeps the parameters the platform switch owns", () => {
    expect(params(componentIndexSearch("dialog", "?platform=win32"))).toEqual([
      ["platform", "win32"],
      [componentIndexParam, "dialog"],
    ]);
    expect(
      params(componentIndexSearch("dialog", "?platform=win32&look=luna")),
    ).toEqual([
      ["platform", "win32"],
      ["look", "luna"],
      [componentIndexParam, "dialog"],
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
      queries.map((query) => indexQueryFromSearch(componentIndexSearch(query))),
    ).toEqual(queries);
  });

  it("writes the filter once, replacing the value it already carried", () => {
    expect(params(componentIndexSearch("switch", "?q=dialog"))).toEqual([
      [componentIndexParam, "switch"],
    ]);
  });

  it("removes the parameter for an empty filter instead of writing `?q=`", () => {
    expect(componentIndexSearch("", "?platform=win32&q=dialog")).toBe(
      "?platform=win32",
    );
    expect(componentIndexSearch("   ", "?q=dialog")).toBe("");
    expect(componentIndexSearch("", "")).toBe("");
  });

  it("does not carry surrounding space into the URL", () => {
    expect(indexQueryValue("  dialog  ")).toBe("dialog");
    expect(componentIndexSearch("  dialog  ")).toBe("?q=dialog");
  });
});
