/** @jsxImportSource @gpuix/react */
import type {
  EventPayload,
  KeyEvent,
  Props,
  PublicInstance,
} from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import {
  rowHeightOf,
  spaceValue,
  type DensitySource,
  type SpaceSource,
} from "@gpuixui/primitives/core";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import {
  cn,
  LIST_ITEM,
  LIST_ITEM_DESCRIPTION,
  LIST_ITEM_TITLE,
  LIST_ROOT,
} from "@gpuixui/tw";
import { Match, pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
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
  swallowsDefault,
} from "./internal/key.js";
import { recipeStyle } from "./internal/recipe.js";
import { controlRing, pressWash, useTheme } from "./internal/theme.js";
import { keyOrigin } from "./list/origin.js";
import { typedChar, useTypeahead } from "./typeahead.js";
import { range, sameValues, selectAll, toggle } from "./list/selection.js";
import { makeRowStore, type RowStore } from "./list/store.js";

export type ListSelectionMode = "none" | "single" | "multiple";

export const listRowHeight = (
  theme: DensitySource & SpaceSource,
  dense: boolean,
): number =>
  dense ? rowHeightOf(theme) : rowHeightOf(theme) + spaceValue(theme, "md");

interface Row {
  readonly value: string;
  readonly disabled: boolean;
  readonly nativeId: number;
  readonly label: string;
}

interface ListContextValue {
  readonly selectable: boolean;
  readonly dense: boolean;

  readonly store: RowStore;

  readonly activate: (value: string, event: EventPayload) => void;

  readonly noteFocus: (value: string) => void;

  readonly register: (row: Row) => () => void;
}

const ListContext = createContext<ListContextValue | undefined>(undefined);

interface RowState {
  readonly selected: boolean;
  readonly disabled: boolean;
}

const RowStateContext = createContext<RowState>({
  selected: false,
  disabled: false,
});

const useListContext = (): ListContextValue => {
  const value = useContext(ListContext);
  if (value === undefined) {
    throw new Error("ListItem must be used inside List");
  }
  return value;
};

