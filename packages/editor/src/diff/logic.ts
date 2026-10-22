/**
 * A pure line diff between two sources.
 *
 * The two sources are split into lines and compared with a longest-common-
 * subsequence walk, which is the textbook minimal edit script: a changed line
 * is either a removal from the before side or an addition to the after side,
 * and the two together are exactly `n + m - 2·lcs` lines — the smallest number
 * a diff can change, because every line outside the common subsequence must be
 * reported once. The result is a flat list of edits in reading order; line
 * numbers are a presentation step the viewer adds afterwards.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";

/** What a line is in the edit script: shared, added on the after side, or removed from the before side. */
export type LineKind = "context" | "added" | "removed";

/** One line of the edit script. The edits read top to bottom as the merged document. */
export interface LineEdit {
  readonly kind: LineKind;
  readonly text: string;
}

/** A line ending the diff splits on. */
const LINE_ENDINGS = /\r\n?|\n/;

/**
 * The lines a source is made of.
 *
 * A trailing line ending is the end of the last line, not a line of its own, so
 * it is dropped; an empty source has no lines. An interior blank line is a line.
 */
export const splitLines = (source: string): ReadonlyArray<string> =>
  Arr.match(Str.split(LINE_ENDINGS)(source), {
    onEmpty: () => [],
    onNonEmpty: (rows) =>
      Str.isEmpty(Arr.getUnsafe(rows, Arr.length(rows) - 1))
        ? Arr.dropRight(rows, 1)
        : rows,
  });

/**
 * The minimal edit script turning `before` into `after`.
 *
 * A classic LCS table: `lengths[i][j]` is the length of the longest common
 * subsequence of `before[i..]` and `after[j..]`. The backtrack walks the table
 * and emits a context line where the two sides agree, a removal where the
 * before side advances alone and an addition where the after side advances
 * alone. Ties prefer a removal, which keeps the diff anchored to the before
 * side — the side a reviewer reads against.
 */
export const diffLines = (
  before: ReadonlyArray<string>,
  after: ReadonlyArray<string>,
): ReadonlyArray<LineEdit> => {
  const n = before.length;
  const m = after.length;
  const stride = m + 1;
  // Flattened `(n+1) × (m+1)` table, filled backwards so `cell(i, j)` can read
  // `cell(i+1, ·)` and `cell(i, j+1)` already computed.
  const lengths = Arr.makeBy((n + 1) * stride, () => 0);
  const cell = (i: number, j: number): number =>
    Arr.getUnsafe(lengths, i * stride + j);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lengths[i * stride + j] =
        Arr.getUnsafe(before, i) === Arr.getUnsafe(after, j)
          ? cell(i + 1, j + 1) + 1
          : Math.max(cell(i + 1, j), cell(i, j + 1));
    }
  }

  const edits: Array<LineEdit> = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (Arr.getUnsafe(before, i) === Arr.getUnsafe(after, j)) {
      edits.push({ kind: "context", text: Arr.getUnsafe(before, i) });
      i += 1;
      j += 1;
    } else if (cell(i + 1, j) >= cell(i, j + 1)) {
      edits.push({ kind: "removed", text: Arr.getUnsafe(before, i) });
      i += 1;
    } else {
      edits.push({ kind: "added", text: Arr.getUnsafe(after, j) });
      j += 1;
    }
  }
  while (i < n) {
    edits.push({ kind: "removed", text: Arr.getUnsafe(before, i) });
    i += 1;
  }
  while (j < m) {
    edits.push({ kind: "added", text: Arr.getUnsafe(after, j) });
    j += 1;
  }
  return edits;
};

/** The edit script between two sources, split on their line endings. */
export const diffStrings = (
  before: string,
  after: string,
): ReadonlyArray<LineEdit> => diffLines(splitLines(before), splitLines(after));

/**
 * The before-side source an edit script produces: the context and removed
 * lines, in order. It is the proof that a diff has not eaten a line.
 */
export const reconstructBefore = (
  edits: ReadonlyArray<LineEdit>,
): ReadonlyArray<string> =>
  Arr.map(
    Arr.filter(edits, (edit) => edit.kind !== "added"),
    (edit) => edit.text,
  );

/**
 * The after-side source an edit script produces: the context and added lines,
 * in order.
 */
export const reconstructAfter = (
  edits: ReadonlyArray<LineEdit>,
): ReadonlyArray<string> =>
  Arr.map(
    Arr.filter(edits, (edit) => edit.kind !== "removed"),
    (edit) => edit.text,
  );

/** One row the viewer paints, with the line number it carries on each side. */
export interface DiffRow {
  readonly kind: LineKind;
  readonly text: string;
  /** 1-based line number on the before side; `None` for a pure addition. */
  readonly before: Option.Option<number>;
  /** 1-based line number on the after side; `None` for a pure removal. */
  readonly after: Option.Option<number>;
}

/**
 * The edit script with its line numbers attached.
 *
 * A context line advances both sides, a removal the before side and an addition
 * the after side; the numbers are 1-based, so a viewer can number the gutters
 * without recounting the lines a diff dropped.
 */
export const numberDiff = (
  edits: ReadonlyArray<LineEdit>,
): ReadonlyArray<DiffRow> => {
  const rows: Array<DiffRow> = [];
  let before = 0;
  let after = 0;
  for (const edit of edits) {
    if (edit.kind === "removed") {
      before += 1;
      rows.push({
        kind: edit.kind,
        text: edit.text,
        before: Option.some(before),
        after: Option.none(),
      });
    } else if (edit.kind === "added") {
      after += 1;
      rows.push({
        kind: edit.kind,
        text: edit.text,
        before: Option.none(),
        after: Option.some(after),
      });
    } else {
      before += 1;
      after += 1;
      rows.push({
        kind: edit.kind,
        text: edit.text,
        before: Option.some(before),
        after: Option.some(after),
      });
    }
  }
  return rows;
};
