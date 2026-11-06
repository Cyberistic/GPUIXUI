export interface CommandAction {
  readonly id: string;
  readonly label: string;
  readonly group: string;
  readonly shortcut?: string;

  readonly disabled?: boolean;
}

export const commandActions: ReadonlyArray<CommandAction> = [
  { id: "new-file", label: "New file", group: "File", shortcut: "⌘N" },
  { id: "open-file", label: "Open file", group: "File", shortcut: "⌘O" },
  {
    id: "reopen-file",
    label: "Reopen closed tab",
    group: "File",
    shortcut: "⇧⌘T",
  },
  { id: "save", label: "Save", group: "File", shortcut: "⌘S" },
  {
    id: "restore",
    label: "Restore last session",
    group: "File",
    disabled: true,
  },
  {
    id: "find",
    label: "Find and replace",
    group: "Edit",
    shortcut: "⌘H",
  },
  { id: "comment", label: "Toggle comment", group: "Edit", shortcut: "⌘/" },
  { id: "sidebar", label: "Toggle sidebar", group: "View", shortcut: "⌘B" },
  { id: "panel", label: "Toggle panel", group: "View", shortcut: "⌘J" },
  { id: "split", label: "Split editor", group: "View" },
  { id: "line", label: "Go to line", group: "Navigate", shortcut: "⌃G" },
  { id: "symbol", label: "Go to symbol", group: "Navigate", shortcut: "⌘T" },
];

const wordCharacter = /[a-z0-9]/;

const isWordStart = (text: string, index: number): boolean =>
  index === 0 || !wordCharacter.test(text.charAt(index - 1));

interface Scan {
  readonly at: number;
  readonly score: number;

  readonly streak: number;
}

const scanCharacter = (
  text: string,
  state: Scan,
  character: string,
): Scan | undefined => {
  const at = text.indexOf(character, state.at);
  if (at === -1) return undefined;

  const streak = at === state.at ? state.streak : 0;
  const bonus = isWordStart(text, at) ? 8 : streak * 2;
  return { at: at + 1, score: state.score + 10 + bonus, streak: streak + 1 };
};

export const fuzzyScore = (query: string, text: string): number | undefined => {
  const wanted = query.trim().toLowerCase();
  const haystack = text.trim().toLowerCase();
  if (wanted.length === 0) return 0;

  return [...wanted].reduce<Scan | undefined>(
    (state, character) =>
      state === undefined
        ? undefined
        : scanCharacter(haystack, state, character),
    { at: 0, score: 0, streak: 0 },
  )?.score;
};

export const commandMatches = (query: string): ReadonlyArray<CommandAction> => {
  const scored = commandActions.flatMap((action, index) => {
    const score = fuzzyScore(query, action.label);
    return score === undefined ? [] : [{ action, score, index }];
  });
  const groups = [...new Set(scored.map(({ action }) => action.group))];

  return groups.flatMap((group) =>
    scored
      .filter(({ action }) => action.group === group)
      .toSorted(
        (left, right) => right.score - left.score || left.index - right.index,
      )
      .map(({ action }) => action),
  );
};

export const nextEnabled = (
  rows: ReadonlyArray<CommandAction>,
  current: string | null,
  delta: 1 | -1,
): string | undefined => {
  const enabled = rows.filter((row) => row.disabled !== true);
  if (enabled.length === 0) return undefined;
  const index = enabled.findIndex((row) => row.id === current);
  const next =
    delta === 1
      ? (index + 1) % enabled.length
      : index <= 0
        ? enabled.length - 1
        : index - 1;

  return enabled[next]?.id;
};

export const firstEnabled = (
  rows: ReadonlyArray<CommandAction>,
): string | undefined => rows.find((row) => row.disabled !== true)?.id;
