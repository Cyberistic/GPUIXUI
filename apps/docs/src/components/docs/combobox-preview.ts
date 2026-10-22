/**
 * The combobox preview's ranking and highlight arithmetic.
 *
 * The shipped `Combobox` ranks the options itself: a label that starts with the
 * query beats a word that starts with it, which beats a substring, which beats
 * a description. GPUix's own `filter` is an order-preserving predicate, so the
 * component feeds the runtime an already-ranked list — a browser preview that
 * filtered in place, kept disabled rows out, or invented a selection from the
 * query would teach behaviour the component does not have. `null` is "no row is
 * highlighted": browser focus state on a docs preview, not a domain absence.
 */

/** One option, in the shape `Combobox` takes as data. */
export interface PreviewComboboxOption {
  readonly value: string;
  readonly label: string;
  readonly description?: string;
  readonly disabled?: boolean;
}

const normalise = (value: string): string => value.trim().toLowerCase();

const wordStarts = (haystack: string, needle: string): boolean =>
  haystack.split(" ").some((word) => word.startsWith(needle));

/**
 * The rank a label earns for a query, or `null` when it does not match at all.
 * Lower is better; a blank query matches every option at rank 0.
 */
export const rankOf = (
  option: PreviewComboboxOption,
  query: string,
): number | null => {
  const needle = normalise(query);
  if (needle === "") return 0;

  const label = normalise(option.label);
  if (label.startsWith(needle)) return 0;
  if (wordStarts(label, needle)) return 1;
  if (label.includes(needle)) return 2;
  if (normalise(option.description ?? "").includes(needle)) return 3;
  return null;
};

/** The ranks, best first: the order the rows are emitted in. */
const ranks = [0, 1, 2, 3] as const;

/**
 * The rows to show for a query, best match first. Ties keep declaration order,
 * and a disabled option stays visible — it is unselectable, not hidden.
 */
export const visibleOptions = (
  options: ReadonlyArray<PreviewComboboxOption>,
  query: string,
): ReadonlyArray<PreviewComboboxOption> =>
  ranks.flatMap((rank) =>
    options.filter((option) => rankOf(option, query) === rank),
  );

const enabled = (
  options: ReadonlyArray<PreviewComboboxOption>,
): ReadonlyArray<PreviewComboboxOption> =>
  options.filter((option) => option.disabled !== true);

/** The row the auto-highlight lands on: the first match that can be chosen. */
export const firstEnabled = (
  options: ReadonlyArray<PreviewComboboxOption>,
): string | null => enabled(options)[0]?.value ?? null;

/**
 * The row an arrow moves to: disabled rows are skipped and the move wraps at
 * either end. `null` when nothing is enabled, or when the list is empty.
 */
export const nextHighlight = (
  options: ReadonlyArray<PreviewComboboxOption>,
  current: string | null,
  delta: 1 | -1,
): string | null => {
  const reachable = enabled(options);
  const first = reachable[0];
  const last = reachable.at(-1);
  if (first === undefined || last === undefined) return null;

  const index = reachable.findIndex((option) => option.value === current);
  if (index === -1) return delta === 1 ? first.value : last.value;

  const next = reachable[(index + delta + reachable.length) % reachable.length];
  return next === undefined ? null : next.value;
};

/**
 * The selection after a press: a new value is appended, so the chosen order is
 * the order the reader picked, and a second press removes it.
 */
export const toggleSelection = (
  selected: ReadonlyArray<string>,
  value: string,
): ReadonlyArray<string> =>
  selected.includes(value)
    ? selected.filter((candidate) => candidate !== value)
    : [...selected, value];

/** Whether the query should offer the create row: text, no match, single mode. */
export const offersCreate = (
  visible: ReadonlyArray<PreviewComboboxOption>,
  query: string,
  canCreate: boolean,
): boolean => canCreate && query.trim() !== "" && visible.length === 0;

/**
 * The sentinel a create row's value starts with.
 *
 * The shipped `Combobox` uses a NUL-prefixed value for the same reason: a typed
 * query cannot produce it, so the row can never be mistaken for a caller's
 * option. The preview mirrors the value shape so a copied snippet and the
 * drawing agree.
 */
export const CREATE_ROW_PREFIX = "\u0000create\u0000";

/** Whether a row's value is the preview's create row. */
export const isCreateRow = (value: string): boolean =>
  value.startsWith(CREATE_ROW_PREFIX);

/** The query a create row's value carries. */
export const createQuery = (value: string): string =>
  value.slice(CREATE_ROW_PREFIX.length);

/** The row a query may create, labelled the way the default `createLabel` is. */
export const createRowFor = (query: string): PreviewComboboxOption => {
  const create = query.trim();
  return {
    value: `${CREATE_ROW_PREFIX}${create}`,
    label: `Create "${create}"`,
  };
};

/** The label an option shows; the component falls back to its value. */
export const labelOf = (option: PreviewComboboxOption): string =>
  option.label.trim() === "" ? option.value : option.label;

/** The trigger's text: the chosen labels joined by a comma, or its placeholder. */
export const triggerLabel = (
  options: ReadonlyArray<PreviewComboboxOption>,
  selected: ReadonlyArray<string>,
  placeholder: string,
): string =>
  selected.length === 0
    ? placeholder
    : selected
        .map(
          (value) =>
            options.find((option) => option.value === value)?.label ?? value,
        )
        .join(", ");
