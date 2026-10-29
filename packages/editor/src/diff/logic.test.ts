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
  DEFAULT_CONTEXT,
  diffLines,
  diffStrings,
  hunks,
  modeOf,
  numberDiff,
  pairs,
  reconstructAfter,
  reconstructBefore,
  rows,
  splitLines,
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

describe("modeOf", () => {
  it("reads a stored layout name, and a name it does not declare as the default", () => {
    // The bug guarded: `mode` was compared with `=== "unified"` and every
    // other value fell through to the split layout, so a saved preference from
    // an older release (`"inline"`) painted two columns on a reader who asked
    // for one. A view name the union no longer carries is the default.
    expect(modeOf("unified")).toBe("unified");
    expect(modeOf("split")).toBe("split");
    expect(modeOf("inline")).toBe("unified");
    expect(modeOf(undefined)).toBe("unified");
    expect(modeOf(7)).toBe("unified");
    expect(modeOf(null, "split")).toBe("split");
    expect(modeOf("split", "unified")).toBe("split");
  });
});

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

describe("pairs", () => {
  it("puts a removed line and the line that replaces it on one row", () => {
    const split = pairs(numberDiff(diffStrings("a\nb\nc", "a\nB\nc")));
    // A one-line edit is one row, not a removal and an addition stacked apart.
    expect(split).toHaveLength(3);
    expect(Option.getOrUndefined(side(split, 1, "left"))?.text).toBe("b");
    expect(Option.getOrUndefined(side(split, 1, "right"))?.text).toBe("B");
    // The context rows pair with themselves and keep both line numbers.
    expect(Option.getOrUndefined(side(split, 0, "left"))).toBe(
      Option.getOrUndefined(side(split, 0, "right")),
    );
    expect(Option.getOrUndefined(side(split, 0, "left"))?.before).toEqual(
      Option.some(1),
    );
  });

  it("blanks the side that ran out in an uneven run", () => {
    const split = pairs(numberDiff(diffStrings("a\nb\nc", "a\nB")));
    expect(split).toHaveLength(3);
    expect(Option.getOrUndefined(side(split, 1, "left"))?.text).toBe("b");
    expect(Option.getOrUndefined(side(split, 1, "right"))?.text).toBe("B");
    expect(Option.isNone(side(split, 2, "right"))).toBe(true);
    expect(Option.getOrUndefined(side(split, 2, "left"))?.text).toBe("c");
  });

  it("pairs a purely added run against blank left cells", () => {
    const split = pairs(numberDiff(diffStrings("a", "a\nb\nc")));
    expect(split).toHaveLength(3);
    expect(Option.isNone(side(split, 1, "left"))).toBe(true);
    expect(Option.getOrUndefined(side(split, 1, "right"))?.text).toBe("b");
    expect(Option.getOrUndefined(side(split, 2, "right"))?.text).toBe("c");
  });

  it("pairs a purely removed run against blank right cells", () => {
    const split = pairs(numberDiff(diffStrings("a\nb\nc", "a")));
    expect(split).toHaveLength(3);
    expect(Option.getOrUndefined(side(split, 1, "left"))?.text).toBe("b");
    expect(Option.isNone(side(split, 1, "right"))).toBe(true);
  });

  it("gives every changed pair two cells, so a row is never half a change", () => {
    // The bug guarded: a split row that dropped one side made the two columns
    // different heights, and the rows below the change no longer lined up
    // across the divider.
    const split = pairs(numberDiff(diffStrings("a\nb\nc", "a\nB\nc")));
    expect(
      split.every(
        (pair) => Option.isSome(pair.left) && Option.isSome(pair.right),
      ),
    ).toBe(true);
  });
});

