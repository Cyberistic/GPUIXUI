import { useGpuix, type EventPayload, type PublicInstance } from "@gpuix/react";
import { typedChar, useTypeahead } from "@gpuixui/components/typeahead";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { recordsOf } from "../internal/list.js";
import {
  cursorRow,
  emptyCursor,
  isTreeKey,
  treeCursorMove,
  treeName,
  type TreeCursor,
  type TreeRow,
} from "./logic.js";

export interface UseTreeOptions<T> {
  readonly rows: ReadonlyArray<TreeRow<T>>;

  readonly labelOf: (node: T) => string;

  readonly cursor?: TreeCursor;

  readonly onCursorChange?: (cursor: TreeCursor) => void;

  readonly defaultCursor?: TreeCursor;

  readonly onActivate?: (row: TreeRow<T>) => void;
}

export interface TreeCommitOptions {
  readonly focus?: boolean;
}

export interface TreeController<T> {
  readonly cursor: TreeCursor;

  readonly tabKey: Option.Option<string>;

  readonly commit: (cursor: TreeCursor, options?: TreeCommitOptions) => void;

  readonly activate: (row: TreeRow<T>) => void;

  readonly handleKey: (event: EventPayload) => void;

  readonly attach: (key: string) => (instance: PublicInstance | null) => void;

  readonly holdsFocus: () => boolean;
}

export const useTree = <T>({
  rows,
  labelOf,
  cursor,
  onCursorChange,
  defaultCursor,
  onActivate,
}: UseTreeOptions<T>): TreeController<T> => {
  const renderer = useGpuix().renderer;

  const visible = useMemo(() => recordsOf(rows), [rows]);
  const [uncontrolled, setUncontrolled] = useState<TreeCursor>(
    defaultCursor ?? emptyCursor,
  );
  const resolved = cursor ?? uncontrolled;
  const elements = useRef(new Map<string, number>());
  const focused = useRef<Option.Option<string>>(resolved.active);

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
    Arr.map(visible, (row) => ({
      key: row.key,

      label: treeName(labelOf(row.node), row.key),
      disabled: false,
    })),
    Option.flatMap(resolved.active, (key) =>
      Arr.findFirstIndex(visible, (row) => row.key === key),
    ),
    (match) => commit({ ...resolved, active: Option.some(match.key) }),
  );

  useLayoutEffect(() => {
    if (
      Option.getOrUndefined(resolved.active) ===
      Option.getOrUndefined(focused.current)
    ) {
      fromKeys.current = false;
      return;
    }
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

      commit(row.hasChildren ? treeCursorMove(visible, onRow, "enter") : onRow);
      onActivate?.(row);
    },
    [commit, onActivate, resolved, visible],
  );

  const holdsFocus = useCallback((): boolean => {
    const id = renderer?.getFocusedElementId?.();
    if (id === undefined || id === null) return false;
    return Arr.some(
      Arr.fromIterable(elements.current.values()),
      (value) => value === id,
    );
  }, [renderer]);

  const handleKey = useCallback(
    (event: EventPayload) => {
      if (!holdsFocus()) return;
      if (isTreeKey(event.key)) {
        const next = treeCursorMove(visible, resolved, event.key);
        commit(next);
        if (event.key === "enter" || event.key === "space") {
          if (onActivate !== undefined) {
            Option.match(next.active, {
              onNone: () => {},
              onSome: (key) => {
                Option.match(
                  Arr.findFirst(visible, (candidate) => candidate.key === key),
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
    [commit, onActivate, resolved, visible, typeahead, holdsFocus],
  );

  const attach = useCallback(
    (key: string) => (instance: PublicInstance | null) => {
      if (instance === null) elements.current.delete(key);
      else elements.current.set(key, instance.id);
    },
    [],
  );

  const tabKey = Option.match(cursorRow(visible, resolved), {
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
