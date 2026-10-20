/**
 * List and ListItem: a vertical collection of rows, optionally single- or
 * multi-selectable with a roving tab stop. A plain list with `onActivate` takes
 * the same roving stop and Enter activation; a presentational plain list has
 * neither.
 *
 * This is the keyboard and selection foundation the menus and tabs reuse: the
 * item registry `internal/collection.ts` is shared, and the navigation rules live
 * there rather than here. The multiple-selection arithmetic lives in
 * `list/selection.ts` for the same reason.
 *
 * Two measured facts shape the implementation (probe, 2026-10-17):
 *
 * - a key event fired on a focused row **bubbles** to the list's `onKeyDown`, so
 *   the list can own the keys while the row owns the focus; the list acts only
 *   while a registered row holds focus, so a control in a row's `leading` or
 *   `trailing` slot keeps its own keys;
 * - `@gpuix/native@0.10.0` has no `focusVisible`, so the active row's ring shows
 *   for a click as well as for the keyboard.
 *
 * The roving origin is read from the renderer when a key arrives, because a
 * native focus change never runs React's `onFocus`; React state only paints
 * (plan 367's rule, applied here in plan 578). For the same reason the row that
 * holds focus is sampled every 50 ms while the list has rows, so a row removed
 * by the app can still hand the user's focus on instead of dropping it (plan 708).
 */

import type { EventPayload, Props, PublicInstance } from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import { Match, pipe } from "effect";
import * as Arr from "effect/Array";
import * as HashSet from "effect/HashSet";
import * as Option from "effect/Option";
import {
  Children,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  ACTIVE,
  createRowMasks,
  SELECTED,
  TABBABLE,
  type RowMasks,
} from "./list/row-state.js";
import {
  firstEnabled,
  lastEnabled,
  nextEnabled,
  type CollectionItem,
} from "./internal/collection.js";
import { controlName, plainText } from "./internal/name.js";
import { useMergedRef } from "./internal/ref.js";
import { stateDescription } from "./internal/state-description.js";
import { HoverGroupContext, type HoverGroup } from "./internal/hover-group.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import {
  isActivation,
  isDown,
  isEnter,
  isFirst,
  isLast,
  isSelectAll,
  isUp,
  typedChar,
} from "./internal/key.js";
import { useNativeFocusId } from "./internal/native-focus.js";
import { focusRing, textStyle, useTheme } from "./internal/theme.js";
import { useTypeahead } from "./internal/typeahead.js";
import { range, sameValues, selectAll, toggle } from "./list/selection.js";

/** Whether the list only presents rows, or also tracks a selection. */
export type ListSelectionMode = "none" | "single" | "multiple";

/** One registered row: its value, whether it accepts input, its native id, and
 *  the text type-ahead searches. */
interface Row {
  readonly value: string;
  readonly disabled: boolean;
  readonly nativeId: number;
  readonly label: string;
}

/**
 * Which row held focus, and whether the row's own host held it or a control in
 * its `leading`/`trailing` slot. A native focus change runs no React `onFocus`
 * and a removed host cannot be read afterwards, so the holder is observed while
 * it still exists (plan 708).
 */
interface FocusHolder {
  readonly value: string;
  readonly viaRow: boolean;
}

/** The rules a {@link ListItem} follows; throws when there is no list above it. */
interface ListContextValue {
  readonly selectable: boolean;
  /** Rows take one roving tab stop and the shared navigation keys. */
  readonly focusable: boolean;
  readonly dense: boolean;
  /** The row's own paint state: active, selected and tab stop (plan 339). */
  readonly rowMasks: RowMasks;
  /** Focus and select `value` if it is enabled — what a click does. */
  readonly activate: (value: string, event: EventPayload) => void;
  /** Note that `value` now holds focus, so keys move on from it. */
  readonly noteFocus: (value: string) => void;
  /** Replace the host ids of the focusable controls a row's slots registered. */
  readonly noteMembers: (value: string, ids: ReadonlyArray<number>) => void;
  /** Register a row; returns the unregister function. */
  readonly register: (row: Row) => () => void;
  /** Replace a registered row in place; never moves it. */
  readonly updateRow: (row: Row) => void;
}

const ListContext = createContext<ListContextValue | undefined>(undefined);

/** The stable half of the context: the actions a row calls. */
type ListActions = Pick<
  ListContextValue,
  "activate" | "noteFocus" | "noteMembers" | "register" | "updateRow"
>;

/** The list a {@link ListItem} belongs to. Throws when there is none. */
const useListContext = (): ListContextValue => {
  const value = useContext(ListContext);
  if (value === undefined) {
    // A compound part outside its root is a programming error at the boundary,
    // not a domain failure: plan 110 §8.6 takes the same line for every part.
    throw new Error("ListItem must be used inside List");
  }
  return value;
};