describe("rows", () => {
  it("puts a removal immediately beside the addition it became", () => {
    // The bug guarded: the unified script painted every removal and then every
    // addition, so a reviewer read two slabs and had to match them by eye. A
    // pair is adjacent — removed line, added line — in display order.
    const script = rows(numberDiff(diffStrings("a\nb\nc\nd", "a\nX\nd")));
    expect(script.map((row) => row.kind)).toEqual([
      "context",
      "removed",
      "added",
      "removed",
      "context",
    ]);
    // The first removal and its replacement are the adjacent pair; the second
    // removal has no replacement and follows it.
    expect(script.map((row) => row.text)).toEqual(["a", "b", "X", "c", "d"]);
  });

  it("keeps the two gutter numbers honest on every row of a paired script", () => {
    const script = rows(numberDiff(diffStrings("a\nb\nc", "a\nB")));
    expect(
      script.map((row) => [
        Option.getOrUndefined(row.before) ?? null,
        Option.getOrUndefined(row.after) ?? null,
      ]),
    ).toEqual([
      [1, 1],
      [2, null],
      [null, 2],
      [3, null],
    ]);
  });

  it("leaves a context row on the sheet once, with no second copy from its pair", () => {
    const script = rows(numberDiff(diffStrings("a\nb", "a\nb")));
    expect(script.map((row) => row.text)).toEqual(["a", "b"]);
  });
});

describe("hunks", () => {
  const before = Arr.range(1, 12).map((n) => String(n).padStart(2, "0"));
  const after = before.map((line) =>
    line === "02" ? "02 changed" : line === "11" ? "11 changed" : line,
  );

  it("skips unchanged lines beyond the context and names the skip", () => {
    // The bug guarded: the viewer painted every unchanged line, so a one-line
    // edit in a long file buried its change and had no hunk heading at all.
    const grouped = hunks(
      numberDiff(diffStrings(before.join("\n"), after.join("\n"))),
      1,
    );
    expect(grouped).toHaveLength(2);
    expect(
      grouped.map((hunk) =>
        Option.match(hunk.heading, {
          onNone: () => null,
          onSome: (heading) => heading.text,
        }),
      ),
    ).toEqual(["@@ -1,3 +1,3 @@", "@@ -10,3 +10,3 @@"]);
    const painted = grouped.flatMap((hunk) => hunk.rows.map((row) => row.text));
    // Eight unchanged lines between the two changes are dropped...
    expect(painted).not.toContain("04");
    expect(painted).not.toContain("08");
    // ...while the one line of context either side of each change survives.
    expect(painted).toContain("03");
    expect(painted).toContain("10");
  });

  it("keeps the default context on each side of a change", () => {
    const grouped = hunks(
      numberDiff(diffStrings(before.join("\n"), after.join("\n"))),
    );
    const painted = grouped.flatMap((hunk) => hunk.rows.map((row) => row.text));
    expect(DEFAULT_CONTEXT).toBe(3);
    expect(painted).toContain("05");
    expect(painted).not.toContain("06");
    expect(painted).toContain("09");
    expect(painted).not.toContain("07");
  });

  it("shows the whole script as one unheaded hunk when nothing changed", () => {
    const grouped = hunks(numberDiff(diffStrings("a\nb", "a\nb")));
    expect(grouped).toHaveLength(1);
    expect(Option.isNone(Arr.getUnsafe(grouped, 0).heading)).toBe(true);
    expect(Arr.getUnsafe(grouped, 0).rows).toHaveLength(2);
  });

  it("shows the whole script as one unheaded hunk when the context is unbounded", () => {
    const grouped = hunks(
      numberDiff(diffStrings(before.join("\n"), after.join("\n"))),
      Number.POSITIVE_INFINITY,
    );
    expect(grouped).toHaveLength(1);
    expect(Option.isNone(Arr.getUnsafe(grouped, 0).heading)).toBe(true);
  });

  it("names the insertion point when a hunk adds lines with no before side", () => {
    // The bug guarded: a heading read only the lines it paints, so a pure
    // addition with no context named `-0,0` and the reader lost where the
    // insertion lands. It names the line the addition follows.
    const grouped = hunks(numberDiff(diffStrings("a\nb\nc", "a\nb\nX\nc")), 0);
    expect(
      Option.match(Arr.getUnsafe(grouped, 0).heading, {
        onNone: () => null,
        onSome: (heading) => heading.text,
      }),
    ).toBe("@@ -2,0 +3,1 @@");
  });
});
