import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import {
  DETAIL,
  REVEAL,
  ROWS,
  ROW,
  TARGET,
  VIEWPORT,
  heightAt,
  spaceBelowGrowth,
} from "./expand-fixture.js";

describe("the virtual-list-expand fixture", () => {
  it("leaves less than one row of viewport below the grown row", () => {
    expect(DETAIL).toBeGreaterThan(0);
    expect(spaceBelowGrowth()).toBeGreaterThan(0);
    expect(spaceBelowGrowth()).toBeLessThan(ROW);
  });

  it("grows only the target row, and only while the detail is open", () => {
    const indices = Arr.range(0, ROWS - 1).slice(0, 8);
    expect(Arr.map(indices, (index) => heightAt(index, false))).toEqual(
      Arr.map(indices, () => ROW),
    );
    expect(heightAt(TARGET, true)).toBe(ROW + DETAIL);
    expect(
      Arr.filter(
        indices.filter((index) => index !== TARGET),
        (index) => heightAt(index, true) !== ROW,
      ),
    ).toEqual([]);
  });

  it("reveals a row far outside the first painted window", () => {
    const firstWindow = Math.floor(VIEWPORT / ROW);
    expect(REVEAL).toBeGreaterThan(firstWindow + TARGET);
    expect(REVEAL).toBeLessThan(ROWS);
  });
});
