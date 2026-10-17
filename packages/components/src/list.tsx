/**
 * List and ListItem: a vertical collection of rows, optionally single-selectable
 * with a roving tab stop.
 *
 * This is the keyboard and selection foundation the menus and tabs reuse: the
 * item registry `internal/collection.ts` is shared, and the navigation rules live
 * there rather than here.
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
import { useControllableState } from "./internal/controllable.js";
import { isActivation, isDown, isFirst, isLast, isUp } from "./internal/key.js";
import { focusRing, textStyle, useTheme } from "./internal/theme.js";

/** Whether the list only presents rows, or also tracks a selection. */
export type ListSelectionMode = "none" | "single";

/** One registered row: its value, whether it accepts input, and its native id. */
interface Row {
  readonly value: string;
  readonly disabled: boolean;
  readonly nativeId: number;
}

/** The rules a {@link ListItem} follows; throws when there is no list above it. */
interface ListContextValue {
  readonly selectable: boolean;
  readonly dense: boolean;
  readonly selected: string;
  readonly active: Option.Option<string>;
  readonly tabbable: Option.Option<string>;
  /** Select `value` if it is enabled. */
  readonly select: (value: string) => void;
  /** Focus and select `value` if it is enabled — what a click does. */
  readonly activate: (value: string) => void;
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
        current.disabled === row.disabled && current.nativeId === row.nativeId
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
 * Which row owns the tab stop: the active row, else the selected one, else the
 * first row that accepts input. Exactly one row is tabbable, which is what makes
 * a list a single stop rather than one stop per row.
 */
const tabbableValue = (
  rows: ReadonlyArray<Row>,
  active: Option.Option<string>,
  selected: string,
  selectable: boolean,
): Option.Option<string> =>
  pipe(
    active,
    Option.orElse(() =>
      selectable && selected !== "" ? Option.some(selected) : Option.none(),
    ),
    Option.orElse(() =>
      Option.map(
        Arr.findFirst(rows, (row) => !row.disabled),
        (row) => row.value,
      ),
    ),
  );

/** {@link List} props. */
export interface ListProps extends Props {
  /** Default `"none"`: rows are presented, nothing is selectable. */
  readonly selectionMode?: ListSelectionMode;
  /** The controlled selected value. */
  readonly value?: string;
  readonly defaultValue?: string;
  readonly onValueChange?: (value: string) => void;
  /** Row height `rowHeight` instead of `rowHeight + spacing.md`. */
  readonly dense?: boolean;
}

/**
 * A vertical list of rows. With `selectionMode="single"` it is a `listbox`: arrow
 * keys move a roving tab stop, Home/End jump, Enter/Space select, and a click
 * selects the row it lands on. A disabled row is skipped by every path.
 */
export const List = ({
  selectionMode = "none",
  value,
  defaultValue = "",
  onValueChange,
  dense = false,
  onKeyDown,
  style,
  ...rest
}: ListProps) => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const selectable = selectionMode === "single";

  const [selected, setSelected] = useControllableState({
    value,
    defaultValue,
    onChange: onValueChange,
  });
  const [active, setActive] = useState<Option.Option<string>>(Option.none());
  const [rows, setRows] = useState<ReadonlyArray<Row>>([]);

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

  const moveBy = useCallback(
    (delta: 1 | -1) => {
      pipe(
        rowAt(rows, nextEnabled(items(rows), indexOf(rows, active), delta)),
        Option.match({ onNone: () => undefined, onSome: focusRow }),
      );
    },
    [active, focusRow, rows],
  );

  const jumpTo = useCallback(
    (edge: "first" | "last") => {
      const index =
        edge === "first" ? firstEnabled(items(rows)) : lastEnabled(items(rows));
      pipe(
        rowAt(rows, index),
        Option.match({ onNone: () => undefined, onSome: focusRow }),
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

  const select = useCallback(
    (target: string) => {
      pipe(
        enabledRow(target),
        Option.match({
          onNone: () => undefined,
          onSome: (row) => setSelected(row.value),
        }),
      );
    },
    [enabledRow, setSelected],
  );

  const activate = useCallback(
    (target: string) => {
      pipe(
        enabledRow(target),
        Option.match({
          onNone: () => undefined,
          onSome: (row) => {
            focusRow(row);
            if (selectable) select(target);
          },
        }),
      );
    },
    [enabledRow, focusRow, select, selectable],
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

  const handleKeyDown = (event: EventPayload): void => {
    if (!selectable) return;
    Match.value(event).pipe(
      Match.when(isActivation, selectActive),
      Match.when(isDown, () => moveBy(1)),
      Match.when(isUp, () => moveBy(-1)),
      Match.when(isFirst, () => jumpTo("first")),
      Match.when(isLast, () => jumpTo("last")),
      Match.orElse(() => undefined),
    );
  };

  const context = useMemo<ListContextValue>(
    () => ({
      selectable,
      dense,
      selected,
      active,
      tabbable: tabbableValue(rows, active, selected, selectable),
      select,
      activate,
      noteFocus,
      register,
    }),
    [
      activate,
      active,
      dense,
      noteFocus,
      register,
      rows,
      select,
      selectable,
      selected,
    ],
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
  disabled = false,
  leading,
  trailing,
  children,
  onFocus,
  style,
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

  useLayoutEffect(() => {
    // Registration needs the native id, which only exists after the element is
    // committed; `instance` is state, so this effect re-runs once it arrives.
    if (instance === undefined) return;
    return register({ value, disabled, nativeId: instance.id });
  }, [disabled, instance, register, value]);

  const isSelected = selectable && selected === value;
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
      ref={attach}
      tabIndex={selectable ? (isTabbable ? 0 : -1) : undefined}
      onFocus={(event) => {
        noteFocus(value);
        onFocus?.(event);
      }}
      onClick={disabled ? undefined : () => activate(value)}
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
    "single selection only: no multi-select, no typeahead, no drag reorder",
  ],
  docs: "docs/list.mdx",
  example: "examples/list.example.tsx",
  testFile: "src/behaviour/list.test.tsx",
} as const;
