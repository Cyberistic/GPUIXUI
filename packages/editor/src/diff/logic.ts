import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import * as Str from "effect/String";

export const DiffMode = Schema.Literals(["unified", "split"]);

export type DiffMode = typeof DiffMode.Type;

export const isDiffMode = Schema.is(DiffMode);

export const modeOf = (
  value: unknown,
  fallback: DiffMode = "unified",
): DiffMode => (isDiffMode(value) ? value : fallback);

export type LineKind = "context" | "added" | "removed";

export interface LineEdit {
  readonly kind: LineKind;
  readonly text: string;
}

const LINE_ENDINGS = /\r\n?|\n/;

export const splitLines = (source: string): ReadonlyArray<string> =>
  Arr.match(Str.split(LINE_ENDINGS)(source), {
    onEmpty: () => [],
    onNonEmpty: (rows) =>
      Str.isEmpty(Arr.getUnsafe(rows, Arr.length(rows) - 1))
        ? Arr.dropRight(rows, 1)
        : rows,
  });

export const diffLines = (
  before: ReadonlyArray<string>,
  after: ReadonlyArray<string>,
): ReadonlyArray<LineEdit> => {
  const n = before.length;
  const m = after.length;
  const stride = m + 1;

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

export const diffStrings = (
  before: string,
  after: string,
): ReadonlyArray<LineEdit> => diffLines(splitLines(before), splitLines(after));

export const reconstructBefore = (
  edits: ReadonlyArray<LineEdit>,
): ReadonlyArray<string> =>
  Arr.map(
    Arr.filter(edits, (edit) => edit.kind !== "added"),
    (edit) => edit.text,
  );

export const reconstructAfter = (
  edits: ReadonlyArray<LineEdit>,
): ReadonlyArray<string> =>
  Arr.map(
    Arr.filter(edits, (edit) => edit.kind !== "removed"),
    (edit) => edit.text,
  );

export type RowKind = LineKind | "hunk";

export interface DiffRow {
  readonly kind: RowKind;
  readonly text: string;

  readonly before: Option.Option<number>;

  readonly after: Option.Option<number>;
}

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

export interface SplitPair {
  readonly left: Option.Option<DiffRow>;
  readonly right: Option.Option<DiffRow>;
}

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

export const DEFAULT_CONTEXT = 3;

export interface DiffHunk {
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

export const hunks = (
  rows: ReadonlyArray<DiffRow>,
  context: number = DEFAULT_CONTEXT,
): ReadonlyArray<DiffHunk> => {
  const reach = context >= 0 ? context : 0;
  const changes = Arr.filterMap(rows, (row, index) =>
    row.kind === "context" ? Result.failVoid : Result.succeed(index),
  );

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

export interface SplitBlock {
  readonly heading: Option.Option<DiffRow>;
  readonly pairs: ReadonlyArray<SplitPair>;
}

const isHeading = (pair: SplitPair): boolean =>
  Option.exists(pair.left, (row) => row.kind === "hunk");

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

export type MarkRange = readonly [number, number];

export interface WordMarks {
  readonly before: ReadonlyArray<MarkRange>;
  readonly after: ReadonlyArray<MarkRange>;
}

const TOKEN = /\s+|[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu;

const tokensOf = (line: string): ReadonlyArray<string> => line.match(TOKEN) ?? [];

const mergedRanges = (
  tokens: ReadonlyArray<string>,
  kept: ReadonlySet<number>,
): ReadonlyArray<MarkRange> => {
  const ranges: Array<[number, number]> = [];
  let at = 0;
  tokens.forEach((token, index) => {
    const end = at + token.length;
    if (!kept.has(index)) {
      const last = ranges[ranges.length - 1];
      if (last !== undefined && last[1] === at) last[1] = end;
      else ranges.push([at, end]);
    }
    at = end;
  });
  return ranges;
};

export const wordMarks = (before: string, after: string): WordMarks => {
  const a = tokensOf(before);
  const b = tokensOf(after);
  const table = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  );
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i]![j] =
        a[i] === b[j]
          ? table[i + 1]![j + 1]! + 1
          : Math.max(table[i + 1]![j]!, table[i]![j + 1]!);
    }
  }
  const keptA = new Set<number>();
  const keptB = new Set<number>();
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      keptA.add(i++);
      keptB.add(j++);
    } else if (table[i + 1]![j]! >= table[i]![j + 1]!) i++;
    else j++;
  }
  return { before: mergedRanges(a, keptA), after: mergedRanges(b, keptB) };
};
