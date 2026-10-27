import {
  buildFileTree,
  fileIcon,
  fileKindOf,
  fileTreeTab,
  visibleFileRows,
  type FileKind,
  type FileNode,
} from "@gpuixui/files/tree/logic";
import {
  treeCursorMove,
  type TreeCursor,
  type TreeRow,
} from "@gpuixui/data/tree/logic";
import type { IconName } from "@gpuixui/icons";
import * as Arr from "effect/Array";
import * as HashSet from "effect/HashSet";
import * as Option from "effect/Option";
import { useState, type KeyboardEvent } from "react";
import { BrowserIcon } from "./browser-icon";
import { treeKeyOf } from "./tree-keys";

/**
 * Browser preview for the File trees page.
 *
 * `@gpuixui/files`' `FileTree` is a GPUix host tree, so the page cannot mount it
 * and this drawing is a labelled approximation. What it does not approximate is
 * the tree's reasoning: the rows are the package's `visibleFileRows`, the folder
 * glyph its `fileIcon`, the tab stop its `fileTreeTab`, and the keyboard the
 * generic tree's `treeCursorMove`. Only the paint is the browser's.
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

/** A row's kind: a folder is one by its children, a file by its extension. */
export const kindOf = (node: FileNode): FileKind =>
  fileKindOf(node.name, node.children !== undefined);

/** The glyph a row paints; an open folder paints the open glyph. */
export const glyphOf = (node: FileNode, expanded: boolean): IconName =>
  fileIcon(kindOf(node), expanded);

/** The rows a reader can see, from the package's own flattening. */
export const fileRows = (
  roots: ReadonlyArray<FileNode>,
  cursor: TreeCursor,
): ReadonlyArray<TreeRow<FileNode>> => visibleFileRows(roots, cursor.expanded);

/** The cursor the preview opens on: three folders open and `src/index.ts` active. */
export const openCursor = (): TreeCursor => ({
  expanded: HashSet.make("src", "docs", "src/components"),
  active: Option.some("src/index.ts"),
});

/** The file the preview opens selected. */
export const OPEN_SELECTED = "src/index.ts";

/** The line under the frame: what the tree reports after a press. */
export const selectionReadout = (selected: string | undefined): string =>
  selected === undefined ? "nothing selected" : `selected: ${selected}`;

/** The id a row's element carries, so the tree can name its active row. */
export const rowId = (key: string): string =>
  `gx-filetree-${key.replace(/[^A-Za-z0-9]+/g, "-")}`;

/** The cursor with `key` as the row the keyboard stands on. */
export const withActive = (cursor: TreeCursor, key: string): TreeCursor => ({
  ...cursor,
  active: Option.some(key),
});

/** The cursor a folder press produces: one branch flips, nothing else. */
export const toggleRow = (
  rows: ReadonlyArray<TreeRow<FileNode>>,
  cursor: TreeCursor,
  key: string,
): TreeCursor => treeCursorMove(rows, withActive(cursor, key), "enter");

/** The row the tab stop stands on: the selected file, else the first row. */
export const tabRow = (
  rows: ReadonlyArray<TreeRow<FileNode>>,
  selected: string | undefined,
): Option.Option<TreeRow<FileNode>> => fileTreeTab(rows, selected);

export interface FileTreeFrameProps {
  /** The roots to draw, so a test can hand in its own workspace. */
  readonly roots: ReadonlyArray<FileNode>;
  /** The cursor to draw, controlled the way the shipped tree takes it. */
  readonly cursor: TreeCursor;
  /** The selected file path. */
  readonly selected: string | undefined;
  /** Reports the next cursor after a folder toggle or a key. */
  readonly onCursorChange: (cursor: TreeCursor) => void;
  /** Reports the file a press selects. */
  readonly onSelect: (path: string) => void;
}

