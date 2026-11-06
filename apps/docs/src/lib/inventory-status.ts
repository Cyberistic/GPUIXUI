import type { Inventory, InventoryRow } from "./inventory";
import { gitConfig } from "./shared";

export interface PageRef {
  readonly title: string;

  readonly url?: string;
}

export const pageRows: Readonly<Record<string, ReadonlyArray<string>>> = {
  Box: ["Boxes / containers"],

  Bubble: ["Bubble"],
  Bubbles: ["Bubbles"],
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

  Table: [
    "Tables",
    "Column configuration",
    "Resizable columns",
    "Filtering controls",
  ],
  "Frozen columns": ["Tables"],
  "Table sorting": ["Sortable tables"],
  "Table selection": ["Row selection"],

  Virtualization: ["Virtualized lists", "Virtualized tables"],
  "Virtual trees": ["Virtualized hierarchical data"],

  "Docking layouts": [
    "Docking layouts",
    "Tabbed panels",
    "Nested panel arrangements",
    "Persistent panel state",
  ],
  "Split pane": ["Resizable split panes"],

  "Property panels": ["Property panels"],

  "Code editor": ["Code editor integration"],
  MarkdownEditor: ["Rich-text editing"],
  MediaPlayer: ["Video / audio player + waveform"],
  DropZone: ["File / folder selection"],
};

export const pageRowsByUrl: Readonly<Record<string, ReadonlyArray<string>>> = {
  "/files/property-panel": ["Inspector panels", "Property editors"],
};

export const withoutRow: ReadonlyArray<{
  readonly title: string;
  readonly reason: string;
}> = [
  {
    title: "ThemeProvider",
    reason: "a provider, not a component: it has no inventory row",
  },
];

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
    file: "docs/gpuix-capabilities.md",
    reason:
      "a sidebar is a composition of the dock's layout and the motion width; the clip that makes it a sidebar is measured, not shipped as a component",
  },
  {
    row: "Keyboard navigation",
    file: "docs/gpuix-capabilities.md",
    reason:
      "real native focus is the runtime's; the roving-focus model is the composition each shipped family carries rather than one component",
  },
  {
    row: "Command palette",
    file: "packages/components/docs/command-menu.mdx",
    reason:
      "the palette is the shipped CommandMenu plus a window shortcut the app binds; the package page teaches that composition",
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
    row: "Native window",
    file: "apps/docs/content/docs/platform/native-window.mdx",
    reason:
      "the window is the OS's surface the app paints its chrome under, so it is taught in the Platform section beside the window's verbs",
  },
  {
    row: "Source list",
    file: "apps/docs/content/docs/platform/native-window.mdx",
    reason:
      "the sidebar list exists to sit under the window's traffic lights, so the Window page teaches both",
  },
  {
    row: "Syntax highlighting",
    file: "docs/gpuix-capabilities.md",
    reason:
      "a host capability rather than a component: <code> and <diff> paint the highlighted view, and CodeBlock/CodeEditor compose them",
  },
];

export const inventoryUrl = `https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/.agents/slop/COMPONENTS.md`;

export type PageStatus =
  | { readonly kind: "row"; readonly row: InventoryRow }
  | { readonly kind: "none"; readonly reason: string };

const key = (text: string): string =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, "");

const stem = (text: string): string => {
  const normalised = key(text);
  return normalised.endsWith("s") ? normalised.slice(0, -1) : normalised;
};

const refOf = (page: PageRef | string): PageRef =>
  typeof page === "string" ? { title: page } : page;

const namedRows = (page: PageRef): ReadonlyArray<string> | undefined =>
  (page.url === undefined ? undefined : pageRowsByUrl[page.url]) ??
  pageRows[page.title];

export const rowsForPage = (
  inventory: Inventory,
  page: PageRef | string,
): ReadonlyArray<InventoryRow> => {
  const ref = refOf(page);
  const named = namedRows(ref);
  if (named === undefined) {
    return inventory.rows.filter((row) => stem(row.name) === stem(ref.title));
  }

  return named.flatMap((name) =>
    inventory.rows.filter((row) => row.name === name),
  );
};

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
    return {
      kind: "none",
      reason: ".agents/slop/COMPONENTS.md has no row for this page",
    };
  }

  if (namedRows(ref) === undefined && rows.length > 1) {
    throw new Error(
      `inventory: "${ref.title}" names ${rows.length} rows (${rows
        .map((candidate) => candidate.name)
        .join(", ")}); add it to the alias table in inventory-status.ts`,
    );
  }
  return { kind: "row", row };
};
