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
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import * as Str from "effect/String";

/** How the two sides are laid out. */
export const DiffMode = Schema.Literals(["unified", "split"]);
/** How the two sides are laid out. */
export type DiffMode = typeof DiffMode.Type;

/** Whether a value names one of the two layouts. */
export const isDiffMode = Schema.is(DiffMode);

/**
 * A layout read at the boundary.
 *
 * A view mode is a stored preference as often as a literal, so a name a saved
 * record carries that this release no longer declares — or one it never
 * declared — is the default rather than a silent fall through to the other
 * layout, which paints a view the caller did not ask for.
 */
export const modeOf = (
  value: unknown,
  fallback: DiffMode = "unified",
): DiffMode => (isDiffMode(value) ? value : fallback);

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

/** What a painted row is: a line of the script, or the heading that introduces a hunk. */
export type RowKind = LineKind | "hunk";

/** One row the viewer paints, with the line number it carries on each side. */
export interface DiffRow {
  readonly kind: RowKind;
  readonly text: string;
  /** 1-based line number on the before side; `None` for a pure addition or a hunk heading. */
  readonly before: Option.Option<number>;
  /** 1-based line number on the after side; `None` for a pure removal or a hunk heading. */
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

/** One row of a side-by-side diff: what each side paints, `None` where it has none. */
export interface SplitPair {
  readonly left: Option.Option<DiffRow>;
  readonly right: Option.Option<DiffRow>;
}

/** The two sides of one changed run, zipped by index and padded with blanks. */
const pairRun = (run: ReadonlyArray<DiffRow>): ReadonlyArray<SplitPair> => {
  const removals = Arr.filter(run, (row) => row.kind === "removed");
  const additions = Arr.filter(run, (row) => row.kind === "added");
  const height = Math.max(removals.length, additions.length);
  if (height === 0) return [];
  return Arr.map(Arr.range(0, height - 1), (index) => ({
    left: Arr.get(removals, index),
    right: Arr.get(additions, index),
  }));
};

/**
 * Pair the flat rows so a side-by-side viewer reads one change per row.
 *
 * A context line pairs with itself. A run of removed and added lines is zipped
 * by index — the first removal beside the first addition, and so on — with a
 * blank cell on the side that ran out, so a one-line edit is **one** row rather
 * than a removal and an addition stacked apart. This is the pairing a split
 * diff exists to show: the left cell is what was there and the right cell what
 * replaced it.
 */
const pairRows = (rows: ReadonlyArray<DiffRow>): ReadonlyArray<SplitPair> =>
  Arr.match(rows, {
    onEmpty: () => [],
    onNonEmpty: (nonEmpty) =>
      Arr.flatMap(
        Arr.groupWith(
          nonEmpty,
          (left, right) =>
            (left.kind === "context") === (right.kind === "context"),
        ),
        (group) =>
          Arr.getUnsafe(group, 0).kind === "context"
            ? Arr.map(group, (row) => ({
                left: Option.some(row),
                right: Option.some(row),
              }))
            : pairRun(group),
      ),
  });

/** How many unchanged rows a hunk keeps either side of a change. */
export const DEFAULT_CONTEXT = 3;

/** One run of rows the viewer paints, and the heading that names the lines a skip dropped. */
export interface DiffHunk {
  /** `@@ -beforeStart,count +afterStart,count @@`; `None` when the hunk shows the whole script. */
  readonly heading: Option.Option<DiffRow>;
  readonly rows: ReadonlyArray<DiffRow>;
}

const numbersOf = (
  rows: ReadonlyArray<DiffRow>,
  side: (row: DiffRow) => Option.Option<number>,
): ReadonlyArray<number> =>
  Arr.reduce(rows, Arr.empty<number>(), (numbers, row) =>
    Option.match(side(row), {
      onNone: () => numbers,
      onSome: (value) => Arr.append(numbers, value),
    }),
  );

/**
 * The range a hunk names on one side.
 *
 * A side with lines in the slice starts at its first line. A pure addition names
 * the before side with no lines, so it starts after the last before line before
 * the hunk — `@@ -3,0 +4,1 @@`, not `@@ -0,0 +4,1 @@`, because the reader needs
 * to know where the insertion lands.
 */
const spanOf = (
  all: ReadonlyArray<DiffRow>,
  visible: ReadonlyArray<DiffRow>,
  start: number,
  side: (row: DiffRow) => Option.Option<number>,
): { readonly start: number; readonly count: number } =>
  Arr.match(numbersOf(visible, side), {
    onEmpty: () => ({
      start: Arr.length(
        Arr.filter(Arr.take(all, start), (row) => Option.isSome(side(row))),
      ),
      count: 0,
    }),
    onNonEmpty: (values) => ({
      start: Arr.getUnsafe(values, 0),
      count: Arr.length(values),
    }),
  });

const headingOf = (
  all: ReadonlyArray<DiffRow>,
  visible: ReadonlyArray<DiffRow>,
  start: number,
): Option.Option<DiffRow> => {
  if (start === 0 && Arr.length(visible) === Arr.length(all)) {
    return Option.none();
  }
  const before = spanOf(all, visible, start, (row) => row.before);
  const after = spanOf(all, visible, start, (row) => row.after);
  return Option.some({
    kind: "hunk",
    text: `@@ -${before.start},${before.count} +${after.start},${after.count} @@`,
    before: Option.none(),
    after: Option.none(),
  });
};

/**
 * Split the numbered rows into hunks, keeping `context` unchanged rows either
 * side of a change and naming the lines a skip dropped.
 *
 * A change within `2·context` rows of the previous one joins the same hunk, so
 * the context windows abut and the slices never overlap: no change is shown
 * twice. A script with no changes is one hunk with no heading: the viewer shows
 * the file rather than an empty sheet. `context: Number.POSITIVE_INFINITY`
 * keeps everything and therefore emits no heading.
 */
export const hunks = (
  rows: ReadonlyArray<DiffRow>,
  context: number = DEFAULT_CONTEXT,
): ReadonlyArray<DiffHunk> => {
  const reach = context >= 0 ? context : 0;
  const changes = Arr.filterMap(rows, (row, index) =>
    row.kind === "context" ? Result.failVoid : Result.succeed(index),
  );
  // A change within `2·context` rows of the previous one shares its hunk, so
  // the two context windows abut rather than skip a row between them.
  const spans = Arr.reduce(
    changes,
    Arr.empty<{ readonly start: number; readonly end: number }>(),
    (spans, index) =>
      Option.match(Arr.last(spans), {
        onNone: () => [{ start: index, end: index + 1 }],
        onSome: (span) =>
          index - span.end <= 2 * reach
            ? Arr.append(Arr.dropRight(spans, 1), {
                start: span.start,
                end: index + 1,
              })
            : Arr.append(spans, { start: index, end: index + 1 }),
      }),
  );
  return Arr.match(spans, {
    onEmpty: () => [{ heading: Option.none(), rows }],
    onNonEmpty: (runs) =>
      Arr.map(runs, (span) => {
        const start = Math.max(0, span.start - reach);
        const end = Math.min(Arr.length(rows), span.end + reach);
        const visible = Arr.drop(Arr.take(rows, end), start);
        return { heading: headingOf(rows, visible, start), rows: visible };
      }),
  });
};

const headingRows = (hunk: DiffHunk): ReadonlyArray<DiffRow> =>
  Option.match(hunk.heading, {
    onNone: () => [],
    onSome: (heading) => [heading],
  });

const flattenPair = (pair: SplitPair): ReadonlyArray<DiffRow> =>
  Option.match(pair.left, {
    onNone: () =>
      Option.match(pair.right, {
        onNone: () => [],
        onSome: (row) => [row],
      }),
    onSome: (left) =>
      left.kind === "context"
        ? [left]
        : Option.match(pair.right, {
            onNone: () => [left],
            onSome: (right) => [left, right],
          }),
  });

/**
 * The unified row sequence: each hunk's heading, then every changed pair with
 * the removal and the addition it became adjacent, and every context row once.
 */
export const rows = (
  numbered: ReadonlyArray<DiffRow>,
  context: number = DEFAULT_CONTEXT,
): ReadonlyArray<DiffRow> =>
  Arr.flatMap(hunks(numbered, context), (hunk) =>
    Arr.appendAll(
      headingRows(hunk),
      Arr.flatMap(pairRows(hunk.rows), flattenPair),
    ),
  );

/**
 * The split row sequence: the same hunks, paired across the divider.
 *
 * A heading pairs with nothing on the right, so a split viewer paints it once
 * across both columns; every other row aligns a left cell with a right cell and
 * blanks the side that ran out.
 */
export const pairs = (
  numbered: ReadonlyArray<DiffRow>,
  context: number = DEFAULT_CONTEXT,
): ReadonlyArray<SplitPair> =>
  Arr.flatMap(hunks(numbered, context), (hunk) =>
    Arr.appendAll(
      Arr.map(headingRows(hunk), (heading) => ({
        left: Option.some(heading),
        right: Option.none(),
      })),
      pairRows(hunk.rows),
    ),
  );

/** One split block: a heading that spans the sheet, or a run of paired rows between two headings. */
export interface SplitBlock {
  readonly heading: Option.Option<DiffRow>;
  readonly pairs: ReadonlyArray<SplitPair>;
}

/** Whether a pair carries a heading rather than two cells. */
const isHeading = (pair: SplitPair): boolean =>
  Option.exists(pair.left, (row) => row.kind === "hunk");

/**
 * Group the split pairs into the blocks a viewer paints: a heading on its own,
 * then each run of pairs that share the two-column layout.
 *
 * The two columns are separate scrollers, so a heading cannot live inside them
 * and still span the sheet — it is a block of its own. Every non-heading block
 * has one row per pair, so the two sides always line up.
 */
export const blocks = (
  script: ReadonlyArray<SplitPair>,
): ReadonlyArray<SplitBlock> =>
  Arr.match(script, {
    onEmpty: () => [],
    onNonEmpty: (nonEmpty) =>
      Arr.map(
        Arr.groupWith(
          nonEmpty,
          (left, right) => isHeading(left) === isHeading(right),
        ),
        (group) =>
          isHeading(Arr.getUnsafe(group, 0))
            ? {
                heading: Arr.getUnsafe(group, 0).left,
                pairs: Arr.empty<SplitPair>(),
              }
            : { heading: Option.none(), pairs: group },
      ),
  });