/** `row` replaces the row with the same value, keeping its position. */
const upsert = (rows: ReadonlyArray<Row>, row: Row): ReadonlyArray<Row> =>
  Option.match(
    Arr.findFirst(rows, (candidate) => candidate.value === row.value),
    {
      // Unchanged rows return the same array, so React can skip the re-render
      // that registration would otherwise trigger.
      onNone: () => Arr.append(rows, row),
      onSome: (current) =>
        current.disabled === row.disabled &&
        current.nativeId === row.nativeId &&
        current.label === row.label
          ? rows
          : Arr.map(rows, (candidate) =>
              candidate.value === row.value ? row : candidate,
            ),
    },
  );

/** The shape `internal/collection.ts` navigates over, preserving row order. */
const items = (rows: ReadonlyArray<Row>): ReadonlyArray<CollectionItem> =>
  Arr.map(rows, (row) => ({ id: row.nativeId, disabled: row.disabled }));

/** The index of the row carrying `value`, or `None`. */
const indexOf = (
  rows: ReadonlyArray<Row>,
  value: Option.Option<string>,
): Option.Option<number> =>
  Option.flatMap(value, (target) =>
    Arr.findFirstIndex(rows, (row) => row.value === target),
  );

/** The row at a collection index, or `None` when the index is out of range. */
const rowAt = (
  rows: ReadonlyArray<Row>,
  index: Option.Option<number>,
): Option.Option<Row> =>
  Option.flatMap(index, (position) => Arr.get(rows, position));

/**
 * Which row owns the tab stop: the active row, else the first selected one in
 * declaration order, else the first row that accepts input. Exactly one row is
 * tabbable, which is what makes a list a single stop rather than one stop per
 * row. `active` must be a live row (`liveActive`): a vanished or disabled row
 * would otherwise become the list's only stop.
 */
const tabbableValue = (
  rows: ReadonlyArray<Row>,
  active: Option.Option<string>,
  selected: ReadonlyArray<string>,
  selectable: boolean,
): Option.Option<string> =>
  pipe(
    active,
    Option.orElse(() =>
      selectable
        ? Option.map(
            Arr.findFirst(
              rows,
              (row) => !row.disabled && Arr.contains(row.value)(selected),
            ),
            (row) => row.value,
          )
        : Option.none(),
    ),
    Option.orElse(() =>
      Option.map(
        Arr.findFirst(rows, (row) => !row.disabled),
        (row) => row.value,
      ),
    ),
  );

/**
 * The public value in one internal shape: zero or more selected values.
 * `undefined` is React's controlled/uncontrolled discriminator, so it is
 * converted to `Option` at the call site rather than leaking further.
 */
const controlledValues = (
  props: ListProps,
): ReadonlyArray<string> | undefined =>
  Match.value(props).pipe(
    Match.when({ selectionMode: "multiple" }, (p) => p.value),
    Match.when({ selectionMode: "single" }, (p) =>
      Option.getOrUndefined(Option.map(Option.fromNullishOr(p.value), Arr.of)),
    ),
    Match.orElse(() => undefined),
  );

/** The public initial value in the same internal shape. */
const initialValues = (props: ListProps): ReadonlyArray<string> =>
  Match.value(props).pipe(
    Match.when({ selectionMode: "multiple" }, (p) => p.defaultValue ?? []),
    Match.when({ selectionMode: "single" }, (p) =>
      Option.match(Option.fromNullishOr(p.defaultValue), {
        onNone: () => Arr.empty<string>(),
        onSome: (value) => (value === "" ? Arr.empty<string>() : Arr.of(value)),
      }),
    ),
    Match.orElse(() => Arr.empty<string>()),
  );

/** Report an internal selection in the shape the current mode promises. */
const report = (props: ListProps, next: ReadonlyArray<string>): void =>
  Match.value(props).pipe(
    Match.when({ selectionMode: "multiple" }, (p) => p.onValueChange?.(next)),
    Match.when({ selectionMode: "single" }, (p) =>
      p.onValueChange?.(next[0] ?? ""),
    ),
    Match.orElse(() => undefined),
  );

/** The props shared by every selection mode. */
interface ListBaseProps extends Omit<Props, "children"> {
  /** Row height `rowHeight` instead of `rowHeight + spacing.md`. */
  readonly dense?: boolean;
  /**
   * The list's accessible name. A caller `aria-label` wins, as everywhere else;
   * 0.10.0 cannot name a role-bearing `div` from its text children, so an
   * unnamed listbox is announced as a bare "list box" (plan 792).
   */
  readonly label?: string;
  readonly children?: PartChildren;
}

/** The modes that can run a row action. */
interface Activatable {
  /**
   * Run the row's action: `Enter` on the active row, or a press in single and
   * no-selection modes. Disabled rows never activate. A multiple-selection
   * list has no activation, and there is no double-click contract (the host's
   * `clickCount` is always 1; plan 525 §2).
   */
  readonly onActivate?: (value: string) => void;
}

