import { describe, expect, it } from "vitest";
import { promotedNameRank } from "./generated-search";
import { layeringSearchEntry } from "./layering-search";
import { search } from "./search";

/**
 * The bug guarded (plan 589): the layering facts were shipped in source
 * comments (paint order, no portal, the topmost dismiss layer) and the
 * component API page did not state them, so `layering` returned nothing,
 * `z-index` the Values API and `zindex` a Toast limitation. These tests fail if
 * the entry stops promoting the four names, or if `overlay` starts being
 * promoted and steals the Tooltip page's prose result.
 */
describe("layering search entry", { timeout: 120_000 }, () => {
  it("promotes the DOM word, its spelling and the section's own names", () => {
    expect(promotedNameRank(layeringSearchEntry, "z-index")).toBe(0);
    expect(promotedNameRank(layeringSearchEntry, "zindex")).toBe(0);
    expect(promotedNameRank(layeringSearchEntry, "layering")).toBe(0);
    expect(promotedNameRank(layeringSearchEntry, "stacking")).toBe(0);
  });

  it("leaves overlay to the pages that use it", () => {
    expect(promotedNameRank(layeringSearchEntry, "overlay")).toBeUndefined();
  });

  it("points at the section the page renders", () => {
    expect(layeringSearchEntry.index.url).toBe("/docs/component-api#layering");
  });

  it("reaches the section from the four reader words", async () => {
    const expected = ["z-index", "zindex", "layering", "stacking"] as const;
    const misses = await Promise.all(
      expected.map(async (query) => {
        const [first] = await search(query, 5);
        return first?.type === "page" &&
          first.url === "/docs/component-api#layering"
          ? null
          : `${query} -> ${first?.type ?? "nothing"}:${first?.url ?? "nothing"}`;
      }),
    );
    expect(misses.filter((miss) => miss !== null)).toEqual([]);
  });
});
