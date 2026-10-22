/**
 * `FileTree` — a file tree with a kind per row, over `@gpuixui/data`'s tree.
 *
 * The expansion set, the cursor (the single roving tab stop), the arrow keys and
 * type-ahead are `@gpuixui/data`'s `useExpandedRows` + `TreeView`; this component
 * adds the two things a file tree owns: the **glyph** a row paints for its kind,
 * and the **selection** — a press on a row replaces the selection, and the
 * leading checkbox toggles a row in it. A flat list of paths is built with
 * `buildFileTree`; a nested tree is passed straight through.
 *
 * ```tsx
 * const roots = buildFileTree(["src/index.ts", "src/button.tsx", "readme.md"]);
 *
 * <FileTree
 *   aria-label="Workspace files"
 *   height={320}
 *   roots={roots}
 *   keyOf={(node) => node.path}
 *   childrenOf={(node) => node.children ?? []}
 *   labelOf={(node) => node.name}
 *   onSelectionChange={(keys) => setChosen(keys)}
 *   onActivate={(node) => open(node.path)}
 * />
 * ```
 */

import type { Props } from "@gpuix/react";
import {
  emptySelection,
  isSelected,
  pressSelection,
  TreeView,
  useExpandedRows,
  type SelectionState,
  type TreeRow,
} from "@gpuixui/data";
import { Icon } from "@gpuixui/icons";
import { Checkbox } from "@gpuixui/primitives";
import * as Arr from "effect/Array";
import * as HashSet from "effect/HashSet";
import * as Option from "effect/Option";
import { useEffect, useState, type ReactNode } from "react";
import { recipeStyle } from "../recipe.js";
import { textStyle, useTheme } from "../theme.js";
import { fileIcon, fileKindOf, type FileKind } from "./logic.js";
import { FILE_TREE_CONTENT } from "./recipe.js";

/** {@link FileTree} props. */
export interface FileTreeProps<T> extends Omit<Props, "children"> {
  /** The tree's roots, in paint order. */
  readonly roots: ReadonlyArray<T>;
  /** The stable identity a row is expanded, selected and focused by. */
  readonly keyOf: (node: T) => string;
  /** The children a node has, in paint order. A leaf answers `[]`. */
  readonly childrenOf: (node: T) => ReadonlyArray<T>;
  /** The row's label: its accessible name and what type-ahead matches. */
  readonly labelOf: (node: T) => string;
  /**
   * A node's kind, for its glyph. Defaults to `fileKindOf` over the label and
   * whether the node has children.
   */
  readonly kindOf?: (node: T, hasChildren: boolean) => FileKind;
  /** The keys selected at first paint. Defaults to none. */
  readonly initialSelected?: Iterable<string>;
  /** Reports the selected keys after every press. */
  readonly onSelectionChange?: (keys: ReadonlyArray<string>) => void;
  /** A press or Enter on a row, after the selection is replaced. */
  readonly onActivate?: (node: T) => void;
  /** A definite height. The rows scroll inside it; omit it to lay out naturally. */
  readonly height?: number;
  readonly className?: string;
  /** The tree's test id. Each row is `${testId}-row-${key}`. */
  readonly testId?: string;
}

/**
 * A file tree: expandable rows with a glyph per kind and single/multi selection.
 *
 * A press on a row chooses it alone and reports the node; the leading checkbox
 * toggles the row in the selection, so several files can be chosen at once.
 * Set `aria-label` on the tree, exactly as on `TreeView`.
 */
export const FileTree = <T,>({
  roots,
  keyOf,
  childrenOf,
  labelOf,
  kindOf,
  initialSelected,
  onSelectionChange,
  onActivate,
  height,
  className,
  testId,
  style,
  ...rest
}: FileTreeProps<T>) => {
  const theme = useTheme();
  const tree = useExpandedRows({ roots, keyOf, childrenOf, labelOf });
  const [selection, setSelection] = useState<SelectionState>(() =>
    initialSelected === undefined
      ? emptySelection
      : {
          selected: HashSet.fromIterable(initialSelected),
          anchor: Option.none(),
        },
  );
  const order = Arr.map(tree.rows, (row) => row.key);

  useEffect(() => {
    onSelectionChange?.(Arr.fromIterable(selection.selected));
  }, [selection, onSelectionChange]);

  const kind = (node: T, hasChildren: boolean): FileKind =>
    kindOf?.(node, hasChildren) ?? fileKindOf(labelOf(node), hasChildren);

  const toggleSelect = (key: string): void =>
    setSelection((current) => pressSelection(current, key, "toggle", order));

  const activate = (row: TreeRow<T>): void => {
    setSelection((current) =>
      pressSelection(current, row.key, "replace", order),
    );
    onActivate?.(row.node);
  };

  const renderRow = (row: TreeRow<T>): ReactNode => {
    const active = Option.contains(tree.active, row.key);
    const color = active
      ? theme.colors.selectedForeground
      : theme.colors.foreground;
    return (
      <div style={recipeStyle(FILE_TREE_CONTENT, theme)}>
        <Checkbox
          checked={isSelected(selection, row.key)}
          onCheckedChange={() => toggleSelect(row.key)}
          size="sm"
          label={`Select ${labelOf(row.node)}`}
        />
        <Icon
          name={fileIcon(kind(row.node, row.hasChildren), row.expanded)}
          size="sm"
          color={
            active
              ? theme.colors.selectedForeground
              : theme.colors.mutedForeground
          }
        />
        <text style={{ ...textStyle(theme, "body"), color }}>
          {labelOf(row.node)}
        </text>
      </div>
    );
  };

  return (
    <TreeView
      {...rest}
      rows={tree.rows}
      cursor={tree.cursor}
      onCursorChange={tree.setCursor}
      labelOf={labelOf}
      renderRow={renderRow}
      onActivate={activate}
      height={height}
      className={className}
      testId={testId}
      style={style}
    />
  );
};
