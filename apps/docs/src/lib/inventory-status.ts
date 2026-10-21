import type { Inventory, InventoryRow } from "./inventory";
import { gitConfig } from "./shared";

/**
 * The inventory row a package page reports.
 *
 * `COMPONENTS.md` is the only place a component's status and its GPUix support
 * verdict are decided. A page that does not say either lets a reader assume the
 * component is shipped and whole, so every mounted package page carries a strip
 * generated from its row. The page title is the join: most titles match their
 * row once punctuation and a plural are normalised, and the irregular ones are
 * named below.
 */

/** Pages whose title is not the row's name, mapped to that row. */
export const renamedRows: Readonly<Record<string, string>> = {
  Box: "Boxes / containers",
  Checkbox: "Checkboxes",
  Collapsible: "Collapsible sections",
  Combobox: "Comboboxes",
  "Field and inline validation": "Inline validation",
  "Hotkey recorder": "Hotkey-recorder input",
  Input: "Text inputs",
  "Keyboard shortcuts": "Keyboard shortcuts / keycap display",
  List: "Lists / list items",
  ScrollArea: "Scrollable containers",
  Spinner: "Loading indicators",
  Stack: "Stack / layout primitives",
  Switch: "Switches",
  "Tag input": "Tag / token input",
  Text: "Text / typography",
  Toast: "Toasts / notifications",
};

/**
 * Package pages the inventory has no row for, with the reason.
 *
 * The one entry is honest rather than an exception to the rule: a provider is
 * not a component. `Grid` was the second until its Tier 1 row landed, and the
 * guard fails if a third page lands here without being argued in this table.
 */
export const withoutRow: ReadonlyArray<{
  readonly title: string;
  readonly reason: string;
}> = [
  {
    title: "ThemeProvider",
    reason: "a provider, not a component: it has no inventory row",
  },
];

/** The inventory document, the source the strip reads. */
export const inventoryUrl = `https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/COMPONENTS.md`;

/** What a page's status strip shows: its row, or nothing and the reason. */
export type PageStatus =
  | { readonly kind: "row"; readonly row: InventoryRow }
  | { readonly kind: "none"; readonly reason: string };

const key = (text: string): string =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, "");

/** `Switches` and `Switch` are the same row once a trailing plural is dropped. */
const stem = (text: string): string => {
  const normalised = key(text);
  return normalised.endsWith("s") ? normalised.slice(0, -1) : normalised;
};

/** Every row a page's title could name, so an ambiguous title is visible. */
export const rowCandidates = (
  inventory: Inventory,
  title: string,
): ReadonlyArray<InventoryRow> => {
  const name = renamedRows[title];
  return inventory.rows.filter((row) =>
    name === undefined ? stem(row.name) === stem(title) : row.name === name,
  );
};

/**
 * The status a page reports.
 *
 * An ambiguous title throws instead of guessing: a page that reported the wrong
 * component's verdict would be worse than one that reported none, and
 * `inventory-status.test.ts` holds every mounted page to one row.
 */
export const statusForPage = (
  inventory: Inventory,
  title: string,
): PageStatus => {
  const exempt = withoutRow.find((page) => page.title === title);
  if (exempt !== undefined) return { kind: "none", reason: exempt.reason };

  const candidates = rowCandidates(inventory, title);
  const [row] = candidates;
  if (row === undefined) {
    return { kind: "none", reason: "COMPONENTS.md has no row for this page" };
  }
  if (candidates.length > 1) {
    throw new Error(
      `inventory: "${title}" names ${candidates.length} rows (${candidates
        .map((candidate) => candidate.name)
        .join(", ")}); add it to the alias table in inventory-status.ts`,
    );
  }
  return { kind: "row", row };
};
