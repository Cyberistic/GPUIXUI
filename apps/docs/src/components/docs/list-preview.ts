/**
 * The list preview's row order, type-ahead and selection arithmetic.
 *
 * The shipped `List` owns three rules a drawing cannot show: which row an arrow
 * reaches (disabled rows are skipped and the ends wrap), what a typed prefix
 * does (search **after** the current row over `textValue`, so a repeated letter
 * cycles), and what a selection means (an ordered, duplicate-free list, with a
 * range that never includes a disabled row). The browser preview repeats them,
 * and this module is where the repetition is tested. `null` is "no row": the
 * preview's focus state, not a domain absence.
 */

/** One row the preview paints. */
export interface PreviewListRow {
  readonly value: string;
  readonly title: string;
  readonly description?: string;
  /** The right-hand metadata a row can carry. */
  readonly trailing?: string;
  readonly disabled?: boolean;
  /**
   * The text type-ahead matches. The component reads `textValue`, not the
   * rendered title, so a row without it is not searched.
   */
  readonly searchText?: string;
}

/** The indexes of every row that accepts input, ascending. */
const enabledIndexes = (
  rows: ReadonlyArray<PreviewListRow>,
): ReadonlyArray<number> =>
  rows.flatMap((row, index) => (row.disabled === true ? [] : [index]));

const valueAt = (
  rows: ReadonlyArray<PreviewListRow>,
  index: number,
): string | null => rows[index]?.value ?? null;

/** The first row that can be reached, or `null` when every row is disabled. */
export const firstRow = (
  rows: ReadonlyArray<PreviewListRow>,
): string | null => {
  const [first] = enabledIndexes(rows);
  return first === undefined ? null : valueAt(rows, first);
};

/** The last row that can be reached, or `null` when every row is disabled. */
export const lastRow = (rows: ReadonlyArray<PreviewListRow>): string | null => {
  const enabled = enabledIndexes(rows);
  const last = enabled[enabled.length - 1];
  return last === undefined ? null : valueAt(rows, last);
};

/**
 * The row an arrow reaches: disabled rows are skipped and the move wraps.
 *
 * From a disabled or unknown current row the move continues in `delta`'s
 * direction and wraps — the component's rule, so an arrow over a disabled row
 * still lands on the next reachable one instead of stopping.
 */
export const nextRow = (
  rows: ReadonlyArray<PreviewListRow>,
  current: string | null,
  delta: 1 | -1,
): string | null => {
  const enabled = enabledIndexes(rows);
  const [first] = enabled;
  const last = enabled[enabled.length - 1];
  if (first === undefined || last === undefined) return null;

  const at =
    current === null ? -1 : rows.findIndex((row) => row.value === current);
  if (at === -1) return valueAt(rows, delta > 0 ? first : last);

  const position = enabled.indexOf(at);
  if (position !== -1) {
    const next = enabled[(position + delta + enabled.length) % enabled.length];
    return next === undefined ? null : valueAt(rows, next);
  }

  // A disabled row: continue past it, wrapping when there is nothing beyond.
  const beyond =
    delta > 0
      ? enabled.find((index) => index > at)
      : [...enabled].reverse().find((index) => index < at);
  return valueAt(rows, beyond ?? (delta > 0 ? first : last));
};

/** How long a typed prefix stays alive, as the component's `typeahead` does. */
export const TYPEAHEAD_WINDOW_MS = 500;

/** The typed prefix and when its last keystroke arrived. */
export interface TypeaheadBuffer {
  readonly text: string;
  readonly at: number;
}

/** Nothing typed. */
export const IDLE: TypeaheadBuffer = { text: "", at: 0 };

/**
 * Add one character to the buffer.
 *
 * A keystroke after the window starts a fresh prefix, and repeating the buffer's
 * only letter keeps it as it is — the two rules that make `d` `d` cycle the rows
 * that start with `d` instead of searching for a `dd` that does not exist.
 */
export const press = (
  buffer: TypeaheadBuffer,
  char: string,
  now: number,
): TypeaheadBuffer => {
  const letter = char.toLowerCase();
  if (buffer.text === "" || now - buffer.at > TYPEAHEAD_WINDOW_MS) {
    return { text: letter, at: now };
  }
  const repeating = [...buffer.text].every((seen) => seen === letter);
  return repeating
    ? { text: buffer.text, at: now }
    : { text: `${buffer.text}${letter}`, at: now };
};

/**
 * The row a prefix jumps to: the first **enabled** row after `current` whose
 * `searchText` starts with it, wrapping. `null` when nothing matches — a row
 * with no `searchText` is skipped rather than guessed from its title.
 */
export const typeaheadMatch = (
  rows: ReadonlyArray<PreviewListRow>,
  current: string | null,
  prefix: string,
): string | null => {
  const needle = prefix.trim().toLowerCase();
  if (needle === "") return null;

  const at =
    current === null ? -1 : rows.findIndex((row) => row.value === current);
  const from = at + 1;
  const ordered = [...rows.slice(from), ...rows.slice(0, from)];
  const match = ordered.find(
    (row) =>
      row.disabled !== true &&
      (row.searchText ?? "").trim() !== "" &&
      (row.searchText ?? "").trim().toLowerCase().startsWith(needle),
  );
  return match?.value ?? null;
};

/** Add a value when absent, remove it when present; first-added order kept. */
export const toggle = (
  selected: ReadonlyArray<string>,
  value: string,
): ReadonlyArray<string> =>
  selected.includes(value)
    ? selected.filter((candidate) => candidate !== value)
    : [...selected, value];

/** Every enabled row's value, in declaration order. */
export const selectAll = (
  rows: ReadonlyArray<PreviewListRow>,
): ReadonlyArray<string> =>
  rows.filter((row) => row.disabled !== true).map((row) => row.value);

/**
 * Every enabled value between `anchor` and `target` inclusive, in row order:
 * `[target]` when the anchor is absent or disabled, `[]` when the target is a
 * disabled row, so a disabled row can never enter a selection.
 */
export const range = (
  rows: ReadonlyArray<PreviewListRow>,
  anchor: string,
  target: string,
): ReadonlyArray<string> => {
  const to = rows.findIndex((row) => row.value === target);
  if (to === -1 || rows[to]?.disabled === true) return [];

  const from = rows.findIndex((row) => row.value === anchor);
  if (from === -1 || rows[from]?.disabled === true) return [target];

  return rows
    .slice(Math.min(from, to), Math.max(from, to) + 1)
    .filter((row) => row.disabled !== true)
    .map((row) => row.value);
};

/** Whether two selections hold the same members, ignoring order. */
export const sameValues = (
  left: ReadonlyArray<string>,
  right: ReadonlyArray<string>,
): boolean =>
  left.length === right.length && left.every((value) => right.includes(value));
