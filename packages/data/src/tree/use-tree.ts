/**
 * The cursor, the tab stop and the keyboard both trees share.
 *
 * The measured focus rule lives here once: the tree holds **one** tab stop, and
 * every cursor move focuses the new row in a layout effect **after** the row's
 * `tabIndex` commits. A call from the key handler moved nothing, because the
 * row was still outside the tab order (`virtual-tree-lifecycle`).
 *
 * A move the **caller** produced (a reveal from a search hit) answers a press on
 * another control, and the runtime hands that control the press's focus after
 * the commit (`data-tree-lifecycle` measured the Reveal button keeping it), so
 * the row is taken again on the next tick. The first paint is the baseline, so
 * mounting a tree does not steal focus.
 *
 * The typed prefix is `@gpuixui/components/typeahead`'s rule; the tree supplies
 * the rows' labels and maps the position the seam answers back onto the row key.
 */

import { useGpuix, type EventPayload, type PublicInstance } from "@gpuix/react";
import { typedChar, useTypeahead } from "@gpuixui/components/typeahead";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  cursorRow,
  emptyCursor,
  isTreeKey,
  treeCursorMove,
  type TreeCursor,
  type TreeRow,
} from "./logic.js";

/** {@link useTree} options. */
export interface UseTreeOptions<T> {
  /** The visible rows, in paint order. */
  readonly rows: ReadonlyArray<TreeRow<T>>;
  /** The row's accessible name and what a typed prefix matches. */
  readonly labelOf: (node: T) => string;
  /** The cursor, when the caller holds it. Omit it for an uncontrolled tree. */
  readonly cursor?: TreeCursor;
  /** Reports every cursor the keys or a press produce. */
  readonly onCursorChange?: (cursor: TreeCursor) => void;
  /** The cursor an uncontrolled tree starts on. Defaults to nothing open. */
  readonly defaultCursor?: TreeCursor;
  /** A press or Enter on a row. */
  readonly onActivate?: (row: TreeRow<T>) => void;
}

/** How a committed cursor reaches the focus effect. */
export interface TreeCommitOptions {
  /**
   * Focus the row the cursor lands on. `false` updates the tab stop silently —
   * the window moved the cursor because the runtime unmounted the old row, but
   * the tree did not hold the focus, so it must not take it.
   */
  readonly focus?: boolean;
}

/** {@link useTree}'s controller. */
export interface TreeController<T> {
  /** The cursor the tree paints. */
  readonly cursor: TreeCursor;
  /** The key the single tab stop sits on. */
  readonly tabKey: Option.Option<string>;
  /** Commit a cursor, reporting it to the caller when controlled. */
  readonly commit: (cursor: TreeCursor, options?: TreeCommitOptions) => void;
  /** A press on a row: open a branch and report it. */
  readonly activate: (row: TreeRow<T>) => void;
  /** Apply one key event: a tree key, else type-ahead. */
  readonly handleKey: (event: EventPayload) => void;
  /** Attach a row's runtime instance so a move can focus it. */
  readonly attach: (key: string) => (instance: PublicInstance | null) => void;
  /** Whether the platform focus is on one of this tree's rows. */
  readonly holdsFocus: () => boolean;
}

/** Hold one tree's cursor and move native focus with it. */
export const useTree = <T>({
  rows,
  labelOf,
  cursor,
  onCursorChange,
  defaultCursor,
  onActivate,
}: UseTreeOptions<T>): TreeController<T> => {
  const renderer = useGpuix().renderer;
  const [uncontrolled, setUncontrolled] = useState<TreeCursor>(
    defaultCursor ?? emptyCursor,
  );
  const resolved = cursor ?? uncontrolled;
  const elements = useRef(new Map<string, number>());
  const focused = useRef<Option.Option<string>>(resolved.active);
  /**
   * Whether the current cursor came from this tree's own keys or presses.
   *
   * A move the tree produced is already the one the reader made, so the row is
   * focused in the same commit. A move the caller produced is retried on the
   * next tick, after the runtime has handed the press its focus.
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
    (next: TreeCursor, options?: TreeCommitOptions) => {
      fromKeys.current = options?.focus !== false;
      if (options?.focus === false) focused.current = next.active;
      if (cursor === undefined) setUncontrolled(next);
      onCursorChange?.(next);
    },
    [cursor, onCursorChange],
  );

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

  const activate = useCallback(
    (row: TreeRow<T>) => {
      const onRow = { ...resolved, active: Option.some(row.key) };
      // A press on a branch opens or closes it; every press also reports the
      // row, so a file tree can preview a file and a folder can be opened by its
      // row.
      commit(row.hasChildren ? treeCursorMove(rows, onRow, "enter") : onRow);
      onActivate?.(row);
    },
    [commit, onActivate, resolved, rows],
  );

  const handleKey = useCallback(
    (event: EventPayload) => {
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
    },
    [commit, onActivate, resolved, rows, typeahead],
  );

  const attach = useCallback(
    (key: string) => (instance: PublicInstance | null) => {
      if (instance === null) elements.current.delete(key);
      else elements.current.set(key, instance.id);
    },
    [],
  );

  const holdsFocus = useCallback((): boolean => {
    const id = renderer?.getFocusedElementId?.();
    if (id === undefined || id === null) return false;
    return Arr.some(
      Arr.fromIterable(elements.current.values()),
      (value) => value === id,
    );
  }, [renderer]);

  const tabKey = Option.match(cursorRow(rows, resolved), {
    onNone: () => Option.none<string>(),
    onSome: (row) => Option.some(row.key),
  });

  return {
    cursor: resolved,
    tabKey,
    commit,
    activate,
    handleKey,
    attach,
    holdsFocus,
  };
};
