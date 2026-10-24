import {
  buildFileTree,
  fileIcon,
  fileKindOf,
  type FileKind,
  type FileNode,
} from "@gpuixui/files/tree/logic";
import {
  TREE_INDENT,
  flattenTree,
  treeCursorMove,
  type TreeCursor,
  type TreeKey,
  type TreeRow,
} from "@gpuixui/data/tree/logic";
import {
  emptySelection,
  isSelected,
  pressSelection,
  type SelectionState,
} from "@gpuixui/data/selection/logic";
import type { IconName } from "@gpuixui/icons";
import * as Arr from "effect/Array";
import * as HashSet from "effect/HashSet";
import * as Option from "effect/Option";
import * as Order from "effect/Order";
import { useState, type KeyboardEvent } from "react";
import { BrowserIcon } from "./browser-icon";

/**
 * Browser preview for the File trees page.
 *
 * `@gpuixui/files`' `FileTree` is a GPUix host tree, so the page cannot mount it
 * and this drawing is a labelled approximation. What it does not approximate is
 * the tree's reasoning: the rows are `@gpuixui/files`' `buildFileTree` and
 * `fileIcon`, flattened by `@gpuixui/data`'s `flattenTree`, moved by
 * `treeCursorMove` and chosen by `pressSelection`. Only the paint is the
 * browser's.
 */

/**
 * The workspace the preview opens: one project, three folders and the files a
 * package root holds. The order is the input's; `buildFileTree` sorts it.
 */
export const WORKSPACE_PATHS: ReadonlyArray<string> = [
  "readme.md",
  "package.json",
  "tsconfig.json",
  "src/index.ts",
  "src/app.tsx",
  "src/components/button.tsx",
  "src/components/card.tsx",
  "src/styles/tokens.css",
  "docs/installation.mdx",
  "docs/theming.mdx",
  "assets/logo.svg",
  "assets/screenshot.png",
];

/** The tree the preview draws. */
export const workspaceTree = (): ReadonlyArray<FileNode> =>
  buildFileTree(WORKSPACE_PATHS);

/** The two readers the generic tree asks for; a file has no children. */
export const fileTreeSpec = {
  keyOf: (node: FileNode): string => node.path,
  childrenOf: (node: FileNode): ReadonlyArray<FileNode> => node.children ?? [],
};

/** A row's kind: a folder is one by its children, a file by its extension. */
export const kindOf = (node: FileNode): FileKind =>
  fileKindOf(
    node.name,
    Arr.isReadonlyArrayNonEmpty(fileTreeSpec.childrenOf(node)),
  );

/** The glyph a row paints; an open folder paints the open glyph. */
export const glyphOf = (node: FileNode, expanded: boolean): IconName =>
  fileIcon(kindOf(node), expanded);

/** The rows a reader can see, from the package's own flattening. */
export const fileRows = (
  roots: ReadonlyArray<FileNode>,
  cursor: TreeCursor,
): ReadonlyArray<TreeRow<FileNode>> =>
  flattenTree(roots, fileTreeSpec, cursor.expanded);

/** The cursor the preview opens on: `src` and `docs` open, `src/index.ts` active. */
export const openCursor = (): TreeCursor => ({
  expanded: HashSet.make("src", "docs", "src/components"),
  active: Option.some("src/index.ts"),
});

/** The browser key names the tree answers, and the package's own names for them. */
const TREE_KEYS: Readonly<Record<string, TreeKey>> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowRight: "right",
  ArrowLeft: "left",
  Home: "home",
  End: "end",
  Enter: "enter",
  " ": "space",
};

/** The package key a browser key names, or `None` when it is not the tree's. */
export const treeKeyOf = (key: string): Option.Option<TreeKey> =>
  Option.fromNullishOr(TREE_KEYS[key]);

/** The keys chosen, in the order they are reported. */
export const chosenKeys = (state: SelectionState): ReadonlyArray<string> =>
  Arr.sort(Arr.fromIterable(state.selected), Order.String);

/** The line under the frame: what the tree reports after a press. */
export const selectionReadout = (state: SelectionState): string => {
  const keys = chosenKeys(state);
  return keys.length === 0
    ? "nothing chosen"
    : `${keys.length} chosen: ${keys.join(", ")}`;
};

/** The id a row's element carries, so the tree can name its active row. */
export const rowId = (key: string): string =>
  `gx-filetree-${key.replace(/[^A-Za-z0-9]+/g, "-")}`;

/** The cursor with `key` as the row the keyboard stands on. */
export const withActive = (cursor: TreeCursor, key: string): TreeCursor => ({
  ...cursor,
  active: Option.some(key),
});