/** {@link List} props: the value shape follows the selection mode. */
export type ListProps =
  | (ListBaseProps &
      Activatable & {
        readonly selectionMode?: "none";
        readonly value?: never;
        readonly defaultValue?: never;
        readonly onValueChange?: never;
      })
  | (ListBaseProps &
      Activatable & {
        readonly selectionMode: "single";
        readonly value?: string;
        readonly defaultValue?: string;
        readonly onValueChange?: (value: string) => void;
      })
  | (ListBaseProps & {
      readonly selectionMode: "multiple";
      /** A multiple list toggles rows; it has no activation action. */
      readonly onActivate?: never;
      readonly value?: ReadonlyArray<string>;
      readonly defaultValue?: ReadonlyArray<string>;
      readonly onValueChange?: (values: ReadonlyArray<string>) => void;
    });

/**
 * A vertical list of rows. With `selectionMode="single"` it is a `listbox`: arrow
 * keys move a roving tab stop, Home/End jump, Enter/Space select, and a click
 * selects the row it lands on. `selectionMode="multiple"` keeps that keyboard
 * model and adds the desktop modifiers: a plain click selects one row, Cmd/Ctrl
 * toggles, Shift extends the range from the anchor, and Shift+Arrow extends from
 * the keyboard. A disabled row is skipped by every path. A single or
 * `selectionMode="none"` list may also pass `onActivate` to run a row action;
 * a plain list with it keeps the same roving tab stop and Enter activation,
 * while a plain list without it stays presentational.
 */
