export interface PreviewComboboxOption {
  readonly value: string;
  readonly label: string;
  readonly description?: string;
  readonly disabled?: boolean;
}

const normalise = (value: string): string => value.trim().toLowerCase();

const wordStarts = (haystack: string, needle: string): boolean =>
  haystack.split(" ").some((word) => word.startsWith(needle));

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

const ranks = [0, 1, 2, 3] as const;

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

export const firstEnabled = (
  options: ReadonlyArray<PreviewComboboxOption>,
): string | null => enabled(options)[0]?.value ?? null;

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

export const toggleSelection = (
  selected: ReadonlyArray<string>,
  value: string,
): ReadonlyArray<string> =>
  selected.includes(value)
    ? selected.filter((candidate) => candidate !== value)
    : [...selected, value];

export const offersCreate = (
  visible: ReadonlyArray<PreviewComboboxOption>,
  query: string,
  canCreate: boolean,
): boolean => canCreate && query.trim() !== "" && visible.length === 0;

export const CREATE_ROW_PREFIX = "\u0000create\u0000";

export const isCreateRow = (value: string): boolean =>
  value.startsWith(CREATE_ROW_PREFIX);

export const createQuery = (value: string): string =>
  value.slice(CREATE_ROW_PREFIX.length);

export const createRowFor = (query: string): PreviewComboboxOption => {
  const create = query.trim();
  return {
    value: `${CREATE_ROW_PREFIX}${create}`,
    label: `Create "${create}"`,
  };
};

export const labelOf = (option: PreviewComboboxOption): string =>
  option.label.trim() === "" ? option.value : option.label;

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
