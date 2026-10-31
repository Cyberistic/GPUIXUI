/**
 * The effects' old addresses (plan 726). Bug guarded: sixteen pages left
 * `/components` for `/effects`, and a link a reader saved — or a search result —
 * would land on a 404 instead of the page that moved, query and all.
 */
import { describe, expect, it } from "vitest";
import { curatedRedirect, movedEffects } from "./curated-twins";

describe("the moved effects", () => {
  it("send an old component address to the effect page, keeping the query", () => {
    expect(curatedRedirect("/components/fireworks", "?platform=darwin")).toBe(
      "/effects/fireworks?platform=darwin",
    );
    expect(movedEffects).toHaveLength(16);
  });

  it("leave a component that stayed where it is", () => {
    expect(curatedRedirect("/components/button", "")).toBeUndefined();
  });
});
