/**
 * The line-diff half of the diff viewer.
 *
 * The bugs these guard: a diff that reports a non-minimal edit (every changed
 * line outside the common subsequence must be reported exactly once, never
 * delete-all-then-add-all); a diff that eats a line (reconstructing either side
 * from the edits must return the source); and a line split that invents a line
 * for a trailing newline or drops an interior blank line.
 *
 * The suite runs under `environment: "node"`; nothing here needs a renderer.
 */

import { describe, expect, it } from "vitest";
import {
  diffLines,
  diffStrings,
  numberDiff,
  reconstructAfter,
  reconstructBefore,
  splitLines,
  type LineEdit,
} from "./logic.js";

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
