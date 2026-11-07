import { Match } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";

export const QUERY = "error";

export const REPLACEMENT = "fixed";

export const ROWS = 400;

export const ROW_HEIGHT = 24;

export const VIEWPORT = 200;

export const LATE_ROW = 320;

export const rowMatches = (index: number): number =>
  index % 11 === 5 ? 0 : index % 7 === 3 ? 1 : 2;

export interface RowShape {
  readonly id: string;
  readonly text: string;
  readonly matches: number;
}

export interface IndexedRow extends RowShape {
  readonly index: number;

  readonly offset: number;
}

const rowLabel = (index: number): string =>
  `line ${Str.padStart(3, "0")(`${index}`)}`;

export const rowText = (index: number): string => {
  const body = Match.value(rowMatches(index)).pipe(
    Match.when(0, () => "clean"),
    Match.when(1, () => QUERY),
    Match.orElse(() => `${QUERY} at ${QUERY}`),
  );
  return `${rowLabel(index)} ${body}`;
};

export const occurrences = (text: string, query: string): number =>
  query.length === 0 ? 0 : Arr.length(Str.split(query)(text)) - 1;

export const indexRows = (
  rows: ReadonlyArray<RowShape>,
): ReadonlyArray<IndexedRow> => {
  const [, indexed] = Arr.mapAccum(rows, 0, (offset, row, index) => [
    offset + row.matches,
    { ...row, index, offset },
  ]);
  return indexed;
};

export const documentRows: ReadonlyArray<IndexedRow> = indexRows(
  Arr.map(Arr.range(0, ROWS - 1), (index) => ({
    id: `find-row-${index}`,
    text: rowText(index),
    matches: rowMatches(index),
  })),
);

export const totalMatches = (rows: ReadonlyArray<IndexedRow>): number =>
  Arr.reduce(rows, 0, (total, row) => total + row.matches);

export interface MatchLocation {
  readonly row: number;
  readonly local: number;
}

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

export const lateMatchIndex = (rows: ReadonlyArray<IndexedRow>): number =>
  Option.getOrElse(
    Option.map(Arr.get(rows, LATE_ROW), (row) => row.offset + 1),
    () => 0,
  );

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
