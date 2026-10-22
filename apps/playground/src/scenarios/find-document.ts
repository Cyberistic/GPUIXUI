/**
 * The document a find bar searches, and the match arithmetic a virtualized one
 * needs.
 *
 * A `<virtual-list>` mounts a window of its rows, so the runtime can only number
 * the matches inside that window. `matchIndexOffset` is how an app says how many
 * matches come before a row — a **match** count, not a row index, because rows
 * hold different numbers of matches. These rules are pure, so the probe's
 * arithmetic is tested without a renderer; the probe itself measures the paint.
 */
import { Match } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";

/** The word the find bar looks for. */
export const QUERY = "error";
/** What a replace-all writes over it. */
export const REPLACEMENT = "fixed";
/** Rows in the document. */
export const ROWS = 400;
/** The height every row declares, so a viewport holds a known window. */
export const ROW_HEIGHT = 24;
/** The list's viewport: eight whole rows, a fraction of the document. */
export const VIEWPORT = 200;
/** A row outside the mounted window; it holds two matches. */
export const LATE_ROW = 320;

/**
 * How many matches a row is built with: none, one, or two.
 *
 * The three cases are what make a row index unusable as an offset. A document
 * where every row held the same number would let `rowIndex * perRow` stand in,
 * and nothing would show the difference.
 */
export const rowMatches = (index: number): number =>
  index % 11 === 5 ? 0 : index % 7 === 3 ? 1 : 2;

/** A row as it is authored: its identity, text and declared match count. */
export interface RowShape {
  readonly id: string;
  readonly text: string;
  readonly matches: number;
}

/** A row with the match count before it, which is its `matchIndexOffset`. */
export interface IndexedRow extends RowShape {
  readonly index: number;
  /** Matches in every row **above** this one. */
  readonly offset: number;
}

/** The row's own label; it never contains the query. */
const rowLabel = (index: number): string =>
  `line ${Str.padStart(3, "0")(`${index}`)}`;

/** The text a row paints: the query repeated `matches` times, or `clean`. */
export const rowText = (index: number): string => {
  const body = Match.value(rowMatches(index)).pipe(
    Match.when(0, () => "clean"),
    Match.when(1, () => QUERY),
    Match.orElse(() => `${QUERY} at ${QUERY}`),
  );
  return `${rowLabel(index)} ${body}`;
};

/** Non-overlapping occurrences of `query` in `text`. */
export const occurrences = (text: string, query: string): number =>
  query.length === 0 ? 0 : Arr.length(Str.split(query)(text)) - 1;

/** Adds each row's index and the running match count before it. */
export const indexRows = (
  rows: ReadonlyArray<RowShape>,
): ReadonlyArray<IndexedRow> => {
  const [, indexed] = Arr.mapAccum(rows, 0, (offset, row, index) => [
    offset + row.matches,
    { ...row, index, offset },
  ]);
  return indexed;
};

/** The 400-row document every step of the probe searches. */
export const documentRows: ReadonlyArray<IndexedRow> = indexRows(
  Arr.map(Arr.range(0, ROWS - 1), (index) => ({
    id: `find-row-${index}`,
    text: rowText(index),
    matches: rowMatches(index),
  })),
);

/** Every match in the document, mounted or not. */
export const totalMatches = (rows: ReadonlyArray<IndexedRow>): number =>
  Arr.reduce(rows, 0, (total, row) => total + row.matches);

/** Where one document-wide match index lands: its row and its offset in it. */
export interface MatchLocation {
  readonly row: number;
  readonly local: number;
}

/** The row and local index a document-wide match index names. */
export const locateMatch = (
  rows: ReadonlyArray<IndexedRow>,
  matchIndex: number,
): Option.Option<MatchLocation> =>
  Option.map(
    Arr.findFirst(
      rows,
      (row) =>
        matchIndex >= row.offset && matchIndex < row.offset + row.matches,
    ),
    (row) => ({ row: row.index, local: matchIndex - row.offset }),
  );

/**
 * The second match of `LATE_ROW`: the cursor the probe moves to a far row.
 *
 * The second one, not the first, because an off-by-one offset then marks the
 * first match of the **same** row — a wrong match that is on screen, not a
 * missing one off it.
 */
export const lateMatchIndex = (rows: ReadonlyArray<IndexedRow>): number =>
  Option.getOrElse(
    Option.map(Arr.get(rows, LATE_ROW), (row) => row.offset + 1),
    () => 0,
  );

/** Every occurrence replaced, with each row's count re-derived from its text. */
export const replaceMatches = (
  rows: ReadonlyArray<IndexedRow>,
  query: string,
  replacement: string,
): ReadonlyArray<IndexedRow> =>
  indexRows(
    Arr.map(rows, (row) => {
      const text = Str.replaceAll(query, replacement)(row.text);
      return { id: row.id, text, matches: occurrences(text, query) };
    }),
  );
