/**
 * The tree of rows a reader opens, closes and walks.
 *
 * `@gpuix/native@0.11.0` has no tree element, so a tree is a column of rows —
 * the same `div` the table paints — with three measured rules:
 *
 * - a nested row insets by **16px** per level (`virtual-tree-lifecycle`);
 * - arrow keys move **real** native focus row by row, so the tree holds **one**
 *   tab stop rather than one per row. The focus call happens in a layout effect
 *   **after** the row's `tabIndex` commits: a call from the key handler moved
 *   nothing, because the row was still outside the tab order;
 * - a chevron or icon that paints takes the press at its own fill, so the glyph
 *   declares `pointerEvents: "none"` and the press reaches the row
 *   (`press-routing-lifecycle`).
 *
 * The rows and the cursor are the caller's — {@link useExpandedRows} holds them,
 * and a consumer driving the tree from Effect or a store passes its own. The
 * component owns the paint, the tab stop, the key contract and the type-ahead
 * buffer; every key it answers is reported back as a whole cursor, so the caller
 * never has to re-derive what the press did.
 *
 * A tree that must not retain every row uses {@link VirtualTree}, which paints
 * the same rows through the runtime's `itemCount` window.
 *
 * ```tsx
 * const tree = useExpandedRows({ roots: files, keyOf, childrenOf, labelOf });
 *
 * <TreeView
 *   height={320}
 *   aria-label="Files"
 *   rows={tree.rows}
 *   cursor={tree.cursor}
 *   onCursorChange={tree.setCursor}
 *   labelOf={labelOf}
 *   onActivate={(row) => open(row.node)}
 * />
 * ```
 */

import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { cn } from "@gpuixui/tw";
import * as Option from "effect/Option";
import type { ReactNode } from "react";
import { recipeStyle } from "../recipe.js";
import { useTheme } from "../theme.js";
import type { TreeCursor, TreeRow } from "./logic.js";
import { TREE_INSET, TreeRowView } from "./row.js";
import { TREE_ROOT } from "./recipe.js";
import { useTree } from "./use-tree.js";

export { TREE_INSET };

/** {@link TreeView} props. */
export interface TreeViewProps<T> extends Omit<Props, "children"> {
  /** The visible rows, in paint order — one flat list, already flattened. */
  readonly rows: ReadonlyArray<TreeRow<T>>;
  /** The row's label: its accessible name and what a typed prefix matches. */
  readonly labelOf: (node: T) => string;
  /** The cursor, when the caller holds it. Omit it for an uncontrolled tree. */
  readonly cursor?: TreeCursor;
  /** Reports every cursor the keys or a press produce. */
  readonly onCursorChange?: (cursor: TreeCursor) => void;
  /** The cursor an uncontrolled tree starts on. Defaults to nothing open. */
  readonly defaultCursor?: TreeCursor;
  /** A press or Enter on a row: open the file, preview the node, select it. */
  readonly onActivate?: (row: TreeRow<T>) => void;
  /**
   * Paint one row's content after its inset and chevron. The default paints
   * `labelOf` in the row's own text role.
   */
  readonly renderRow?: (row: TreeRow<T>) => ReactNode;
  /** A definite height. The rows scroll inside it; omit it to lay out naturally. */
  readonly height?: number;
  readonly className?: string;
  /** The tree's test id. Each row is `${testId}-row-${key}`. */
  readonly testId?: string;
}

/**
 * The tree rows, one tab stop and one keyboard.
 *
 * The caller names the tree with `aria-label`: a role-less node never reaches
 * the accessibility tree, and `role="tree"` is written here so a consumer cannot
 * forget it.
 *
 * A row's pointer feedback is the runtime's native `hover` refinement, whose
 * hovered set takes the **same hit test** as a press (`hover-routing-lifecycle`):
 * an unfilled label leaves the row its wash, while a child that paints a fill
 * takes the row's hover and hears its own enter. The chevron is an `<svg>` with
 * `pointerEvents: "none"`, so the row keeps both its press and its hover; a
 * decorative pill in a row's `renderRow` should declare the same, and a control
 * that must answer the pointer keeps its fill.
 */
export const TreeView = <T,>({
  rows,
  labelOf,
  cursor,
  onCursorChange,
  defaultCursor,
  onActivate,
  renderRow,
  height,
  className,
  testId,
  style,
  ...rest
}: TreeViewProps<T>) => {
  const theme = useTheme();
  const tree = useTree({
    rows,
    labelOf,
    cursor,
    onCursorChange,
    defaultCursor,
    onActivate,
  });

  return (
    <div
      {...rest}
      role="tree"
      testId={testId}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(TREE_ROOT, className), theme), {
          ...(height === undefined
            ? {}
            : { height, flexGrow: 0, flexShrink: 0, flexBasis: height }),
          overflowY: "scroll",
          scrollbarColor: theme.colors.scrollbar,
        }),
        style,
      )}
    >
      {rows.map((row) => (
        <TreeRowView
          key={row.key}
          row={row}
          active={Option.contains(tree.cursor.active, row.key)}
          tabbable={Option.contains(tree.tabKey, row.key)}
          label={labelOf(row.node)}
          renderRow={renderRow}
          testId={testId === undefined ? undefined : `${testId}-row-${row.key}`}
          onPress={() => tree.activate(row)}
          onKeyDown={tree.handleKey}
          attach={tree.attach(row.key)}
        />
      ))}
    </div>
  );
};
