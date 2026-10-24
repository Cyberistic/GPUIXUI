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
 *
 * A title is not an identity. Two packages can ship a component of the same
 * name (`PropertyPanel` is in `@gpuixui/data` and `@gpuixui/files`), so two
 * mounted pages can carry one title while the inventory keeps a row per
 * component. The address is what the two pages do not share, so a page whose
 * row its title cannot name is pinned by address in {@link pageRowsByUrl}.
 */

/** A page as the strip, the index and the inventory's publication rule name it. */
export interface PageRef {
  /** The page's frontmatter title. */
  readonly title: string;
  /**
   * The page's address. Omitted by a caller that has only a title and means
   * whatever that title publishes; present on a page, because a title two pages
   * share cannot identify one.
   */
  readonly url?: string;
}

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

  // The `@gpuixui/data` panel: the rows that describe one object. The
  // `@gpuixui/files` panel shares the title and is pinned to its own rows below.
  "Property panels": ["Property panels"],

  "Code editor": ["Code editor integration"],
  MarkdownEditor: ["Rich-text editing"],
  MediaPlayer: ["Video / audio player + waveform"],
  DropZone: ["File / folder selection"],
};

/**
 * The rows a page publishes when its title cannot name them, by address.
 *
 * Both `@gpuixui/data` and `@gpuixui/files` ship a `PropertyPanel`, so their
 * pages carry the same title while the inventory keeps the data panel's row and
 * the two rows the files panel answers for — the inspector it fills and the
 * editors it holds. Without this table the files page reported the **data**
 * package's verdict, and the files rows were credited to a page that does not
 * document them. Every address here must be a mounted page whose rows are not
 * the ones its title already publishes; `inventory-status.test.ts` holds both
 * directions.
 */
export const pageRowsByUrl: Readonly<Record<string, ReadonlyArray<string>>> = {
  "/docs/files/property-panel": ["Inspector panels", "Property editors"],
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
 * the reason it is composition rather than a component.
 */
export const laneRows: ReadonlyArray<{
  readonly row: string;
  readonly file: string;
  readonly reason: string;
}> = [
  {
    row: "Drag and drop",
    file: "apps/docs/content/docs/data-display/index.mdx",
    reason:
      "a reorder is the caller's own pointer gesture; no shipped component paints one",
  },
  {
    row: "Collapsible sidebars",
    file: "apps/docs/content/docs/runtime.mdx",
    reason:
      "a sidebar is a composition of the dock's layout and the motion width; the clip that makes it a sidebar is measured, not shipped as a component",
  },
  {
    row: "Keyboard navigation",
    file: "apps/docs/content/docs/runtime.mdx",
    reason:
      "real native focus is the runtime's; the roving-focus model is the composition each shipped family carries rather than one component",
  },
  {
    row: "Command palette",
    file: "apps/docs/content/docs/patterns.mdx",
    reason:
      "the palette is the shipped CommandMenu plus a window shortcut the app binds; the patterns page teaches that composition",
  },
  {
    row: "Breadcrumb navigation",
    file: "packages/components/docs/breadcrumb.mdx",
    reason:
      "the trail is the shipped Breadcrumb and the routing is the app's; the package page records the narrow-pane measurement",
  },
  {
    row: "Multi-pane editing layouts",
    file: "apps/docs/content/docs/workspace/index.mdx",
    reason:
      "a composition of SplitPane and an editor field per pane; the window holds one platform text session, and the page teaches the press that moves it and the divider that parks it",
  },
  {
    row: "Workspace layouts",
    file: "apps/docs/content/docs/workspace/index.mdx",
    reason:
      "the dock tree plus the app's stored arrangement; the page teaches the schema, the default on a decode failure and the re-mount the one-window runtime allows",
  },
  {
    row: "Detachable / movable tabs",
    file: "apps/docs/content/docs/workspace/index.mdx",
    reason:
      "the shipped Tabs plus the caller's drag state; the page teaches the move between strips, the one-process window and the portal route a detached tab cannot take",
  },
  {
    row: "Syntax highlighting",
    file: "apps/docs/content/docs/runtime.mdx",
    reason:
      "a host capability rather than a component: <code> and <diff> paint the highlighted view, and CodeBlock/CodeEditor compose them",
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

/** A page named once: a title, or a title and the address that separates it. */
const refOf = (page: PageRef | string): PageRef =>
  typeof page === "string" ? { title: page } : page;

/** The rows a page names outright, address pin first, title alias second. */
const namedRows = (page: PageRef): ReadonlyArray<string> | undefined =>
  (page.url === undefined ? undefined : pageRowsByUrl[page.url]) ??
  pageRows[page.title];

/**
 * Every row a page publishes, primary first.
 *
 * A page pinned by address publishes the rows in `pageRowsByUrl`; a page named
 * in `pageRows` publishes its rows outright; any other title must match one row
 * once punctuation and a trailing plural are dropped.
 */
export const rowsForPage = (
  inventory: Inventory,
  page: PageRef | string,
): ReadonlyArray<InventoryRow> => {
  const ref = refOf(page);
  const named = namedRows(ref);
  if (named === undefined) {
    return inventory.rows.filter((row) => stem(row.name) === stem(ref.title));
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
  pages: ReadonlyArray<PageRef | string>,
): ReadonlyArray<string> => {
  const published = new Set(
    pages.flatMap((page) =>
      rowsForPage(inventory, page).map((row) => row.name),
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
 * The first row a page publishes is the one its strip reports. An ambiguous
 * title throws instead of guessing: a page that reported the wrong component's
 * verdict would be worse than one that reported none, and
 * `inventory-status.test.ts` holds every mounted page to one row.
 */
export const statusForPage = (
  inventory: Inventory,
  page: PageRef | string,
): PageStatus => {
  const ref = refOf(page);
  const exempt = withoutRow.find((entry) => entry.title === ref.title);
  if (exempt !== undefined) return { kind: "none", reason: exempt.reason };

  const rows = rowsForPage(inventory, ref);
  const [row] = rows;
  if (row === undefined) {
    return { kind: "none", reason: "COMPONENTS.md has no row for this page" };
  }
  // A page in either alias table names its rows on purpose; one that matched
  // several by itself is ambiguous and must be aliased rather than silently
  // reading the first.
  if (namedRows(ref) === undefined && rows.length > 1) {
    throw new Error(
      `inventory: "${ref.title}" names ${rows.length} rows (${rows
        .map((candidate) => candidate.name)
        .join(", ")}); add it to the alias table in inventory-status.ts`,
    );
  }
  return { kind: "row", row };
};
