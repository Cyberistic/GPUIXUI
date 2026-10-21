/**
 * The dropdown-menu preview's row model.
 *
 * The browser preview mirrors the native component's arrow-key contract: the
 * highlight *is* the focus, disabled rows are skipped, the ends wrap, and an
 * unhighlighted menu starts at the first row for `ArrowDown` and the last for
 * `ArrowUp`. That arithmetic is the part a reader cannot check by looking at the
 * preview, so it lives here — plain data and a pure function — rather than inside
 * the rendering.
 *
 * `null` is "no row is highlighted": browser focus state on a docs preview, not a
 * domain absence.
 */

export interface MenuEntry {
  readonly id: "rename" | "duplicate" | "hidden" | "delete";
  readonly label: string;
  readonly disabled?: boolean;
  readonly tone?: "destructive";
}

/** The menu's rows, in the order the native component declares them. */
export const menuEntries: ReadonlyArray<MenuEntry> = [
  { id: "rename", label: "Rename" },
  { id: "duplicate", label: "Duplicate", disabled: true },
  { id: "hidden", label: "Show hidden files" },
  { id: "delete", label: "Delete", tone: "destructive" },
];

/** The rows an arrow key may land on: a disabled row is never a target. */
export const enabledEntries: ReadonlyArray<MenuEntry> = menuEntries.filter(
  (entry) => entry.disabled !== true,
);

/**
 * The row an arrow key moves the highlight to, or `null` when nothing is
 * enabled. `delta` is `1` for `ArrowDown` and `-1` for `ArrowUp`.
 */
export const highlightAfter = (
  current: MenuEntry["id"] | null,
  delta: 1 | -1,
): MenuEntry["id"] | null => {
  if (enabledEntries.length === 0) return null;
  const index =
    current === null
      ? -1
      : enabledEntries.findIndex((entry) => entry.id === current);
  const next =
    delta === 1
      ? (index + 1) % enabledEntries.length
      : index <= 0
        ? enabledEntries.length - 1
        : index - 1;

  return enabledEntries[next]?.id ?? null;
};