export const List = (props: ListProps) => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  // The four selection props are read through `props` so the mode narrows them;
  // this destructure only strips them from the host props.
  const {
    selectionMode: _selectionMode,
    value: _value,
    defaultValue: _defaultValue,
    onValueChange: _onValueChange,
    onActivate,
    dense = false,
    label,
    onKeyDown,
    children,
    style,
    ...rest
  } = props;
  const selectionMode = props.selectionMode ?? "none";
  const selectable = selectionMode !== "none";
  // A plain list is still operable when it has a row action: it takes the same
  // roving tab stop as a selectable list, without any selection state.
  const focusable = selectable || onActivate !== undefined;
  const multiple = selectionMode === "multiple";

  const controlled = Option.fromNullishOr(controlledValues(props));
  const [uncontrolled, setUncontrolled] = useState<ReadonlyArray<string>>(() =>
    initialValues(props),
  );
  const selected = Option.getOrElse(controlled, () => uncontrolled);
  const [anchor, setAnchor] = useState<Option.Option<string>>(Option.none());
  const [active, setActive] = useState<Option.Option<string>>(Option.none());
  const [rows, setRows] = useState<ReadonlyArray<Row>>([]);
  const [rowMasks] = useState(createRowMasks);

  /**
   * The row the user is on, when that row still exists and accepts input. A list
   * whose rows are data loses them: a filtered-out or newly disabled row must not
   * keep the ring, the tab stop or the keys (plan 510).
   */
  const liveActive = useMemo(
    () =>
      Option.filter(active, (value) =>
        Arr.some(rows, (row) => row.value === value && !row.disabled),
      ),
    [active, rows],
  );

  /**
   * The row that held focus when it was last observable. A native focus change
   * runs no React `onFocus` and a removed host can no longer be read, so the
   * holder is remembered while the element still exists (plan 708).
   */
  const heldFocus = useRef<Option.Option<FocusHolder>>(Option.none());

  /**
   * The host ids of the focusable controls a row registered for its `leading`
   * and `trailing` slots, by row value. They live in a ref because nothing
   * renders them: the handover reads them once per commit.
   */
  const members = useRef(new Map<string, ReadonlyArray<number>>());

  const noteMembers = useCallback(
    (value: string, ids: ReadonlyArray<number>) => {
      if (ids.length === 0) {
        members.current.delete(value);
        return;
      }
      members.current.set(value, ids);
    },
    [],
  );

  /**
   * Which row a host id belongs to: its own row, else a row whose slot control
   * registered that host. Members live in a ref because nothing renders them.
   */
  const focusHolderOf = useCallback(
    (id: number | null): Option.Option<FocusHolder> =>
      id === null
        ? Option.none()
        : pipe(
            Arr.findFirst(rows, (row) => row.nativeId === id),
            Option.match({
              onNone: () =>
                Option.map(
                  Arr.findFirst(rows, (row) =>
                    Arr.contains(id)(members.current.get(row.value) ?? []),
                  ),
                  (row) => ({ value: row.value, viaRow: false }),
                ),
              onSome: (row) => Option.some({ value: row.value, viaRow: true }),
            }),
          ),
    [rows],
  );

  /**
   * The host that held focus between commits, sampled: a native focus change
   * runs no React `onFocus` (plans 536/540), and a host removed in the next
   * commit cannot be read after it is gone, so the row it belonged to is
   * remembered while it still exists (plan 708).
   */
  const nativeFocus = useNativeFocusId(rows.length > 0);

  /**
   * The row a key acts on or moves from: the natively focused registered row,
   * then the roving state. A native focus change never runs React's `onFocus`
   * (0.10.0), so `Tab` into the list leaves `active` empty; the renderer still
   * names the row, the same rule Tabs adopted in plan 367.
   */
  const origin = useCallback((): Option.Option<Row> => {
    const focused = renderer?.getFocusedElementId?.();
    const native =
      focused === undefined || focused === null
        ? Option.none<Row>()
        : Arr.findFirst(
            rows,
            (row) => row.nativeId === focused && !row.disabled,
          );
    return Option.orElse(native, () =>
      Option.flatMap(liveActive, (value) =>
        Arr.findFirst(rows, (row) => row.value === value),
      ),
    );
  }, [liveActive, renderer, rows]);

  const commit = useCallback(
    (next: ReadonlyArray<string>) => {
      if (sameValues(next, selected)) return;
      if (Option.isNone(controlled)) setUncontrolled(next);
      report(props, next);
    },
    [controlled, props, selected],
  );

  const updateRow = useCallback(
    (row: Row) => setRows((current) => upsert(current, row)),
    [setRows],
  );

  const register = useCallback(
    (row: Row) => {
      updateRow(row);
      return () => {
        members.current.delete(row.value);
        setRows((current) =>
          Arr.filter(current, (candidate) => candidate.value !== row.value),
        );
      };
    },
    [setRows, updateRow],
  );

  const setActiveIfChanged = useCallback((value: string) => {
    setActive((current) =>
      Option.exists(current, (candidate) => candidate === value)
        ? current
        : Option.some(value),
    );
  }, []);

  const focusRow = useCallback(
    (row: Row) => {
      setActiveIfChanged(row.value);
      heldFocus.current = Option.some({ value: row.value, viaRow: true });
      renderer?.focusElement?.(row.nativeId);
    },
    [renderer, setActiveIfChanged],
  );

  /**
   * Adopt focus the row already got — from Tab, or from the consumer focusing it
   * — so the first arrow key moves on from where the user is, not from the top.
   */
  const noteFocus = useCallback(
    (value: string) => {
      setActiveIfChanged(value);
      Option.match(
        Arr.findFirst(rows, (row) => row.value === value),
        {
          onNone: () => undefined,
          onSome: () => {
            heldFocus.current = Option.some({ value, viaRow: true });
          },
        },
      );
    },
    [rows, setActiveIfChanged],
  );

  /**
   * Move focus one enabled row from the row that holds focus. A plain move
   * re-anchors; a Shift move in multiple mode selects the range from the anchor
   * — or, when there is none yet, from the row the move started on.
   */
  const moveBy = useCallback(
    (delta: 1 | -1, extend: boolean) => {
      const from = Option.map(origin(), (row) => row.value);
      pipe(
        rowAt(rows, nextEnabled(items(rows), indexOf(rows, from), delta)),
        Option.match({
          onNone: () => undefined,
          onSome: (row) => {
            focusRow(row);
            if (!extend || !multiple) {
              setAnchor(Option.some(row.value));
              return;
            }
            commit(
              range(
                rows,
                Option.getOrElse(anchor, () =>
                  Option.getOrElse(from, () => row.value),
                ),
                row.value,
              ),
            );
          },
        }),
      );
    },
    [anchor, commit, focusRow, multiple, origin, rows],
  );

  const jumpTo = useCallback(
    (edge: "first" | "last") => {
      const index =
        edge === "first" ? firstEnabled(items(rows)) : lastEnabled(items(rows));
      pipe(
        rowAt(rows, index),
        Option.match({
          onNone: () => undefined,
          onSome: (row) => {
            focusRow(row);
            setAnchor(Option.some(row.value));
          },
        }),
      );
    },
    [focusRow, rows],
  );

  /** The row with `value`, when it exists and accepts input. */
  const enabledRow = useCallback(
    (target: string) =>
      pipe(
        Arr.findFirst(rows, (row) => row.value === target),
        Option.filter((row) => !row.disabled),
      ),
    [rows],
  );

  /** The keyboard activation: select one, or toggle one in multiple mode. */
  const select = useCallback(
    (target: string) => {
      pipe(
        enabledRow(target),
        Option.match({
          onNone: () => undefined,
          onSome: (row) => {
            setAnchor(Option.some(row.value));
            commit(multiple ? toggle(selected, row.value) : Arr.of(row.value));
          },
        }),
      );
    },
    [commit, enabledRow, multiple, selected],
  );

  /**
   * A click: focus the row, then apply the pointer contract. In multiple mode
   * Cmd/Ctrl toggles and Shift takes the range from the anchor; a plain click
   * replaces the selection, the desktop file-list convention.
   */
  const activate = useCallback(
    (target: string, event: EventPayload) => {
      pipe(
        enabledRow(target),
        Option.match({
          onNone: () => undefined,
          onSome: (row) => {
            focusRow(row);
            if (!selectable) {
              onActivate?.(row.value);
              return;
            }
            const extend = multiple && event.modifiers?.shift === true;
            const additive =
              multiple &&
              (event.modifiers?.cmd === true || event.modifiers?.ctrl === true);
            if (extend) {
              commit(
                range(
                  rows,
                  Option.getOrElse(anchor, () => row.value),
                  row.value,
                ),
              );
              return;
            }
            setAnchor(Option.some(row.value));
            commit(additive ? toggle(selected, row.value) : Arr.of(row.value));
            if (!multiple) onActivate?.(row.value);
          },
        }),
      );
    },
    [
      anchor,
      commit,
      enabledRow,
      focusRow,
      multiple,
      onActivate,
      rows,
      selectable,
      selected,
    ],
  );

  const selectActive = useCallback(() => {
    pipe(
      Option.map(origin(), (row) => row.value),
      Option.match({
        onNone: () => undefined,
        onSome: select,
      }),
    );
  }, [origin, select]);

  /** Run the focused row's action; a missing row does nothing. */
  const activateActive = useCallback(() => {
    pipe(
      Option.map(origin(), (row) => row.value),
      Option.match({
        onNone: () => undefined,
        onSome: (value) => onActivate?.(value),
      }),
    );
  }, [onActivate, origin]);

  /** Cmd/Ctrl+A: select every enabled row and anchor at the first of them. */
  const selectEveryRow = useCallback(() => {
    if (!multiple) return;
    const next = selectAll(rows);
    pipe(
      Arr.head(next),
      Option.match({
        onNone: () => undefined,
        onSome: (value) => setAnchor(Option.some(value)),
      }),
    );
    commit(next);
  }, [commit, multiple, rows]);

  /** Where a typed prefix searches from: the row the user is on. */
  const typeaheadOrigin = useCallback(
    () =>
      indexOf(
        rows,
        Option.map(origin(), (row) => row.value),
      ),
    [origin, rows],
  );

  const typeahead = useTypeahead(rows, typeaheadOrigin, (row) => {
    focusRow(row);
    // A typed jump re-anchors, exactly like an arrow move, so a following
    // Shift+click extends from the row the user reached.
    setAnchor(Option.some(row.value));
  });

  /**
   * Whether a registered row holds focus. A key that bubbles from a control in
   * a row's leading/trailing slot belongs to that control; the payload names
   * the handler's element, not the focused one, so the renderer is asked.
   */
  const ownsRowKeys = (): boolean => {
    const focused = renderer?.getFocusedElementId?.();
    if (focused === undefined || focused === null) return false;
    return Arr.some(rows, (row) => row.nativeId === focused);
  };

  const handleKeyDown = (event: EventPayload): void => {
    if (!focusable) return;
    if (!ownsRowKeys()) return;
    // Paint the row the user is on before the key moves it: a native focus
    // change never ran React's `onFocus`, so `active` may still be empty.
    Option.match(origin(), {
      onNone: () => undefined,
      onSome: (row) => setActiveIfChanged(row.value),
    });
    const extend = multiple && event.modifiers?.shift === true;
    pipe(
      typedChar(event),
      Option.match({
        // A typed letter jumps to a row; it never also runs a named-key rule.
        onSome: typeahead,
        onNone: () =>
          Match.value(event).pipe(
            Match.when(isEnter, () => {
              // Enter is the row action; a selectable list also selects first.
              if (selectable) selectActive();
              activateActive();
            }),
            // At this point the key is Space: it selects, never activates.
            Match.when(isActivation, () => {
              if (selectable) selectActive();
            }),
            Match.when(isSelectAll, selectEveryRow),
            Match.when(isDown, () => moveBy(1, extend)),
            Match.when(isUp, () => moveBy(-1, extend)),
            Match.when(isFirst, () => jumpTo("first")),
            Match.when(isLast, () => jumpTo("last")),
            Match.orElse(() => undefined),
          ),
      }),
    );
  };

  const tabbable = useMemo(
    () => tabbableValue(rows, liveActive, selected, selectable),
    [liveActive, rows, selectable, selected],
  );

  /**
   * A row that vanishes or turns disabled takes the user's focus with it: the
   * native element is gone, and a disabled row cannot run its action. The origin
   * is the row that held focus when it still existed — sampled, because a native
   * focus change runs no React `onFocus` and a removed host can no longer be
   * read (plans 536/540/578, 708). Hand focus to the row that now owns the tab
   * stop, but never steal it from another control the consumer focused in the
   * same update (plan 510).
   *
   * A control in a row's `leading`/`trailing` slot owns its own keys (plan 577),
   * so a row that only turns `disabled` leaves focus on a control inside it: the
   * control is still enabled. Only a row that is **gone** takes that focus with
   * it, because its host no longer exists.
   */
  useLayoutEffect(() => {
    const live = Option.fromNullishOr(
      renderer?.getFocusedElementId?.() ?? null,
    );
    const liveHolder = Option.flatMap(live, focusHolderOf);
    const holder = Option.orElse(liveHolder, () => heldFocus.current);
    const target = Option.flatMap(holder, (held) =>
      Arr.findFirst(rows, (row) => row.value === held.value),
    );
    const lost = Option.exists(holder, (held) =>
      Option.match(target, {
        onNone: () => true,
        onSome: (row) => held.viaRow && row.disabled,
      }),
    );
    // A control outside the list that the consumer focused in this update wins.
    const claimed = Option.isSome(live) && Option.isNone(liveHolder);
    if (lost && !claimed) {
      Option.match(tabbable, {
        onNone: () => undefined,
        onSome: (value) =>
          Option.match(
            Arr.findFirst(rows, (row) => row.value === value),
            {
              onNone: () => undefined,
              onSome: focusRow,
            },
          ),
      });
    }
  }, [focusHolderOf, focusRow, renderer, rows, tabbable]);

  /**
   * Remember the row the focus belongs to, so the next rows change can tell a
   * vanished host from a list that never held focus. Runs after the handover:
   * the handover must read the holder from before this commit. The live read
   * wins over the sample (which is up to one interval old), so a focus the list
   * just restored is not overwritten by a stale row.
   */
  useLayoutEffect(() => {
    heldFocus.current = Option.orElse(
      Option.flatMap(
        Option.fromNullishOr(renderer?.getFocusedElementId?.() ?? null),
        focusHolderOf,
      ),
      () => focusHolderOf(nativeFocus),
    );
  }, [focusHolderOf, nativeFocus, renderer]);

  // The per-row paint state. `rowMasks.replace` notifies a row only when one of
  // its own bits changes, so a focus move re-renders the two rows that moved —
  // not the whole list (plan 339).
  const flags = useMemo(() => {
    const selectedSet = HashSet.fromIterable(selected);
    const isActive = (value: string) =>
      Option.exists(liveActive, (candidate) => candidate === value);
    const isTabbable = (value: string) =>
      Option.exists(tabbable, (candidate) => candidate === value);
    return Arr.map(
      rows,
      (row) =>
        [
          row.value,
          (isActive(row.value) ? ACTIVE : 0) |
            (HashSet.has(selectedSet, row.value) ? SELECTED : 0) |
            (isTabbable(row.value) ? TABBABLE : 0),
        ] as const,
    );
  }, [liveActive, rows, selected, tabbable]);

  useLayoutEffect(() => {
    rowMasks.replace(flags);
  }, [flags, rowMasks]);

  // The actions close over the latest state, but the context object that carries
  // them must never change — a changing context re-renders every row, which is
  // exactly the cost this design removes. The ref is updated after commit and
  // before any event can call through it.
  const handlers = useRef({
    activate,
    noteFocus,
    noteMembers,
    register,
    updateRow,
  });
  useLayoutEffect(() => {
    handlers.current = {
      activate,
      noteFocus,
      noteMembers,
      register,
      updateRow,
    };
  });
  const actions = useMemo<ListActions>(
    () => ({
      activate: (value, event) => handlers.current.activate(value, event),
      noteFocus: (value) => handlers.current.noteFocus(value),
      noteMembers: (value, ids) => handlers.current.noteMembers(value, ids),
      register: (row) => handlers.current.register(row),
      updateRow: (row) => handlers.current.updateRow(row),
    }),
    [],
  );

  const context = useMemo<ListContextValue>(
    () => ({ selectable, focusable, dense, rowMasks, ...actions }),
    [actions, dense, focusable, rowMasks, selectable],
  );

  assertParts(listRoot, children);

  return (
    <ListContext.Provider value={context}>
      <div
        role={selectable ? "listbox" : "list"}
        {...(label === undefined ? {} : { "aria-label": label })}
        {...rest}
        onKeyDown={(event) => {
          handleKeyDown(event);
          onKeyDown?.(event);
        }}
        style={mergeStyles(
          {
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing["2xs"],
          },
          style,
        )}
      >
        {children}
      </div>
    </ListContext.Provider>
  );
};