const upsert = (rows: ReadonlyArray<Row>, row: Row): ReadonlyArray<Row> =>
  Option.match(
    Arr.findFirst(rows, (candidate) => candidate.value === row.value),
    {
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

const items = (rows: ReadonlyArray<Row>): ReadonlyArray<CollectionItem> =>
  Arr.map(rows, (row) => ({ id: row.nativeId, disabled: row.disabled }));

const indexOf = (
  rows: ReadonlyArray<Row>,
  value: Option.Option<string>,
): Option.Option<number> =>
  Option.flatMap(value, (target) =>
    Arr.findFirstIndex(rows, (row) => row.value === target),
  );

const rowAt = (
  rows: ReadonlyArray<Row>,
  index: Option.Option<number>,
): Option.Option<Row> =>
  Option.flatMap(index, (position) => Arr.get(rows, position));

const tabbableValue = (
  rows: ReadonlyArray<Row>,
  active: Option.Option<string>,
  selected: ReadonlyArray<string>,
  selectable: boolean,
): Option.Option<string> =>
  pipe(
    Option.flatMap(active, (value) =>
      pipe(
        Arr.findFirst(rows, (row) => row.value === value),
        Option.filter((row) => !row.disabled),
        Option.map((row) => row.value),
      ),
    ),
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

const report = (props: ListProps, next: ReadonlyArray<string>): void =>
  Match.value(props).pipe(
    Match.when({ selectionMode: "multiple" }, (p) => p.onValueChange?.(next)),
    Match.when({ selectionMode: "single" }, (p) =>
      p.onValueChange?.(next[0] ?? ""),
    ),
    Match.orElse(() => undefined),
  );

interface ListBaseProps extends Omit<Props, "children"> {
  readonly dense?: boolean;
  readonly className?: string;
  readonly children?: PartChildren;
}

interface Activatable {
  readonly onActivate?: (value: string) => void;
}

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

      readonly onActivate?: never;
      readonly value?: ReadonlyArray<string>;
      readonly defaultValue?: ReadonlyArray<string>;
      readonly onValueChange?: (values: ReadonlyArray<string>) => void;
    });

export const List = (props: ListProps) => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;

  const {
    selectionMode: _selectionMode,
    value: _value,
    defaultValue: _defaultValue,
    onValueChange: _onValueChange,
    onActivate,
    dense = false,
    className,
    onKeyDown,
    onKeyUp,
    children,
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
  const [store] = useState(makeRowStore);

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

  const noteFocus = useCallback((value: string) => {
    setActive(Option.some(value));
  }, []);

  const moveBy = useCallback(
    (delta: 1 | -1, extend: boolean, from: Option.Option<string>) => {
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
                Option.getOrElse(anchor, () => row.value),
                row.value,
              ),
            );
          },
        }),
      );
    },
    [anchor, commit, focusRow, multiple, rows],
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
          onSome: (row) => {
            setAnchor(Option.some(row.value));
            commit(multiple ? toggle(selected, row.value) : Arr.of(row.value));
          },
        }),
      );
    },
    [commit, enabledRow, multiple, selected],
  );

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

  const selectActive = useCallback(
    (target: Option.Option<string>) => {
      pipe(
        target,
        Option.match({
          onNone: () => undefined,
          onSome: (value) => select(value),
        }),
      );
    },
    [select],
  );

  const activateActive = useCallback(
    (target: Option.Option<string>) => {
      pipe(
        Option.flatMap(target, enabledRow),
        Option.match({
          onNone: () => undefined,
          onSome: (row) => onActivate?.(row.value),
        }),
      );
    },
    [enabledRow, onActivate],
  );

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

    setAnchor(Option.some(row.value));
  });

  const originOf = (event: EventPayload): Option.Option<string> =>
    keyOrigin(
      rows,
      active,
      Option.fromNullishOr(event.elementId),
      Option.fromNullishOr(renderer?.getFocusedElementId?.()),
    );

  const handleKeyDown = (event: KeyEvent): void => {
    if (!selectable) return;

    if (swallowsDefault(event, "down")) event.preventDefault();
    const origin = originOf(event);
    const extend = multiple && event.modifiers?.shift === true;

    pipe(
      origin,
      Option.match({
        onNone: () => undefined,
        onSome: (value) => {
          if (!Option.contains(active, value)) setActive(Option.some(value));
        },
      }),
    );
    pipe(
      typedChar(event),
      Option.match({
        onSome: typeahead,
        onNone: () =>
          Match.value(event).pipe(
            Match.when(isEnter, () => {
              if (selectable) selectActive(origin);
              activateActive(origin);
            }),
            Match.when(
              (press) => isActivation(press, "down"),
              () => selectActive(origin),
            ),
            Match.when(isSelectAll, selectEveryRow),
            Match.when(isDown, () => moveBy(1, extend, origin)),
            Match.when(isUp, () => moveBy(-1, extend, origin)),
            Match.when(isFirst, () => jumpTo("first")),
            Match.when(isLast, () => jumpTo("last")),
            Match.orElse(() => undefined),
          ),
      }),
    );
  };

  const handleKeyUp = (event: KeyEvent): void => {
    if (!selectable) return;
    if (isActivation(event, "up")) selectActive(originOf(event));
  };

  const tabbable = useMemo(
    () => tabbableValue(rows, active, selected, selectable),
    [active, rows, selectable, selected],
  );

  const latest = useRef(activate);
  useLayoutEffect(() => {
    latest.current = activate;
  });
  const stableActivate = useCallback(
    (value: string, event: EventPayload) => latest.current(value, event),
    [],
  );

  useLayoutEffect(() => {
    store.write({ active, selected, tabbable });
  }, [active, selected, store, tabbable]);

  const context = useMemo<ListContextValue>(
    () => ({
      selectable,
      dense,
      store,
      activate: stableActivate,
      noteFocus,
      register,
    }),
    [dense, noteFocus, register, selectable, stableActivate, store],
  );

  assertParts(listRoot, children);

  return (
    <ListContext.Provider value={context}>
      <div
        role={selectable ? "listbox" : "list"}
        {...rest}
        onKeyDown={(event) => {
          handleKeyDown(event);
          onKeyDown?.(event);
        }}
        onKeyUp={(event) => {
          handleKeyUp(event);
          onKeyUp?.(event);
        }}
        style={mergeStyles(recipeStyle(cn(LIST_ROOT, className), theme), style)}
      >
        {children}
      </div>
    </ListContext.Provider>
  );
};

