export interface PreviewListRow {
  readonly value: string;
  readonly title: string;
  readonly description?: string;

  readonly trailing?: string;
  readonly disabled?: boolean;

  readonly searchText?: string;
}

const enabledIndexes = (
  rows: ReadonlyArray<PreviewListRow>,
): ReadonlyArray<number> =>
  rows.flatMap((row, index) => (row.disabled === true ? [] : [index]));

const valueAt = (
  rows: ReadonlyArray<PreviewListRow>,
  index: number,
): string | null => rows[index]?.value ?? null;

export const firstRow = (
  rows: ReadonlyArray<PreviewListRow>,
): string | null => {
  const [first] = enabledIndexes(rows);
  return first === undefined ? null : valueAt(rows, first);
};

export const lastRow = (rows: ReadonlyArray<PreviewListRow>): string | null => {
  const enabled = enabledIndexes(rows);
  const last = enabled[enabled.length - 1];
  return last === undefined ? null : valueAt(rows, last);
};

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

  const beyond =
    delta > 0
      ? enabled.find((index) => index > at)
      : [...enabled].reverse().find((index) => index < at);
  return valueAt(rows, beyond ?? (delta > 0 ? first : last));
};

export const TYPEAHEAD_WINDOW_MS = 500;

export interface TypeaheadBuffer {
  readonly text: string;
  readonly at: number;
}

export const IDLE: TypeaheadBuffer = { text: "", at: 0 };

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

export const toggle = (
  selected: ReadonlyArray<string>,
  value: string,
): ReadonlyArray<string> =>
  selected.includes(value)
    ? selected.filter((candidate) => candidate !== value)
    : [...selected, value];

export const selectAll = (
  rows: ReadonlyArray<PreviewListRow>,
): ReadonlyArray<string> =>
  rows.filter((row) => row.disabled !== true).map((row) => row.value);

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

export const sameValues = (
  left: ReadonlyArray<string>,
  right: ReadonlyArray<string>,
): boolean =>
  left.length === right.length && left.every((value) => right.includes(value));
