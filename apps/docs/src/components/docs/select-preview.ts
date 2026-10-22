/**
 * The select preview's data and arrow arithmetic.
 *
 * The native `Select` takes its options as data and hands the runtime one flat
 * list, group captions included only as painted headings. The browser preview
 * has to reproduce that flattening and the runtime's own arrow contract — a
 * disabled row is skipped and the move wraps at either end — because a preview
 * that walks the groups, or stops on a disabled row, teaches a keyboard the
 * component does not have. `null` is "no row is highlighted": browser focus
 * state on a docs preview, not a domain absence.
 */

export interface PreviewOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

/** A named run of options, painted under a caption and a rule. */
export interface PreviewGroup {
  readonly label: string;
  readonly options: ReadonlyArray<PreviewOption>;
}

/** One entry in the list: an option, or a named group of them. */
export type PreviewEntry = PreviewOption | PreviewGroup;

/** Whether an entry is a named group rather than one option. */
export const isGroup = (entry: PreviewEntry): entry is PreviewGroup =>
  "options" in entry;

/** Every option in render order. The runtime receives one flat list. */
export const flatten = (
  entries: ReadonlyArray<PreviewEntry>,
): ReadonlyArray<PreviewOption> =>
  entries.flatMap((entry) => (isGroup(entry) ? entry.options : [entry]));

/**
 * The row an arrow moves to: disabled rows are skipped and the move wraps at
 * either end. `null` when nothing is enabled, or when the list is empty.
 */
export const nextEnabled = (
  entries: ReadonlyArray<PreviewEntry>,
  current: string | null,
  delta: 1 | -1,
): string | null => {
  const enabled = flatten(entries).filter((option) => option.disabled !== true);
  const first = enabled[0];
  const last = enabled.at(-1);
  if (first === undefined || last === undefined) return null;

  const index = enabled.findIndex((option) => option.value === current);
  if (index === -1) return delta === 1 ? first.value : last.value;

  return (
    enabled[(index + delta + enabled.length) % enabled.length]?.value ?? null
  );
};

/** The row shown as chosen, or `null` when nothing is selected. */
export const selectedLabel = (
  entries: ReadonlyArray<PreviewEntry>,
  value: string | null,
): string | null =>
  flatten(entries).find((option) => option.value === value)?.label ?? null;
