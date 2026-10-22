/**
 * The command-palette preview's matcher and row model.
 *
 * The native palette ranks with `packages/components/src/menu/fuzzy.ts`, and the
 * browser preview repeats that rule rather than approximating it: a query
 * matches when its characters appear in order in the label, a match scores ten
 * points a character, eight more when the character starts a word and two per
 * character in the current consecutive run, and the ranked matches are then
 * ordered by group — the caller's group order survives, so a heading never
 * repeats because a lower group happened to score higher.
 *
 * "Which row does `Enter` run" is the part a reader cannot check by looking at a
 * palette, so the arithmetic lives here rather than inside the rendering. The
 * palette's own visual and keyboard behaviour is the component's; this module
 * only decides the rows.
 */

export interface CommandAction {
  readonly id: string;
  readonly label: string;
  readonly group: string;
  readonly shortcut?: string;
  /** Shown, never runnable: the palette keeps a disabled row visible. */
  readonly disabled?: boolean;
}

/** The palette a workspace editor would ship, in declaration order. */
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

/** The word a character can continue; anything else starts a new word. */
const wordCharacter = /[a-z0-9]/;

const isWordStart = (text: string, index: number): boolean =>
  index === 0 || !wordCharacter.test(text.charAt(index - 1));

interface Scan {
  /** Where the next character is searched from. */
  readonly at: number;
  readonly score: number;
  /** Matched characters in the current consecutive run. */
  readonly streak: number;
}

const scanCharacter = (
  text: string,
  state: Scan,
  character: string,
): Scan | undefined => {
  const at = text.indexOf(character, state.at);
  if (at === -1) return undefined;
  // A skipped character ends the run, so its bonus restarts at zero.
  const streak = at === state.at ? state.streak : 0;
  const bonus = isWordStart(text, at) ? 8 : streak * 2;
  return { at: at + 1, score: state.score + 10 + bonus, streak: streak + 1 };
};

/**
 * A case-insensitive subsequence score for `query` in `text`, or `undefined`
 * when the query is not a subsequence. An empty query scores `0`.
 */
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

/**
 * The rows the palette shows for a query, in the order it shows them: groups by
 * their first appearance in the action list, each group ranked by score and
 * then declaration order. An empty query keeps declaration order.
 */
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

/**
 * The row an arrow key moves the highlight to, or `undefined` when every match
 * is disabled. A disabled row is shown but never a target, and the ends wrap —
 * `delta` is `1` for `ArrowDown` and `-1` for `ArrowUp`.
 */
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

/** The first row a freshly typed query highlights: the first runnable match. */
export const firstEnabled = (
  rows: ReadonlyArray<CommandAction>,
): string | undefined => rows.find((row) => row.disabled !== true)?.id;
