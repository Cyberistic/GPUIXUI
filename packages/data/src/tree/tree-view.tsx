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
 * A tree that virtualizes composes {@link VirtualList} in children mode: the
 * flattening is already a flat row array, so a depth inset is all a row needs.
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

import {
  useGpuix,
  type EventPayload,
  type Props,
  type PublicInstance,
} from "@gpuix/react";
import * as Arr from "effect/Array";
import { mergeStyles } from "@gpuix/react/floating";
import { Icon } from "@gpuixui/icons";
import { typedChar, useTypeahead } from "@gpuixui/components/typeahead";
import { cn } from "@gpuixui/tw";
import * as Option from "effect/Option";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { recipeStyle } from "../recipe.js";
import { textStyle, useTheme } from "../theme.js";
import {
  cursorRow,
  emptyCursor,
  isTreeKey,
  treeCursorMove,
  TREE_INDENT,
  type TreeCursor,
  type TreeRow,
} from "./logic.js";
import {
  TREE_CHEVRON,
  TREE_ROOT,
  TREE_ROW,
  TREE_ROW_ACTIVE,
} from "./recipe.js";

/** The left inset the first level takes, in pixels. */
export const TREE_INSET = 8;

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

/** One row: the inset, the chevron slot, the caller's content. */
interface RowProps<T> {
  readonly row: TreeRow<T>;
  readonly active: boolean;
  readonly tabbable: boolean;
  readonly label: string;
  readonly renderRow: (row: TreeRow<T>) => ReactNode;
  readonly testId: string | undefined;
  readonly onPress: () => void;
  readonly onKeyDown: (event: EventPayload) => void;
  readonly attach: (instance: PublicInstance | null) => void;
}

const Row = <T,>({
  row,
  active,
  tabbable,
  label,
  renderRow,
  testId,
  onPress,
  onKeyDown,
  attach,
}: RowProps<T>) => {
  const theme = useTheme();
  return (
    <div
      ref={attach}
      role="treeitem"
      aria-label={label}
      aria-level={row.depth + 1}
      aria-selected={active}
      {...(row.hasChildren ? { "aria-expanded": row.expanded } : {})}
      tabIndex={tabbable ? 0 : -1}
      testId={testId}
      onClick={onPress}
      onKeyDown={onKeyDown}
      style={{
        ...recipeStyle(cn(active ? TREE_ROW_ACTIVE : TREE_ROW), theme),
        height: theme.density.rowHeight,
        paddingLeft: TREE_INSET + row.depth * TREE_INDENT,
      }}
    >
      <div
        testId={testId === undefined ? undefined : `${testId}-slot`}
        style={{
          ...recipeStyle(TREE_CHEVRON, theme),
          width: theme.iconSize.md,
          height: theme.iconSize.md,
          // The slot is the chevron's box: a leaf keeps it blank so its label
          // lines up with a branch's.
        }}
      >
        {row.hasChildren ? (
          <Icon
            name={row.expanded ? "chevron-down" : "chevron-right"}
            size="md"
            color={
              active
                ? theme.colors.selectedForeground
                : theme.colors.mutedForeground
            }
          />
        ) : undefined}
      </div>
      {renderRow(row)}
    </div>
  );
};

