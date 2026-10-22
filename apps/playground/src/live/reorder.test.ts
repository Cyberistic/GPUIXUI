/**
 * Holds the two rules a pointer drag reorder rests on.
 *
 * The bug these guard: a drop resolved from the **hit list alone** picks the
 * label a row paints instead of the row, and a `moveRow` that inserts at `to`
 * in the shortened array puts a downward move one slot too far. Both look
 * right in a readout and are wrong on screen, which is why they are asserted
 * here rather than inferred from the window probe.
 */
import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { moveRow, rowAt, type RowHandle } from "./reorder.js";

/** The ids two rows registered; `11` is a label neither row claimed. */
const handles: ReadonlyArray<RowHandle<string>> = [
  { id: 7, row: "alpha" },
  { id: 8, row: "bravo" },
];

describe("rowAt", () => {
  it("finds the row beneath a painted child that is not a row", () => {
    // `getElementsAt` is topmost first: a label's id 11 precedes its row's 7.
    expect(rowAt([11, 7, 8], handles)).toEqual(Option.some("alpha"));
  });

  it("takes the topmost row when two are reported", () => {
    expect(rowAt([8, 7], handles)).toEqual(Option.some("bravo"));
  });

  it("reports a missed drop when no id belongs to a row", () => {
    expect(rowAt([42, 43], handles)).toEqual(Option.none());
    expect(rowAt([], handles)).toEqual(Option.none());
  });
});

describe("moveRow", () => {
  it("moves a row down onto the row it was dropped on", () => {
    expect(moveRow(["a", "b", "c", "d"], 0, 3)).toEqual(["b", "c", "d", "a"]);
    expect(moveRow(["a", "b", "c", "d"], 1, 3)).toEqual(["a", "c", "d", "b"]);
  });

  it("moves a row up into the drop row's slot", () => {
    expect(moveRow(["a", "b", "c", "d"], 3, 0)).toEqual(["d", "a", "b", "c"]);
  });

  it("leaves an out-of-range move and an unchanged slot alone", () => {
    expect(moveRow(["a", "b"], 9, 0)).toEqual(["a", "b"]);
    expect(moveRow(["a", "b"], 0, 9)).toEqual(["a", "b"]);
    expect(moveRow(["a", "b"], 1, 1)).toEqual(["a", "b"]);
  });
});
