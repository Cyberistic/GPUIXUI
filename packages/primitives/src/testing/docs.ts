/**
 * The package's own pages, read as tables for the documentation guards.
 *
 * Two guards read pages: `docs-tables.test.ts` proves every row sits inside a
 * well-formed table, and `docs-keyboard.test.ts` ties a documented key to the
 * rule that answers it. Both need the same two facts — where a table starts and
 * what its cells are — so they share this parser instead of each spelling the
 * escape rule (a `\|` inside a cell is not a separator; plan `813`).
 *
 * Test-only: the package root does not re-export it.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";

/** A page line with its 1-based number. */
export interface DocLine {
  readonly number: number;
  readonly text: string;
}

/** Stands in for `\|` while a row is split, so an escaped pipe stays in its cell. */
const ESCAPED_PIPE = "\u0000";

/** A Markdown delimiter cell: `---`, `:---`, `---:` or `:---:`. */
const DELIMITER = /^:?-{3,}:?$/;

/** Whether a line begins a table row: its first non-space character is `|`. */
export const isTableRow = (text: string): boolean =>
  Str.startsWith("|")(Str.trim(text));

/**
 * A row's cells, trimmed.
 *
 * The leading and trailing pipes are separators, not cells, and an escaped
 * `\|` (a type union inside a cell) is restored after the split.
 */
export const tableCells = (text: string): ReadonlyArray<string> => {
  const parts = Arr.drop(
    Str.split("|")(Str.replace(/\\\|/g, ESCAPED_PIPE)(Str.trim(text))),
    1,
  );
  const last = Arr.last(parts);
  const body = Option.exists(last, (cell) => Str.isEmpty(Str.trim(cell)))
    ? Arr.dropRight(parts, 1)
    : parts;
  return Arr.map(body, (cell) =>
    Str.replace(ESCAPED_PIPE, "|")(Str.trim(cell)),
  );
};

/** Whether a row is a Markdown delimiter row, e.g. `| --- | :---: |`. */
export const isDelimiterRow = (text: string): boolean => {
  const cells = tableCells(text);
  return (
    isTableRow(text) &&
    Arr.isReadonlyArrayNonEmpty(cells) &&
    Arr.every(cells, (cell) => DELIMITER.test(cell))
  );
};

/** The open run being built, and the completed runs before it. */
interface Grouping {
  readonly blocks: ReadonlyArray<ReadonlyArray<DocLine>>;
  readonly open: ReadonlyArray<DocLine>;
}

/**
 * Every maximal run of consecutive table rows, in page order.
 *
 * A blank or prose line ends a run, which is exactly what Markdown does — so a
 * row on its own here is the row a reader sees as body text.
 */
export const docTableBlocks = (
  body: string,
): ReadonlyArray<ReadonlyArray<DocLine>> => {
  const lines = Arr.map(Str.split(body, "\n"), (text, index) => ({
    number: index + 1,
    text,
  }));
  const close = (grouping: Grouping): Grouping =>
    Arr.isReadonlyArrayEmpty(grouping.open)
      ? grouping
      : { blocks: Arr.append(grouping.blocks, grouping.open), open: [] };
  const empty: Grouping = { blocks: [], open: [] };
  const grouped = Arr.reduce(lines, empty, (grouping, line) =>
    isTableRow(line.text)
      ? { blocks: grouping.blocks, open: Arr.append(grouping.open, line) }
      : close(grouping),
  );
  return close(grouped).blocks;
};
