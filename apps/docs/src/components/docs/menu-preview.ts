export interface MenuEntry {
  readonly id: "rename" | "duplicate" | "hidden" | "delete";
  readonly label: string;
  readonly disabled?: boolean;
  readonly tone?: "destructive";
}

export const menuEntries: ReadonlyArray<MenuEntry> = [
  { id: "rename", label: "Rename" },
  { id: "duplicate", label: "Duplicate", disabled: true },
  { id: "hidden", label: "Show hidden files" },
  { id: "delete", label: "Delete", tone: "destructive" },
];

export const enabledEntries: ReadonlyArray<MenuEntry> = menuEntries.filter(
  (entry) => entry.disabled !== true,
);

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
