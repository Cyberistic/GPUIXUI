/**
 * List and ListItem: a vertical collection of rows, optionally single- or
 * multi-selectable with a roving tab stop.
 *
 * This is the keyboard and selection foundation the menus and tabs reuse: the
 * item registry `internal/collection.ts` is shared, and the navigation rules live
 * there rather than here. The multiple-selection arithmetic lives in
 * `list/selection.ts` for the same reason.
 *
 * Two measured facts shape the implementation (probe, 2026-10-17):
 *
 * - a key event fired on a focused row **bubbles** to the list's `onKeyDown`, so
 *   the list can own the keys while the row owns the focus;
 * - `@gpuix/native@0.10.0` has no `focusVisible`, so the active row's ring shows
 *   for a click as well as for the keyboard.
 */

import type { EventPayload, Props, PublicInstance } from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { Match, pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  firstEnabled,
  lastEnabled,
  nextEnabled,
  type CollectionItem,
} from "./internal/collection.js";
import { useMergedRef } from "./internal/ref.js";
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

/** The rules a {@link ListItem} follows; throws when there is no list above it. */
interface ListContextValue {
  readonly selectable: boolean;
  readonly dense: boolean;
  readonly selected: ReadonlyArray<string>;
  readonly active: Option.Option<string>;
  readonly tabbable: Option.Option<string>;
  /** Focus and select `value` if it is enabled — what a click does. */
  readonly activate: (value: string, event: EventPayload) => void;
  /** Note that `value` now holds focus, so keys move on from it. */
  readonly noteFocus: (value: string) => void;
  /** Register a row; returns the unregister function. */
  readonly register: (row: Row) => () => void;
}

const ListContext = createContext<ListContextValue | undefined>(undefined);

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
 * row.
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
interface ListBaseProps extends Props {
  /** Row height `rowHeight` instead of `rowHeight + spacing.md`. */
  readonly dense?: boolean;
}

/** The modes that can run a row action. */
interface Activatable {
  /**
   * Run the row's action: `Enter` on the active row, a double click in single
   * mode, or a click with no selection mode. Disabled rows never activate. A
   * multiple-selection list has no activation.
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
 * `selectionMode="none"` list may also pass `onActivate` to run a row action.
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
    onKeyDown,
    style,
    ...rest
  } = props;
  const selectionMode = props.selectionMode ?? "none";
  const selectable = selectionMode !== "none";
  const multiple = selectionMode === "multiple";

  const controlled = Option.fromNullishOr(controlledValues(props));
  const [uncontrolled, setUncontrolled] = useState<ReadonlyArray<string>>(() =>
    initialValues(props),
  );
  const selected = Option.getOrElse(controlled, () => uncontrolled);
  const [anchor, setAnchor] = useState<Option.Option<string>>(Option.none());
  const [active, setActive] = useState<Option.Option<string>>(Option.none());
  const [rows, setRows] = useState<ReadonlyArray<Row>>([]);

  const commit = useCallback(
    (next: ReadonlyArray<string>) => {
      if (sameValues(next, selected)) return;
      if (Option.isNone(controlled)) setUncontrolled(next);
      report(props, next);
    },
    [controlled, props, selected],
  );

  const register = useCallback(
    (row: Row) => {
      setRows((current) => upsert(current, row));
      return () =>
        setRows((current) =>
          Arr.filter(current, (candidate) => candidate.value !== row.value),
        );
    },
    [setRows],
  );

  const focusRow = useCallback(
    (row: Row) => {
      setActive(Option.some(row.value));
      renderer?.focusElement?.(row.nativeId);
    },
    [renderer],
  );

  /**
   * Adopt focus the row already got — from Tab, or from the consumer focusing it
   * — so the first arrow key moves on from where the user is, not from the top.
   */
  const noteFocus = useCallback((value: string) => {
    setActive(Option.some(value));
  }, []);

