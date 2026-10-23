import type { Inventory, InventoryRow } from "./inventory";
import { gitConfig } from "./shared";

/**
 * The inventory row a package page reports.
 *
 * `COMPONENTS.md` is the only place a component's status and its GPUix support
 * verdict are decided. A page that does not say either lets a reader assume the
 * component is shipped and whole, so every mounted package page carries a strip
 * generated from its row. The page title is the join: most titles match their
 * row once punctuation and a plural are normalised, and the titles whose row
 * reads differently — or that publish more than one row — are named below.
 */

/**
 * The rows a page publishes, primary first.
 *
 * The first row is the one its status strip reports. A page may publish more
 * than one row because it documents a composition: the table page teaches the
 * column menu, the resize strip and the filter field beside the grid, and the
 * dock page teaches its tabs, its nesting and its persistence. Every name here
 * must be a `COMPONENTS.md` row, and every shipped row must be published by
 * some page — `inventory-status.test.ts` holds both directions.
 */
export const pageRows: Readonly<Record<string, ReadonlyArray<string>>> = {
  Box: ["Boxes / containers"],
  Checkbox: ["Checkboxes"],
  Collapsible: ["Collapsible sections"],
  Combobox: ["Comboboxes"],
  "Field and inline validation": ["Inline validation"],
  "Hotkey recorder": ["Hotkey-recorder input"],
  Input: ["Text inputs"],
  "Keyboard shortcuts": ["Keyboard shortcuts / keycap display"],
  List: ["Lists / list items"],
  ScrollArea: ["Scrollable containers"],
  Spinner: ["Loading indicators"],
  Stack: ["Stack / layout primitives"],
  Switch: ["Switches"],
  "Tag input": ["Tag / token input"],
  Text: ["Text / typography"],
  Toast: ["Toasts / notifications", "Notification centre"],

  // The table the site curates documents the three Tier 3 rows composed on it.
  Table: [
    "Tables",
    "Column configuration",
    "Resizable columns",
    "Filtering controls",
  ],
  "Frozen columns": ["Tables"],
  "Table sorting": ["Sortable tables"],
  "Table selection": ["Row selection"],

  // One page, two windowed surfaces.
  Virtualization: ["Virtualized lists", "Virtualized tables"],
  "Virtual trees": ["Virtualized hierarchical data"],

  // The dock page publishes the tab, nesting and persistence rows it composes.
  "Docking layouts": [
    "Docking layouts",
    "Tabbed panels",
    "Nested panel arrangements",
    "Persistent panel state",
  ],
  "Split pane": ["Resizable split panes"],

  // A property panel is the inspector and its editors on one page.
  "Property panels": [
    "Property panels",
    "Inspector panels",
    "Property editors",
  ],

  "Code editor": ["Code editor integration"],
  DropZone: ["File / folder selection"],
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

/**
 * Shipped rows a lane page documents instead of a component page.
 *
 * A lane page is not a component: it carries no status strip, so it cannot be
 * one of `pageRows`. The row it documents names the file that teaches it and
 * the probe the file cites, because a row recorded here without a page stating
 * its measurement is the gap this table exists to prevent.
 */
export const laneRows: ReadonlyArray<{
  readonly row: string;
  readonly file: string;
  readonly cites: string;
  readonly reason: string;
}> = [
  {
    row: "Drag and drop",
    file: "apps/docs/content/docs/data-display/index.mdx",
    cites: "drag-reorder",
    reason:
      "a reorder is the caller's own pointer gesture; no shipped component paints one",
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

/**
 * Every row a page's title publishes, primary first.
 *
 * A title named in `pageRows` publishes its rows outright; any other title must
 * match one row once punctuation and a trailing plural are dropped.
 */
export const rowsForPage = (
  inventory: Inventory,
  title: string,
): ReadonlyArray<InventoryRow> => {
  const named = pageRows[title];
  if (named === undefined) {
    return inventory.rows.filter((row) => stem(row.name) === stem(title));
  }
  // The declared order is the primary-first order the strip reads, so it must
  // not fall back to the inventory's own ordering.
  return named.flatMap((name) =>
    inventory.rows.filter((row) => row.name === name),
  );
};

/** The shipped rows no page publishes, by name. */
export const unpublishedRows = (
  inventory: Inventory,
  titles: ReadonlyArray<string>,
): ReadonlyArray<string> => {
  const published = new Set(
    titles.flatMap((title) =>
      rowsForPage(inventory, title).map((row) => row.name),
    ),
  );
  const laneOnly = new Set(laneRows.map((entry) => entry.row));

  return inventory.rows
    .filter((row) => row.status.startsWith("done"))
    .filter((row) => !published.has(row.name) && !laneOnly.has(row.name))
    .map((row) => row.name);
};

/**
 * The status a page reports.
 *
 * The first row a title publishes is the one its strip reports. An ambiguous
 * title throws instead of guessing: a page that reported the wrong component's
 * verdict would be worse than one that reported none, and
 * `inventory-status.test.ts` holds every mounted page to one row.
 */
export const statusForPage = (
  inventory: Inventory,
  title: string,
): PageStatus => {
  const exempt = withoutRow.find((page) => page.title === title);
  if (exempt !== undefined) return { kind: "none", reason: exempt.reason };

  const rows = rowsForPage(inventory, title);
  const [row] = rows;
  if (row === undefined) {
    return { kind: "none", reason: "COMPONENTS.md has no row for this page" };
  }
  // A title in `pageRows` names its rows on purpose; one that matched several
  // by itself is ambiguous and must be aliased rather than silently reading the
  // first.
  if (pageRows[title] === undefined && rows.length > 1) {
    throw new Error(
      `inventory: "${title}" names ${rows.length} rows (${rows
        .map((candidate) => candidate.name)
        .join(", ")}); add it to the alias table in inventory-status.ts`,
    );
  }
  return { kind: "row", row };
};
