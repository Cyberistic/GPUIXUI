import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { moveRow, rowAt, type RowHandle } from "./reorder.js";

const handles: ReadonlyArray<RowHandle<string>> = [
  { id: 7, row: "alpha" },
  { id: 8, row: "bravo" },
];

describe("rowAt", () => {
  it("finds the row beneath a painted child that is not a row", () => {
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
