/**
 * Guards the geometry the `virtual-list-expand` probe asserts against.
 *
 * The probe's point is that a painted row's growth re-measures and that the
 * following row leaves the painted window until a scroll. Both depend on the
 * fixture's arithmetic, not on the runtime: a `DETAIL` that left a whole row of
 * viewport free would make "the row below leaves the painted window" assert the
 * opposite of the truth (measured: `DETAIL = 56` fails that check in the probe),
 * and a `REVEAL` inside the first window would make the reveal test nothing.
 * The bug this catches: an edited fixture that keeps the probe green while it
 * stops measuring the paint-window recomputation.
 */
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