export interface FileTreeFrameProps {
  /** The roots to draw, so a test can hand in its own workspace. */
  readonly roots: ReadonlyArray<FileNode>;
  /** The cursor to draw, controlled the way `TreeView` takes it. */
  readonly cursor: TreeCursor;
  /** The chosen keys, controlled the same way. */
  readonly selection: SelectionState;
  /** Reports the next cursor after a folder toggle or a key. */
  readonly onCursorChange: (cursor: TreeCursor) => void;
  /** Reports the next selection after a row press. */
  readonly onSelectionChange: (state: SelectionState) => void;
}

/** The drawing itself: one row per visible node, its glyph and its checkbox. */
export function FileTreeFrame({
  roots,
  cursor,
  selection,
  onCursorChange,
  onSelectionChange,
}: FileTreeFrameProps) {
  const rows = fileRows(roots, cursor);
  const active = Option.getOrUndefined(cursor.active);
  const order = Arr.map(rows, (row) => row.key);

  // A press chooses the row and stands on it, the way the shipped tree's roving
  // tab stop follows the row a reader pressed.
  const press = (row: TreeRow<FileNode>, toggle: boolean): void => {
    onCursorChange(withActive(cursor, row.key));
    onSelectionChange(
      pressSelection(selection, row.key, toggle ? "toggle" : "replace", order),
    );
  };

  // The chevron flips *its* row, not whichever row the cursor happens to stand
  // on, so the cursor moves there first.
  const flip = (row: TreeRow<FileNode>): void =>
    onCursorChange(treeCursorMove(rows, withActive(cursor, row.key), "enter"));

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const key = treeKeyOf(event.key);
    if (Option.isNone(key)) return;
    event.preventDefault();
    onCursorChange(treeCursorMove(rows, cursor, key.value));
  };

  return (
    <div
      aria-activedescendant={active === undefined ? undefined : rowId(active)}
      aria-label="Workspace files"
      className="gx-filetree"
      onKeyDown={onKeyDown}
      role="tree"
      tabIndex={0}
    >
      {Arr.map(rows, (row) => {
        const node = row.node;
        const chosen = isSelected(selection, row.key);
        const current = row.key === active;
        return (
          <div
            aria-expanded={row.hasChildren ? row.expanded : undefined}
            aria-level={row.depth + 1}
            aria-selected={chosen}
            className="gx-filetree-row"
            data-chosen={chosen ? "true" : "false"}
            data-current={current ? "true" : "false"}
            data-icon={glyphOf(node, row.expanded)}
            id={rowId(row.key)}
            key={row.key}
            onClick={() => press(row, false)}
            role="treeitem"
            style={{ paddingLeft: 6 + row.depth * TREE_INDENT }}
          >
            <button
              aria-label={
                row.expanded ? `Collapse ${node.name}` : `Expand ${node.name}`
              }
              className="gx-filetree-chevron"
              data-branch={row.hasChildren ? "true" : "false"}
              disabled={!row.hasChildren}
              onClick={(event) => {
                event.stopPropagation();
                flip(row);
              }}
              type="button"
            >
              {row.expanded ? "▾" : "▸"}
            </button>
            <BrowserIcon
              className="gx-filetree-glyph"
              name={glyphOf(node, row.expanded)}
            />
            <span className="gx-filetree-name">{node.name}</span>
            <input
              aria-label={`Choose ${node.name}`}
              checked={chosen}
              className="gx-filetree-box"
              onChange={() => press(row, true)}
              onClick={(event) => event.stopPropagation()}
              type="checkbox"
            />
          </div>
        );
      })}
    </div>
  );
}

/** The page's preview: the workspace, the row it stands on and what is chosen. */
export function FileTreeDemo() {
  const roots = workspaceTree();
  const [cursor, setCursor] = useState<TreeCursor>(openCursor);
  const [selection, setSelection] = useState<SelectionState>(emptySelection);

  return (
    <div className="gx-files-demo">
      <FileTreeFrame
        cursor={cursor}
        onCursorChange={setCursor}
        onSelectionChange={setSelection}
        roots={roots}
        selection={selection}
      />
      <p className="gx-files-readout">{selectionReadout(selection)}</p>
      <p className="gx-files-hint">
        Press a row to choose it, or its box to add it. Focus the tree and use ↑
        ↓ ← →, Home and End; Enter or Space flips a folder.
      </p>
    </div>
  );
}

export const fileTreeDemoSource = `import { buildFileTree, FileTree } from "@gpuixui/files";
import { useState } from "react";

const roots = buildFileTree([
  "src/index.ts",
  "src/components/button.tsx",
  "docs/installation.mdx",
  "readme.md",
]);

export function ProjectFiles() {
  const [chosen, setChosen] = useState<string[]>([]);
  return (
    <FileTree
      aria-label="Workspace files"
      height={280}
      roots={roots}
      keyOf={(node) => node.path}
      childrenOf={(node) => node.children ?? []}
      labelOf={(node) => node.name}
      onSelectionChange={setChosen}
      onActivate={(node) => console.log(node.path)}
    />
  );
}`;
