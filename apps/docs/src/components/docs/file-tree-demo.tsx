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
  paintedRows,
  treeCursorMove,
  type TreeCursor,
  type TreeRow,
} from "@gpuixui/data/tree/logic";
import type { IconName } from "@gpuixui/icons";
import * as Arr from "effect/Array";
import * as HashSet from "effect/HashSet";
import * as Option from "effect/Option";
import { useEffect, useState, type KeyboardEvent } from "react";
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

/** How long the drawing keeps a branch's rows while they fold away. */
export const FOLD_MS = 220;

/** A branch change: the rows folding out, and the ones folding in. */
interface Fold {
  readonly leaving: ReadonlyArray<TreeRow<FileNode>>;
  readonly before: ReadonlyArray<TreeRow<FileNode>>;
  readonly entering: ReadonlySet<string>;
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
  const signature = Arr.join(
    Arr.map(rows, (row) => row.key),
    "\n",
  );
  const [fold, setFold] = useState<Fold | null>(null);
  const [seen, setSeen] = useState({ signature, rows });

  // A closed branch is absent from `visibleFileRows` in the frame the cursor
  // changes, so the drawing keeps its rows for the fold and drops them when it
  // settles; an opened one marks the rows that have just arrived. The change is
  // decided before React commits, so the rows paint their fold instead of
  // unmounting for a frame and growing back.
  if (seen.signature !== signature) {
    const visible = new Set(Arr.map(rows, (row) => row.key));
    const previous = new Set(Arr.map(seen.rows, (row) => row.key));
    const leaving = Arr.filter(seen.rows, (row) => !visible.has(row.key));
    const entering = Arr.filter(rows, (row) => !previous.has(row.key));
    setSeen({ signature, rows });
    setFold(
      leaving.length === 0 && entering.length === 0
        ? null
        : {
            leaving,
            before: seen.rows,
            entering: new Set(Arr.map(entering, (row) => row.key)),
          },
    );
  }

  useEffect(() => {
    if (fold === null) return;
    const handle = setTimeout(() => setFold(null), FOLD_MS);
    return () => clearTimeout(handle);
  }, [fold]);

  const painted = paintedRows(rows, fold?.leaving ?? [], fold?.before ?? rows);
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
      {Arr.map(painted, ({ row, leaving }) => {
        const node = row.node;
        const chosen =
          !leaving && node.children === undefined && row.key === selected;
        const entering = fold?.entering.has(row.key) === true;
        return (
          <div
            aria-expanded={
              leaving ? undefined : row.hasChildren ? row.expanded : undefined
            }
            aria-hidden={leaving ? true : undefined}
            aria-level={row.depth + 1}
            aria-selected={leaving ? undefined : chosen}
            className="gx-filetree-row"
            data-current={!leaving && row.key === current ? "true" : "false"}
            data-entering={entering ? "true" : undefined}
            data-icon={glyphOf(node, row.expanded)}
            data-leaving={leaving ? "true" : undefined}
            data-selected={chosen ? "true" : "false"}
            id={rowId(row.key)}
            key={row.key}
            onClick={leaving ? undefined : () => press(row)}
            role="treeitem"
            style={{ paddingLeft: 6 + row.depth * INDENT }}
            tabIndex={leaving ? -1 : undefined}
          >
            <span
              aria-hidden="true"
              className="gx-filetree-chevron"
              data-branch={row.hasChildren ? "true" : "false"}
            >
              {row.hasChildren ? (
                <BrowserIcon
                  name={row.expanded ? "chevron-down" : "chevron-right"}
                />
              ) : null}
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

/** The step a deeper row is inset by, as the reference's nested `ml-4`. */
const INDENT = 16;

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
