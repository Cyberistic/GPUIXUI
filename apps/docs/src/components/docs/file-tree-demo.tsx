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
import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
import { BrowserIcon } from "./browser-icon";
import { treeKeyOf } from "./tree-keys";

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

export const workspaceTree = (): ReadonlyArray<FileNode> =>
  buildFileTree(WORKSPACE_PATHS);

export const kindOf = (node: FileNode): FileKind =>
  fileKindOf(node.name, node.children !== undefined);

export const glyphOf = (node: FileNode, expanded: boolean): IconName =>
  fileIcon(kindOf(node), expanded);

export const fileRows = (
  roots: ReadonlyArray<FileNode>,
  cursor: TreeCursor,
): ReadonlyArray<TreeRow<FileNode>> => visibleFileRows(roots, cursor.expanded);

export const openCursor = (): TreeCursor => ({
  expanded: HashSet.make("src", "docs", "src/components"),
  active: Option.some("src/index.ts"),
});

export const OPEN_SELECTED = "src/index.ts";

export const selectionReadout = (selected: string | undefined): string =>
  selected === undefined ? "nothing selected" : `selected: ${selected}`;

export const rowId = (key: string): string =>
  `gx-filetree-${key.replace(/[^A-Za-z0-9]+/g, "-")}`;

export const withActive = (cursor: TreeCursor, key: string): TreeCursor => ({
  ...cursor,
  active: Option.some(key),
});

export const toggleRow = (
  rows: ReadonlyArray<TreeRow<FileNode>>,
  cursor: TreeCursor,
  key: string,
): TreeCursor => treeCursorMove(rows, withActive(cursor, key), "enter");

export const tabRow = (
  rows: ReadonlyArray<TreeRow<FileNode>>,
  selected: string | undefined,
): Option.Option<TreeRow<FileNode>> => fileTreeTab(rows, selected);

export interface FileTreeFrameProps {
  readonly roots: ReadonlyArray<FileNode>;

  readonly cursor: TreeCursor;

  readonly selected: string | undefined;

  readonly onCursorChange: (cursor: TreeCursor) => void;

  readonly onSelect: (path: string) => void;

  readonly renderGlyph?: (node: FileNode) => ReactNode;
}

export const FOLD_MS = 220;

interface Fold {
  readonly leaving: ReadonlyArray<TreeRow<FileNode>>;
  readonly before: ReadonlyArray<TreeRow<FileNode>>;
  readonly entering: ReadonlySet<string>;
}

export function FileTreeFrame({
  roots,
  cursor,
  selected,
  onCursorChange,
  onSelect,
  renderGlyph,
}: FileTreeFrameProps) {
  const rows = fileRows(roots, cursor);
  const signature = Arr.join(
    Arr.map(rows, (row) => row.key),
    "\n",
  );
  const [fold, setFold] = useState<Fold | null>(null);
  const [seen, setSeen] = useState({ signature, rows });

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
            {renderGlyph === undefined ? (
              <BrowserIcon
                className="gx-filetree-glyph"
                name={glyphOf(node, row.expanded)}
              />
            ) : (
              <span className="gx-filetree-glyph">{renderGlyph(node)}</span>
            )}
            <span className="gx-filetree-name">{node.name}</span>
          </div>
        );
      })}
    </div>
  );
}

const INDENT = 16;

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