export interface ListItemProps extends Omit<Props, "children" | "style"> {
  readonly value: string;

  readonly textValue?: string;

  readonly disabled?: boolean;

  readonly leading?: ReactNode;

  readonly trailing?: ReactNode;
  readonly children?: PartChildren;

  readonly className?: string;

  readonly style?: StateStyle<ListItemState>;
}

export interface ListItemState {
  readonly active: boolean;
  readonly disabled: boolean;
  readonly selected: boolean;
}

export const ListItem = ({
  value,
  textValue,
  disabled = false,
  leading,
  trailing,
  children,
  className,
  onFocus,
  onClick,
  style,
  ref,
  ...rest
}: ListItemProps) => {
  const theme = useTheme();
  const { selectable, dense, store, activate, noteFocus, register } =
    useListContext();
  const row = useSyncExternalStore(store.subscribe, () => store.read(value));
  const [instance, setInstance] = useState<PublicInstance | undefined>(
    undefined,
  );

  const attach = useCallback((next: PublicInstance | null) => {
    setInstance(next ?? undefined);
  }, []);
  const setElement = useMergedRef<PublicInstance | null>(attach, ref);

  useLayoutEffect(() => {
    if (instance === undefined) return;
    return register({
      value,
      disabled,
      nativeId: instance.id,
      label: textValue ?? "",
    });
  }, [disabled, instance, register, textValue, value]);

  const isSelected = selectable && row.selected;
  const isActive = row.active;
  const isTabbable = row.tabbable;
  const state: ListItemState = {
    active: isActive,
    disabled,
    selected: isSelected,
  };
  assertParts(listItem, children);

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
        mergeStyles(recipeStyle(cn(LIST_ITEM, className), theme), {
          height: listRowHeight(theme, dense),

          ...(selectable
            ? {
                cursor: disabled ? "not-allowed" : "pointer",
                ...(disabled
                  ? {}
                  : {
                      hover: { backgroundColor: theme.colors.accent },
                      active: { backgroundColor: pressWash(theme, "accent") },
                    }),
              }
            : {}),
          ...(isSelected
            ? {
                backgroundColor: theme.colors.selected,
                color: theme.colors.selectedForeground,
              }
            : {}),

          ...controlRing(theme, { disabled }),
        }),
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
        <RowStateContext.Provider value={{ selected: isSelected, disabled }}>
          {children}
        </RowStateContext.Provider>
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

export interface ListItemTitleProps extends Props {
  readonly className?: string;
}

export const ListItemTitle = ({
  className,
  style,
  ...rest
}: ListItemTitleProps) => {
  const theme = useTheme();
  const row = useContext(RowStateContext);
  const color = row.selected
    ? row.disabled
      ? theme.colors.mutedForeground
      : theme.colors.selectedForeground
    : row.disabled
      ? theme.colors.disabledForeground
      : theme.colors.foreground;
  return (
    <text
      {...rest}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(LIST_ITEM_TITLE, className), theme), {
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
          color,
        }),
        style,
      )}
    />
  );
};

export interface ListItemDescriptionProps extends Props {
  readonly className?: string;
}

export const ListItemDescription = ({
  className,
  style,
  ...rest
}: ListItemDescriptionProps) => {
  const theme = useTheme();
  const row = useContext(RowStateContext);
  return (
    <text
      {...rest}
      style={mergeStyles(
        mergeStyles(
          recipeStyle(cn(LIST_ITEM_DESCRIPTION, className), theme),
          row.disabled && !row.selected
            ? { color: theme.colors.disabledForeground }
            : {},
        ),
        style,
      )}
    />
  );
};

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

export const listMeta = {
  name: "Lists / list items",
  tier: 2,
  status: "done",
  gpuixSupport: "yes",
  limitations: [
    "no aria-multiselectable in 0.11.0, so the multiple mode is announced only per row",
    "type-ahead matches an explicit ListItem textValue, not rendered children",
    "activation is a callback on single/none lists: no href or link role, and a multiple list has no activation",
    "no drag reorder or virtualisation",
    "a press can focus a disabled row (the runtime does); the keys then refuse it and the tab stop stays on an enabled row",
  ],
  docs: "docs/list.mdx",
  example: "examples/list.example.tsx",
  testFile: "src/behaviour/list.test.tsx",
} as const;
