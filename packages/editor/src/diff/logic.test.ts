/**
 * The line-diff half of the diff viewer.
 *
 * The bugs these guard: a diff that reports a non-minimal edit (every changed
 * line outside the common subsequence must be reported exactly once, never
 * delete-all-then-add-all); a diff that eats a line (reconstructing either side
 * from the edits must return the source); a line split that invents a line for a
 * trailing newline or drops an interior blank line; and a split pairing that
 * stacked a removed line and its replacement on two rows instead of one.
 *
 * The suite runs under `environment: "node"`; nothing here needs a renderer.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  diffLines,
  diffStrings,
  numberDiff,
  reconstructAfter,
  reconstructBefore,
  splitLines,
  splitPairs,
  type DiffRow,
  type LineEdit,
  type SplitPair,
} from "./logic.js";

/** One side of one split row, as `None` when the row or that side is absent. */
const side = (
  pairs: ReadonlyArray<SplitPair>,
  index: number,
  which: "left" | "right",
): Option.Option<DiffRow> =>
  Option.flatMap(Arr.get(pairs, index), (pair) => pair[which]);

describe("splitLines", () => {
  it("treats a trailing newline as the end of the last line, not a line", () => {
    expect(splitLines("a\nb\n")).toEqual(["a", "b"]);
    expect(splitLines("")).toEqual([]);
    expect(splitLines("a\n\n")).toEqual(["a", ""]);
  });
});

describe("diffLines", () => {
  it("finds the minimal edit: one removal, not a delete-and-reinsert", () => {
    expect(diffStrings("a\nb\nc", "a\nc")).toEqual([
      { kind: "context", text: "a" },
      { kind: "removed", text: "b" },
      { kind: "context", text: "c" },
    ]);
  });

  it("moves a line as the minimal removal plus addition", () => {
    const edits = diffStrings("x\ny\nz", "y\nx\nz");
    const changed = edits.filter((edit) => edit.kind !== "context").length;
    // The two sources share a two-line subsequence, so the minimal edit is two
    // changed lines — a delete-and-reinsert of the whole file would be six.
    expect(changed).toBe(2);
  });

  it("reconstructs both sides without eating a line", () => {
    const before = ["const a = 1;", "const b = 2;", "return a;"];
    const after = ["const a = 1;", "return a + b;"];
    const edits = diffLines(before, after);
    expect(reconstructBefore(edits)).toEqual(before);
    expect(reconstructAfter(edits)).toEqual(after);
  });

  it("breaks reconstruction when an edit is dropped (negative control)", () => {
    const edits = diffStrings("a\nb\nc", "a\nc");
    expect(reconstructBefore(edits)).toEqual(["a", "b", "c"]);
    // Drop the removal: the before side can no longer reassemble its source,
    // which is what makes the reconstruction assertion above meaningful.
    const dropped: ReadonlyArray<LineEdit> = edits.slice(0, 2);
    expect(reconstructBefore(dropped)).not.toEqual(["a", "b", "c"]);
  });
});

describe("numberDiff", () => {
  it("numbers context lines on both sides and changed lines on their own", () => {
    const rows = numberDiff(diffStrings("a\nb\nc", "a\nd\nc"));
    expect(rows.map((row) => row.before._tag)).toEqual([
      "Some",
      "Some",
      "None",
      "Some",
    ]);
    expect(rows.map((row) => row.after._tag)).toEqual([
      "Some",
      "None",
      "Some",
      "Some",
    ]);
  });
});

describe("splitPairs", () => {
  it("puts a removed line and the line that replaces it on one row", () => {
    const pairs = splitPairs(numberDiff(diffStrings("a\nb\nc", "a\nB\nc")));
    // A one-line edit is one row, not a removal and an addition stacked apart.
    expect(pairs).toHaveLength(3);
    expect(Option.getOrUndefined(side(pairs, 1, "left"))?.text).toBe("b");
    expect(Option.getOrUndefined(side(pairs, 1, "right"))?.text).toBe("B");
    // The context rows pair with themselves and keep both line numbers.
    expect(Option.getOrUndefined(side(pairs, 0, "left"))).toBe(
      Option.getOrUndefined(side(pairs, 0, "right")),
    );
    expect(Option.getOrUndefined(side(pairs, 0, "left"))?.before).toEqual(
      Option.some(1),
    );
  });

  it("blanks the side that ran out in an uneven run", () => {
    const pairs = splitPairs(numberDiff(diffStrings("a\nb\nc", "a\nB")));
    expect(pairs).toHaveLength(3);
    expect(Option.getOrUndefined(side(pairs, 1, "left"))?.text).toBe("b");
    expect(Option.getOrUndefined(side(pairs, 1, "right"))?.text).toBe("B");
    expect(Option.isNone(side(pairs, 2, "right"))).toBe(true);
    expect(Option.getOrUndefined(side(pairs, 2, "left"))?.text).toBe("c");
  });

  it("pairs a purely added run against blank left cells", () => {
    const pairs = splitPairs(numberDiff(diffStrings("a", "a\nb\nc")));
    expect(pairs).toHaveLength(3);
    expect(Option.isNone(side(pairs, 1, "left"))).toBe(true);
    expect(Option.getOrUndefined(side(pairs, 1, "right"))?.text).toBe("b");
    expect(Option.getOrUndefined(side(pairs, 2, "right"))?.text).toBe("c");
  });

  it("pairs a purely removed run against blank right cells", () => {
    const pairs = splitPairs(numberDiff(diffStrings("a\nb\nc", "a")));
    expect(pairs).toHaveLength(3);
    expect(Option.getOrUndefined(side(pairs, 1, "left"))?.text).toBe("b");
    expect(Option.isNone(side(pairs, 1, "right"))).toBe(true);
  });
});