/**
 * The tree rows, one tab stop and one keyboard.
 *
 * The caller names the tree with `aria-label`: a role-less node never reaches
 * the accessibility tree, and `role="tree"` is written here so a consumer cannot
 * forget it.
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
  const renderer = useGpuix().renderer;
  const [uncontrolled, setUncontrolled] = useState<TreeCursor>(
    defaultCursor ?? emptyCursor,
  );
  const resolved = cursor ?? uncontrolled;
  const elements = useRef(new Map<string, number>());
  /**
   * The row the tree has focused, across renders.
   *
   * A reveal moves the cursor from the **caller** (`tree.reveal`), not through
   * this component's own handler, so the tree learns about it only from the
   * committed cursor. The baseline is the first paint's cursor, so mounting a
   * tree does not take focus from the rest of the window
   * (`virtual-tree-lifecycle`).
   */
  const focused = useRef<Option.Option<string>>(resolved.active);
  /**
   * Whether the current cursor came from this tree's own keys or presses.
   *
   * A move the tree produced is already the one the reader made, so the row is
   * focused in the same commit. A move the **caller** produced (a reveal from a
   * search hit) answers a press on some other control, and the runtime hands
   * that control the press's focus **after** the commit — measured: a reveal
   * from a button left the focus on the button. So a caller-driven cursor takes
   * the row on the next tick, once the press's focus has landed.
   */
  const fromKeys = useRef(false);
  const deferred = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(
    () => () => {
      if (deferred.current !== undefined) clearTimeout(deferred.current);
    },
    [],
  );

  const commit = useCallback(
    (next: TreeCursor) => {
      fromKeys.current = true;
      if (cursor === undefined) setUncontrolled(next);
      onCursorChange?.(next);
    },
    [cursor, onCursorChange],
  );

  /**
   * The typed prefix, through the published seam a list and a menu read.
   *
   * The tree contributes its rows as labels and the position of the row it
   * stands on; the window, the repeat rule and the character rule are
   * `@gpuixui/components/typeahead`'s, so a tree cannot disagree with a list
   * about what a typed prefix means. A miss clears the buffer there.
   */
  const typeahead = useTypeahead(
    Arr.map(rows, (row) => ({
      key: row.key,
      label: labelOf(row.node),
      disabled: false,
    })),
    Option.flatMap(resolved.active, (key) =>
      Arr.findFirstIndex(rows, (row) => row.key === key),
    ),
    (match) => commit({ ...resolved, active: Option.some(match.key) }),
  );

  const paintRow =
    renderRow ??
    ((row: TreeRow<T>) => (
      <text
        style={{
          ...textStyle(theme, "body"),
          color: activeColor(theme, Option.contains(resolved.active, row.key)),
        }}
      >
        {labelOf(row.node)}
      </text>
    ));

  // Focus follows the committed tab stop: `focusElement` refuses an element
  // outside the tab order, so focusing the new row in the key handler (before
  // `tabIndex` reaches it) moved nothing (`virtual-tree-lifecycle`). The effect
  // runs after every paint and acts only on a row the cursor has just moved to,
  // so mounting a tree does not take focus from the rest of the window.
  useLayoutEffect(() => {
    if (
      Option.getOrUndefined(resolved.active) ===
      Option.getOrUndefined(focused.current)
    )
      return;
    const ours = fromKeys.current;
    fromKeys.current = false;
    focused.current = resolved.active;
    Option.match(resolved.active, {
      onNone: () => {},
      onSome: (key) => {
        const focusRow = () => {
          const id = elements.current.get(key);
          if (id !== undefined) renderer?.focusElement?.(id);
        };
        focusRow();
        if (ours) return;
        // The caller's reveal answered a press on another control, and the
        // runtime focuses that control after this commit. Re-take the row on the
        // next tick, and once more through the ref in case the row was mounted
        // by this same commit.
        if (deferred.current !== undefined) clearTimeout(deferred.current);
        deferred.current = setTimeout(() => {
          deferred.current = undefined;
          focusRow();
        }, 0);
      },
    });
  });

  const activate = (row: TreeRow<T>) => {
    const onRow = { ...resolved, active: Option.some(row.key) };
    // A press on a branch opens or closes it; every press also reports the row,
    // so a file tree can preview a file and a folder can be opened by its row.
    commit(row.hasChildren ? treeCursorMove(rows, onRow, "enter") : onRow);
    onActivate?.(row);
  };

  const handleKey = (event: EventPayload) => {
    if (isTreeKey(event.key)) {
      const next = treeCursorMove(rows, resolved, event.key);
      commit(next);
      if (event.key === "enter" || event.key === "space") {
        if (onActivate !== undefined) {
          Option.match(next.active, {
            onNone: () => {},
            onSome: (key) => {
              Option.match(
                Arr.findFirst(rows, (candidate) => candidate.key === key),
                { onNone: () => {}, onSome: onActivate },
              );
            },
          });
        }
      }
      return;
    }
    Option.match(typedChar(event), {
      onNone: () => {},
      onSome: typeahead,
    });
  };

  const tabKey = Option.match(cursorRow(rows, resolved), {
    onNone: () => Option.none<string>(),
    onSome: (row) => Option.some(row.key),
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
        <Row
          key={row.key}
          row={row}
          active={Option.contains(resolved.active, row.key)}
          tabbable={Option.contains(tabKey, row.key)}
          label={labelOf(row.node)}
          renderRow={paintRow}
          testId={testId === undefined ? undefined : `${testId}-row-${row.key}`}
          onPress={() => activate(row)}
          onKeyDown={handleKey}
          attach={(instance) => {
            if (instance === null) elements.current.delete(row.key);
            else elements.current.set(row.key, instance.id);
          }}
        />
      ))}
    </div>
  );
};

/** The text role a row paints, once its state is known. */
const activeColor = (
  theme: ReturnType<typeof useTheme>,
  active: boolean,
): string =>
  active ? theme.colors.selectedForeground : theme.colors.foreground;
