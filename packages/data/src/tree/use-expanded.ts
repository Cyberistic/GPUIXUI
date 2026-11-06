import * as HashSet from "effect/HashSet";
import * as Option from "effect/Option";
import { useCallback, useMemo, useState } from "react";
import {
  collapseAll,
  expandAll,
  expandTo,
  expandedSet,
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

export interface UseExpandedRowsOptions<T> extends TreeSpec<T> {
  readonly roots: ReadonlyArray<T> | null | undefined;

  readonly labelOf: (node: T) => string;

  readonly initialExpanded?: Iterable<string>;

  readonly initialActive?: string;
}

export interface ExpandedRowsController<T> {
  readonly rows: ReadonlyArray<TreeRow<T>>;

  readonly cursor: TreeCursor;

  readonly expanded: HashSet.HashSet<string>;

  readonly active: Option.Option<string>;

  readonly setCursor: (cursor: TreeCursor) => void;

  readonly setActive: (key: Option.Option<string>) => void;

  readonly toggle: (key: string) => void;

  readonly setExpanded: (key: string, open: boolean) => void;

  readonly expandAll: () => void;

  readonly collapseAll: () => void;

  readonly reveal: (key: string) => void;

  readonly pressKey: (key: TreeKey) => void;

  readonly typeAhead: (prefix: string) => void;
}

export const useExpandedRows = <T>({
  roots,
  keyOf,
  childrenOf,
  labelOf,
  initialExpanded,
  initialActive,
}: UseExpandedRowsOptions<T>): ExpandedRowsController<T> => {
  const [cursor, setCursor] = useState<TreeCursor>(() => ({
    expanded: expandedSet(initialExpanded),
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