/** The drawing itself: one row per visible node, guides, chevron, glyph, name. */
export function FileTreeFrame({
  roots,
  cursor,
  selected,
  onCursorChange,
  onSelect,
}: FileTreeFrameProps) {
  const rows = fileRows(roots, cursor);
  const active = Option.getOrUndefined(cursor.active);
  const tab = Option.getOrUndefined(tabRow(rows, selected));
  const current = active ?? tab?.key;

  // A folder press flips only that folder's subtree; a file press selects the
  // file and stands on it, the way the shipped tree reports a file once.
  const press = (row: TreeRow<FileNode>): void => {
    if (row.node.children !== undefined) {
      onCursorChange(toggleRow(rows, cursor, row.key));
      return;
    }
    onCursorChange(withActive(cursor, row.key));
    onSelect(row.key);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const key = treeKeyOf(event.key);
    if (Option.isNone(key)) return;
    event.preventDefault();
    const next = treeCursorMove(rows, cursor, key.value);
    onCursorChange(next);
    if (key.value === "enter" || key.value === "space") {
      const row = Option.getOrUndefined(
        Option.flatMap(next.active, (path) =>
          Arr.findFirst(rows, (candidate) => candidate.key === path),
        ),
      );
      if (row !== undefined && row.node.children === undefined) {
        onSelect(row.key);
      }
    }
  };

  return (
    <div
      aria-activedescendant={current === undefined ? undefined : rowId(current)}
      aria-label="Workspace files"
      className="gx-filetree"
      onKeyDown={onKeyDown}
      role="tree"
      tabIndex={0}
    >
      {Arr.map(rows, (row) => {
        const node = row.node;
        const chosen = node.children === undefined && row.key === selected;
        return (
          <div
            aria-expanded={row.hasChildren ? row.expanded : undefined}
            aria-level={row.depth + 1}
            aria-selected={chosen}
            className="gx-filetree-row"
            data-current={row.key === current ? "true" : "false"}
            data-icon={glyphOf(node, row.expanded)}
            data-selected={chosen ? "true" : "false"}
            id={rowId(row.key)}
            key={row.key}
            onClick={() => press(row)}
            role="treeitem"
          >
            {row.depth === 0
              ? undefined
              : Arr.map(Arr.range(1, row.depth), (level) => (
                  <span
                    className="gx-filetree-guide"
                    data-guide="true"
                    key={level}
                  />
                ))}
            <span
              aria-hidden="true"
              className="gx-filetree-chevron"
              data-branch={row.hasChildren ? "true" : "false"}
            >
              {row.hasChildren ? (row.expanded ? "▾" : "▸") : ""}
            </span>
            <BrowserIcon
              className="gx-filetree-glyph"
              name={glyphOf(node, row.expanded)}
            />
            <span className="gx-filetree-name">{node.name}</span>
          </div>
        );
      })}
    </div>
  );
}

/** The page's preview: the workspace, its tab stop and the selected file. */
export function FileTreeDemo() {
  const roots = workspaceTree();
  const [cursor, setCursor] = useState<TreeCursor>(openCursor);
  const [selected, setSelected] = useState<string | undefined>(OPEN_SELECTED);

  return (
    <div className="gx-demo-frame">
      <FileTreeFrame
        cursor={cursor}
        onCursorChange={setCursor}
        onSelect={setSelected}
        roots={roots}
        selected={selected}
      />
      <p className="gx-demo-readout">{selectionReadout(selected)}</p>
      <p className="gx-demo-hint">
        Press a folder to open it and a file to select it. Focus the tree and
        use ↑ ↓ ← →, Home and End; Enter or Space opens a folder or selects a
        file.
      </p>
    </div>
  );
}

export const fileTreeDemoSource = `import {
  FileTree,
  FileTreeFile,
  FileTreeFolder,
} from "@gpuixui/files";
import { useState } from "react";

export function ProjectFiles() {
  const [file, setFile] = useState("src/index.ts");
  return (
    <FileTree
      aria-label="Workspace files"
      defaultExpanded={["src"]}
      height={280}
      selected={file}
      onSelect={setFile}
    >
      <FileTreeFolder path="src" name="src">
        <FileTreeFolder path="src/components" name="components">
          <FileTreeFile
            path="src/components/button.tsx"
            name="button.tsx"
          />
        </FileTreeFolder>
        <FileTreeFile path="src/index.ts" name="index.ts" />
      </FileTreeFolder>
      <FileTreeFile path="readme.md" name="readme.md" />
    </FileTree>
  );
}`;