/** {@link ListItem} props. */
export interface ListItemProps extends Omit<Props, "children" | "style"> {
  /** Stable id, and the value a selection reports. */
  readonly value: string;
  /**
   * The text type-ahead matches. Rows are composed from {@link ListItemTitle}
   * and {@link ListItemDescription}, so the list cannot read the text off
   * `children`; omit this and the row is skipped by type-ahead.
   */
  readonly textValue?: string;
  /** Skipped by the arrow keys and by clicks. */
  readonly disabled?: boolean;
  /** Slot before the text: an avatar, an icon. */
  readonly leading?: ReactNode;
  /** Slot after the text: a badge, a shortcut. */
  readonly trailing?: ReactNode;
  readonly children?: PartChildren;
  /** A style, or a function of the row's state. */
  readonly style?: StateStyle<ListItemState>;
}

/** What a row draws: the roving focus, the selection and input state. */
export interface ListItemState {
  /** The row the list's roving focus is on. */
  readonly active: boolean;
  readonly disabled: boolean;
  readonly selected: boolean;
}

/** One row of a {@link List}. Its text parts are {@link ListItemTitle} and
 *  {@link ListItemDescription}. */
export const ListItem = ({
  value,
  textValue,
  disabled = false,
  autoFocus = false,
  leading,
  trailing,
  children,
  onFocus,
  onClick,
  onMouseEnter,
  onMouseLeave,
  style,
  ref,
  ...rest
}: ListItemProps) => {
  const theme = useTheme();
  const {
    selectable,
    focusable,
    dense,
    rowMasks,
    activate,
    noteFocus,
    noteMembers,
    register,
    updateRow,
  } = useListContext();
  const [selfHovered, setSelfHovered] = useState(false);
  const [memberHovers, setMemberHovers] = useState(0);
  const hovered = !disabled && (selfHovered || memberHovers > 0);
  // The focusable controls in this row's slots, so a row that is removed while
  // one of them holds focus can hand that focus on (plan 708). The group keeps
  // one identity for the row's lifetime: a new object re-renders the slots.
  const slotHosts = useRef<ReadonlyArray<number>>([]);
  const syncSlots = useRef<(ids: ReadonlyArray<number>) => void>(
    () => undefined,
  );
  useLayoutEffect(() => {
    syncSlots.current = (ids) => noteMembers(value, ids);
  });
  const registerSlot = useCallback((id: number) => {
    slotHosts.current = Arr.append(slotHosts.current, id);
    syncSlots.current(slotHosts.current);
    return () => {
      slotHosts.current = Arr.filter(
        slotHosts.current,
        (known) => known !== id,
      );
      syncSlots.current(slotHosts.current);
    };
  }, []);
  const hoverGroup = useMemo<HoverGroup>(
    () => ({
      enter: () => setMemberHovers((count) => count + 1),
      leave: () => setMemberHovers((count) => (count > 0 ? count - 1 : 0)),
      register: registerSlot,
    }),
    [registerSlot],
  );
  const [instance, setInstance] = useState<PublicInstance | undefined>(
    undefined,
  );

  // Stable identity: React only calls a ref callback again when the callback
  // itself changes, and a fresh closure each render would re-register the row
  // (and reorder it) on every paint.
  const attach = useCallback((next: PublicInstance | null) => {
    setInstance(next ?? undefined);
  }, []);
  const setElement = useMergedRef<PublicInstance | null>(attach, ref);

  useLayoutEffect(() => {
    // Registration owns the row's position; it needs the native id, which only
    // exists after the element is committed (`instance` is state, so this
    // re-runs once it arrives).
    if (instance === undefined) return;
    const unregister = register({
      value,
      disabled,
      nativeId: instance.id,
      label: textValue ?? "",
    });
    // A slot control's layout effect runs before the row's, so its host may be
    // known before the row was registered: report it again now (plan 708).
    noteMembers(value, slotHosts.current);
    return unregister;
  }, [instance, noteMembers, register, value]);

  useLayoutEffect(() => {
    // Update in place: re-registering would move the row to the end of the
    // registry, and its position is what the arrow keys and type-ahead read.
    if (instance === undefined) return;
    updateRow({
      value,
      disabled,
      nativeId: instance.id,
      label: textValue ?? "",
    });
  }, [disabled, instance, textValue, updateRow, value]);

  useEffect(() => {
    // `autoFocus` focuses natively after React's effects, so `onFocus` never
    // runs; the list's roving state has to be told (plan 388).
    if (autoFocus && !disabled) noteFocus(value);
  }, [autoFocus, disabled, noteFocus, value]);

  // Only this row's own bits: a focus move notifies every subscriber, but React
  // re-renders a row only when its snapshot actually changed (plan 339).
  const mask = useSyncExternalStore(rowMasks.subscribe, () =>
    rowMasks.get(value),
  );
  const isSelected = selectable && (mask & SELECTED) !== 0;
  const isActive = (mask & ACTIVE) !== 0;
  const isTabbable = (mask & TABBABLE) !== 0;
  const state: ListItemState = {
    active: isActive,
    disabled,
    selected: isSelected,
  };
  // A listbox option gets no name from its contents in 0.10.0, so the row is
  // named the way it types ahead: the caller's `aria-label`, then `textValue`,
  // then its title. A plain `listitem` keeps its content reading.
  const name = selectable
    ? controlName(
        rest["aria-label"] ?? textValue ?? titleTextOf(children),
        children,
      )
    : undefined;
  assertParts(listItem, children);

  return (
    <HoverGroupContext.Provider value={hoverGroup}>
      <div
        role={selectable ? "option" : "listitem"}
        {...(selectable ? { "aria-selected": isSelected } : {})}
        {...rest}
        {...(name === undefined ? {} : { "aria-label": name })}
        {...stateDescription(disabled, rest["aria-description"])}
        ref={setElement}
        autoFocus={autoFocus && !disabled}
        tabIndex={focusable ? (isTabbable ? 0 : -1) : undefined}
        onFocus={(event) => {
          noteFocus(value);
          onFocus?.(event);
        }}
        onClick={
          disabled
            ? undefined
            : (event) => {
                onClick?.(event);
                activate(value, event);
              }
        }
        onMouseEnter={(event) => {
          if (!disabled) setSelfHovered(true);
          onMouseEnter?.(event);
        }}
        onMouseLeave={(event) => {
          if (selfHovered) setSelfHovered(false);
          onMouseLeave?.(event);
        }}
        style={mergeStyles(
          {
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.lg,
            paddingLeft: theme.spacing.lg,
            paddingRight: theme.spacing.lg,
            height: dense
              ? theme.density.rowHeight
              : theme.density.rowHeight + theme.spacing.md,
            borderRadius: theme.radius.sm,
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? "not-allowed" : undefined,
            ...(focusable && !disabled
              ? {
                  cursor: "pointer",
                  hover: { backgroundColor: theme.colors.accent },
                  active: { backgroundColor: theme.colors.active },
                }
              : {}),
            ...(isSelected
              ? {
                  backgroundColor: theme.colors.selected,
                  color: theme.colors.selectedForeground,
                }
              : {}),
            // Hover is per element: a child control's hover cancels the row's
            // declared refinement, so the row tracks its own pointer crossing
            // (plan 606).
            ...(hovered && focusable && !disabled
              ? { backgroundColor: theme.colors.accent }
              : {}),
            // No `focusVisible` in 0.10.0: the active row is ringed whenever it is
            // the active one, keyboard or click.
            ...(isActive ? focusRing(theme) : {}),
          },
          resolveStyle(style, state),
        )}
      >
        {leading === undefined ? null : (
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            {leading}
          </div>
        )}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            minWidth: 0,
          }}
        >
          {children}
        </div>
        {trailing === undefined ? null : (
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            {trailing}
          </div>
        )}
      </div>
    </HoverGroupContext.Provider>
  );
};