  /**
   * Move focus one enabled row. A plain move re-anchors; a Shift move in
   * multiple mode selects the range from the anchor to the row it reached.
   */
  const moveBy = useCallback(
    (delta: 1 | -1, extend: boolean) => {
      pipe(
        rowAt(rows, nextEnabled(items(rows), indexOf(rows, active), delta)),
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
                Option.getOrElse(anchor, () => row.value),
                row.value,
              ),
            );
          },
        }),
      );
    },
    [active, anchor, commit, focusRow, multiple, rows],
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
      active,
      Option.match({
        onNone: () => undefined,
        onSome: (target) => select(target),
      }),
    );
  }, [active, select]);

  /** Run the active row's action; a disabled or missing row does nothing. */
  const activateActive = useCallback(() => {
    pipe(
      Option.flatMap(active, enabledRow),
      Option.match({
        onNone: () => undefined,
        onSome: (row) => onActivate?.(row.value),
      }),
    );
  }, [active, enabledRow, onActivate]);

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

  const typeahead = useTypeahead(rows, indexOf(rows, active), (row) => {
    focusRow(row);
    // A typed jump re-anchors, exactly like an arrow move, so a following
    // Shift+click extends from the row the user reached.
    setAnchor(Option.some(row.value));
  });

  const handleKeyDown = (event: EventPayload): void => {
    if (!selectable) return;
    const extend = multiple && event.modifiers?.shift === true;
    pipe(
      typedChar(event),
      Option.match({
        // A typed letter jumps to a row; it never also runs a named-key rule.
        onSome: typeahead,
        onNone: () =>
          Match.value(event).pipe(
            Match.when(isEnter, () => {
              if (selectable) selectActive();
              activateActive();
            }),
            Match.when(isActivation, selectActive),
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

  const context = useMemo<ListContextValue>(
    () => ({
      selectable,
      dense,
      selected,
      active,
      tabbable: tabbableValue(rows, active, selected, selectable),
      activate,
      noteFocus,
      register,
    }),
    [activate, active, dense, noteFocus, register, rows, selectable, selected],
  );

  return (
    <ListContext.Provider value={context}>
      <div
        role={selectable ? "listbox" : "list"}
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
      />
    </ListContext.Provider>
  );
};

/** {@link ListItem} props. */
export interface ListItemProps extends Props {
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
}

/** One row of a {@link List}. Its text parts are {@link ListItemTitle} and
 *  {@link ListItemDescription}. */
export const ListItem = ({
  value,
  textValue,
  disabled = false,
  leading,
  trailing,
  children,
  onFocus,
  onClick,
  style,
  ref,
  ...rest
}: ListItemProps) => {
  const theme = useTheme();
  const {
    selectable,
    dense,
    selected,
    active,
    tabbable,
    activate,
    noteFocus,
    register,
  } = useListContext();
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
    // Registration needs the native id, which only exists after the element is
    // committed; `instance` is state, so this effect re-runs once it arrives.
    if (instance === undefined) return;
    return register({
      value,
      disabled,
      nativeId: instance.id,
      label: textValue ?? "",
    });
  }, [disabled, instance, register, textValue, value]);

  const isSelected = selectable && Arr.contains(value)(selected);
  const isActive = Option.exists(active, (candidate) => candidate === value);
  const isTabbable = Option.exists(
    tabbable,
    (candidate) => candidate === value,
  );

  return (
    <div
      role={selectable ? "option" : "listitem"}
      {...(selectable ? { "aria-selected": isSelected } : {})}
      {...rest}
      ref={setElement}
      tabIndex={selectable ? (isTabbable ? 0 : -1) : undefined}
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
          ...(selectable
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
          // No `focusVisible` in 0.10.0: the active row is ringed whenever it is
          // the active one, keyboard or click.
          ...(isActive ? focusRing(theme) : {}),
        },
        style,
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
  );
};

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

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const listMeta = {
  name: "Lists / list items",
  tier: 2,
  status: "done",
  gpuixSupport: "yes",
  limitations: [
    "no aria-multiselectable in 0.10.0, so the multiple mode is announced only per row",
    "type-ahead matches an explicit ListItem textValue, not rendered children",
    "activation is a callback on single/none lists: no href or link role, and a multiple list has no activation",
    "no drag reorder or virtualisation",
  ],
  docs: "docs/list.mdx",
  example: "examples/list.example.tsx",
  testFile: "src/behaviour/list.test.tsx",
} as const;
