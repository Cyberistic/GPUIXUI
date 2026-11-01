/**
 * The Hunter License block's rules (plan 731). Bugs guarded: a specialty that
 * lists another specialty's hunters, a "Star hunters" scope that keeps the
 * unstarred, a directory that does not lead with its most-starred hunters, and
 * a rank title that names stars a hunter does not hold.
 */
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import { hunters } from "./data.js";
import { huntersIn, rankTitle } from "./logic.js";

describe("the registry", () => {
  it("lists one specialty, most stars first", () => {
    expect(Arr.map(huntersIn(hunters, "Treasure"), (h) => h.id)).toEqual([
      "bisky",
      "ging",
      "gon",
    ]);
  });

  it("keeps only starred hunters in the stars scope", () => {
    expect(Arr.every(huntersIn(hunters, "stars"), (h) => h.stars > 0)).toBe(
      true,
    );
    expect(huntersIn(hunters, "stars")).toHaveLength(4);
  });

  it("titles a rank by its stars", () => {
    const ging = hunters.find((h) => h.id === "ging");
    const gon = hunters.find((h) => h.id === "gon");
    expect(ging === undefined ? "" : rankTitle(ging)).toBe(
      "Double-star Treasure Hunter",
    );
    expect(gon === undefined ? "" : rankTitle(gon)).toBe("Treasure Hunter");
  });
});