/** The first {@link ListItemTitle} child's plain text, if the row has one. */
const titleTextOf = (children: ReactNode): string | undefined =>
  Option.getOrUndefined(
    Option.map(
      Option.flatMap(
        Arr.findFirst(
          Children.toArray(children),
          (child): child is ReactElement<{ readonly children?: ReactNode }> =>
            isValidElement<{ readonly children?: ReactNode }>(child) &&
            child.type === ListItemTitle,
        ),
        (title) => Option.fromNullishOr(title.props.children),
      ),
      plainText,
    ),
  );

/** The row's one-line label. */
export const ListItemTitle = ({ style, ...rest }: Props) => {
  const theme = useTheme();
  return (
    <text
      {...rest}
      style={mergeStyles(
        { ...textStyle(theme, "body"), color: theme.colors.foreground },
        style,
      )}
    />
  );
};

/** The row's second line: metadata, a path, a subtitle. */
export const ListItemDescription = ({ style, ...rest }: Props) => {
  const theme = useTheme();
  return (
    <text
      {...rest}
      style={mergeStyles(
        {
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        },
        style,
      )}
    />
  );
};

/** Every part of List, so a misplaced sibling is named. */
const listParts: ReadonlyArray<PartComponent> = [
  List,
  ListItem,
  ListItemTitle,
  ListItemDescription,
];

const listRoot: PartsContract = {
  parent: "List",
  family: listParts,
  accepts: [ListItem],
  hint: "Put ListItem rows directly inside List.",
};

const listItem: PartsContract = {
  parent: "ListItem",
  family: listParts,
  accepts: [ListItemTitle, ListItemDescription],
  hint: "Put ListItemTitle and ListItemDescription directly inside ListItem.",
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const listMeta = {
  name: "Lists / list items",
  tier: 2,
  status: "done",
  gpuixSupport: "yes",
  focusable: true,
  limitations: [
    "no aria-multiselectable in 0.10.0, so the multiple mode is announced only per row",
    "type-ahead matches an explicit ListItem textValue, not rendered children",
    "activation is a callback on single/none lists: no href or link role; a plain list without onActivate has no tab stop, and a multiple list has no activation",
    "focus continuity covers a Button/IconButton in a slot (the hover-group members): a custom interactive child is not tracked",
    "no drag reorder or virtualisation",
  ],
  docs: "docs/list.mdx",
  example: "examples/list.example.tsx",
  testFile: "src/behaviour/list.test.tsx",
} as const;
