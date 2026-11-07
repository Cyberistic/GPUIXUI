/** @jsxImportSource @gpuix/react */
import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { cn } from "@gpuixui/tw";
import * as Option from "effect/Option";
import type { ReactNode } from "react";
import { recipeStyle } from "../recipe.js";
import { themeColors, useTheme } from "../theme.js";
import { rowsOf } from "../internal/list.js";
import { paintableSize } from "../internal/size.js";
import { treeName, type TreeCursor, type TreeRow } from "./logic.js";
import { TREE_INSET, TreeRowView } from "./row.js";
import { TREE_ROOT } from "./recipe.js";
import { useTree } from "./use-tree.js";

export { TREE_INSET };

export interface TreeViewProps<T> extends Omit<Props, "children"> {
  readonly rows: ReadonlyArray<TreeRow<T>>;

  readonly labelOf: (node: T) => string;

  readonly cursor?: TreeCursor;

  readonly onCursorChange?: (cursor: TreeCursor) => void;

  readonly defaultCursor?: TreeCursor;

  readonly onActivate?: (row: TreeRow<T>) => void;

  readonly renderRow?: (row: TreeRow<T>) => ReactNode;

  readonly height?: number;
  readonly className?: string;

  readonly testId?: string;
}

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
  const colors = themeColors(theme);
  const bound = Option.getOrUndefined(paintableSize(height));

  const visibleRows = rowsOf(rows, (row) => row.key);
  const tree = useTree({
    rows: visibleRows,
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
          ...(bound === undefined
            ? {}
            : {
                height: bound,
                flexGrow: 0,
                flexShrink: 0,
                flexBasis: bound,
              }),
          overflowY: "scroll",
          scrollbarColor: colors.scrollbar,
        }),
        style,
      )}
    >
      {visibleRows.map((row) => (
        <TreeRowView
          key={row.key}
          row={row}
          active={Option.contains(tree.cursor.active, row.key)}
          tabbable={Option.contains(tree.tabKey, row.key)}
          label={treeName(labelOf(row.node), row.key)}
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
