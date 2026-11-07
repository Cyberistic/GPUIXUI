export interface PreviewOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

export interface PreviewGroup {
  readonly label: string;
  readonly options: ReadonlyArray<PreviewOption>;
}

export type PreviewEntry = PreviewOption | PreviewGroup;

export const isGroup = (entry: PreviewEntry): entry is PreviewGroup =>
  "options" in entry;

export const flatten = (
  entries: ReadonlyArray<PreviewEntry>,
): ReadonlyArray<PreviewOption> =>
  entries.flatMap((entry) => (isGroup(entry) ? entry.options : [entry]));

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

export const selectedLabel = (
  entries: ReadonlyArray<PreviewEntry>,
  value: string | null,
): string | null =>
  flatten(entries).find((option) => option.value === value)?.label ?? null;
