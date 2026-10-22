/**
 * The uncontrolled tree controller: the pure cursor in React state.
 *
 * It is a thin `useState` over {@link treeCursorMove} and the flattening, so an
 * application driving a tree from Effect or from its own store reads the same
 * pure functions this hook does (`tree/logic`). The component
 * {@link TreeView} is presentational: it paints these rows and reports the
 * cursor the keyboard produces.
 *
 * A reveal (`reveal`) opens the path to a node **and** moves the cursor to it,
 * which is what a search hit or a "show this file" action needs.
 */

import * as HashSet from "effect/HashSet";
import * as Option from "effect/Option";
import { useCallback, useMemo, useState } from "react";
import {
  collapseAll,
  expandAll,
  expandTo,
  flattenTree,
  setExpanded,
  toggleExpanded,
  treeCursorMove,
  typeAheadRow,
  type TreeCursor,
  type TreeKey,
  type TreeRow,
  type TreeSpec,
} from "./logic.js";

/** {@link useExpandedRows} options. */
export interface UseExpandedRowsOptions<T> extends TreeSpec<T> {
  /** The tree's roots, in paint order. */
  readonly roots: ReadonlyArray<T>;
  /** The row's label: its accessible name and what type-ahead matches. */
  readonly labelOf: (node: T) => string;
  /** The nodes open at first paint. Defaults to none. */
  readonly initialExpanded?: Iterable<string>;
  /** The key the keyboard starts on. Defaults to the first row. */
  readonly initialActive?: string;
}

/** The rows a tree paints and the cursor they run on. */
export interface ExpandedRowsController<T> {
  /** The visible rows, in paint order. */
  readonly rows: ReadonlyArray<TreeRow<T>>;
  /** The expansion set and the row the keyboard stands on. */
  readonly cursor: TreeCursor;
  /** The keys whose children paint. */
  readonly expanded: HashSet.HashSet<string>;
  /** The row the keyboard stands on, when it is one the tree paints. */
  readonly active: Option.Option<string>;
  /** Replace the whole cursor — what {@link TreeView}'s key report hands back. */
  readonly setCursor: (cursor: TreeCursor) => void;
  /** Move the cursor without changing what is open. */
  readonly setActive: (key: Option.Option<string>) => void;
  /** Flip one node. */
  readonly toggle: (key: string) => void;
  /** Open or close one node. */
  readonly setExpanded: (key: string, open: boolean) => void;
  /** Open every branch. */
  readonly expandAll: () => void;
  /** Close every branch, keeping the cursor where it is. */
  readonly collapseAll: () => void;
  /** Open the path to a node and move the cursor to it. */
  readonly reveal: (key: string) => void;
  /** Apply one tree key to the cursor. */
  readonly pressKey: (key: TreeKey) => void;
  /** Move the cursor to the row a typed prefix names. */
  readonly typeAhead: (prefix: string) => void;
}

/**
 * Hold a tree's expansion set and cursor.
 *
 * The rows are derived on every render from the caller's tree and the cursor's
 * set — never stored — so a caller that edits its tree sees the edit in the
 * same frame.
 */
export const useExpandedRows = <T>({
  roots,
  keyOf,
  childrenOf,
  labelOf,
  initialExpanded,
  initialActive,
}: UseExpandedRowsOptions<T>): ExpandedRowsController<T> => {
  const [cursor, setCursor] = useState<TreeCursor>(() => ({
    expanded: Option.match(Option.fromNullishOr(initialExpanded), {
      onNone: collapseAll,
      onSome: (keys) => HashSet.fromIterable(keys),
    }),
    active: Option.fromNullishOr(initialActive),
  }));

  const rows = useMemo(
    () => flattenTree(roots, { keyOf, childrenOf }, cursor.expanded),
    [roots, keyOf, childrenOf, cursor.expanded],
  );

  const setActive = useCallback(
    (key: Option.Option<string>) =>
      setCursor((current) => ({ ...current, active: key })),
    [],
  );

  const toggle = useCallback(
    (key: string) =>
      setCursor((current) => ({
        expanded: toggleExpanded(current.expanded, key),
        active: Option.some(key),
      })),
    [],
  );

  const open = useCallback(
    (key: string, next: boolean) =>
      setCursor((current) => ({
        expanded: setExpanded(current.expanded, key, next),
        active: Option.some(key),
      })),
    [],
  );

  const openAll = useCallback(
    () =>
      setCursor((current) => ({
        ...current,
        expanded: expandAll(roots, { keyOf, childrenOf }),
      })),
    [roots, keyOf, childrenOf],
  );

  const closeAll = useCallback(
    () => setCursor((current) => ({ ...current, expanded: collapseAll() })),
    [],
  );

  const reveal = useCallback(
    (key: string) =>
      setCursor((current) => ({
        expanded: expandTo(current.expanded, roots, { keyOf, childrenOf }, key),
        active: Option.some(key),
      })),
    [roots, keyOf, childrenOf],
  );

  const pressKey = useCallback(
    (key: TreeKey) =>
      setCursor((current) => treeCursorMove(rows, current, key)),
    [rows],
  );

  const typeAhead = useCallback(
    (prefix: string) =>
      setCursor((current) =>
        Option.match(
          typeAheadRow(rows, current.active, prefix, (row) =>
            labelOf(row.node),
          ),
          {
            onNone: () => current,
            onSome: (key) => ({ ...current, active: Option.some(key) }),
          },
        ),
      ),
    [rows, labelOf],
  );

  return {
    rows,
    cursor,
    expanded: cursor.expanded,
    active: cursor.active,
    setCursor,
    setActive,
    toggle,
    setExpanded: open,
    expandAll: openAll,
    collapseAll: closeAll,
    reveal,
    pressKey,
    typeAhead,
  };
};
