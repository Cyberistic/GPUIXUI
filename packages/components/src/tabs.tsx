/**
 * Tabs: a roving-focus tab list and the panels it switches.
 *
 * The list owns the keys — a key event fired on a focused trigger bubbles to the
 * list, the same measured behaviour that lets `List` own its rows — and the
 * trigger owns its own focus. Index arithmetic is `internal/collection.ts`, so
 * disabled tabs are skipped and wrap-around agrees with every other collection
 * in the package.
 *
 * Measured limitation: `@gpuix/native@0.10.0` has no `aria-orientation`,
 * `aria-controls` or `aria-labelledby` (`HostProps`), so the panel is named by
 * its value and the trigger/panel relationship is positional.
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
} from "react";
import {
  firstEnabled,
  lastEnabled,
  nextEnabled,
  type CollectionItem,
} from "./internal/collection.js";
import { useControllableState } from "./internal/controllable.js";
import {
  isActivation,
  isDown,
  isFirst,
  isLast,
  isLeft,
  isRight,
  isUp,
} from "./internal/key.js";
import {
  controlHeight,
  focusRing,
  textStyle,
  useTheme,
} from "./internal/theme.js";
import { selectsOnFocus, type TabsActivation } from "./tabs/logic.js";

/** The two axes a tab list can run along. */
export type TabsOrientation = "horizontal" | "vertical";

/** One registered trigger: its value, native id and whether it accepts input. */
interface TabRow {
  readonly value: string;
  readonly id: number;
  readonly disabled: boolean;
}

/** The rules a tab part follows; throws outside a {@link Tabs} root. */
interface TabsContextValue {
  readonly selected: string;
  readonly active: Option.Option<string>;
  readonly tabbable: Option.Option<string>;
  readonly orientation: TabsOrientation;
  readonly activation: TabsActivation;
  readonly rows: ReadonlyArray<TabRow>;
  readonly register: (row: TabRow) => () => void;
  readonly select: (value: string) => void;
  readonly noteFocus: (value: string) => void;
  readonly focusRow: (row: TabRow, select: boolean) => void;
  readonly moveBy: (delta: 1 | -1) => void;
  readonly jumpTo: (edge: "first" | "last") => void;
  readonly selectActive: () => void;
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined);

/** The tab set a part belongs to. Throws when there is none. */
const useTabsContext = (): TabsContextValue => {
  const value = useContext(TabsContext);
  if (value === undefined) {
    throw new Error("Tabs parts must be used inside Tabs");
  }
  return value;
};

/** Replace the row with the same value, keeping declaration order. */
const upsert = (
  rows: ReadonlyArray<TabRow>,
  row: TabRow,
): ReadonlyArray<TabRow> =>
  Option.match(
    Arr.findFirst(rows, (candidate) => candidate.value === row.value),
    {
      onNone: () => Arr.append(rows, row),
      onSome: (current) =>
        current.id === row.id && current.disabled === row.disabled
          ? rows
          : Arr.map(rows, (candidate) =>
              candidate.value === row.value ? row : candidate,
            ),
    },
  );

const collection = (
  rows: ReadonlyArray<TabRow>,
): ReadonlyArray<CollectionItem> =>
  Arr.map(rows, (row) => ({ id: row.id, disabled: row.disabled }));

const rowAt = (
  rows: ReadonlyArray<TabRow>,
  index: Option.Option<number>,
): Option.Option<TabRow> =>
  Option.flatMap(index, (position) => Arr.get(rows, position));

/** {@link Tabs} props. */
export interface TabsProps extends Props {
  /** The controlled selected value. `undefined` means uncontrolled. */
  readonly value?: string;
  /** The uncontrolled starting value. Default `""`, no tab selected. */
  readonly defaultValue?: string;
  readonly onValueChange?: (value: string) => void;
  /** Default `"horizontal"`. */
  readonly orientation?: TabsOrientation;
  /** Default `"automatic"`: moving focus selects. */
  readonly activation?: TabsActivation;
}

/**
 * A tab set. Put {@link TabsList}, {@link TabsTrigger} and {@link TabsContent}
 * inside; the root owns the value, the focus registry and the tab stop.
 */
export const Tabs = ({
  value: valueProp,
  defaultValue = "",
  onValueChange,
  orientation = "horizontal",
  activation = "automatic",
  children,
  style,
  ...rest
}: TabsProps) => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const [selected, setSelected] = useControllableState({
    value: valueProp,
    defaultValue,
    onChange: onValueChange,
  });
  const [active, setActive] = useState<Option.Option<string>>(Option.none());
  const [rows, setRows] = useState<ReadonlyArray<TabRow>>([]);

  const register = useCallback((row: TabRow) => {
    setRows((current) => upsert(current, row));
    return () =>
      setRows((current) =>
        Arr.filter(current, (candidate) => candidate.value !== row.value),
      );
  }, []);

  const noteFocus = useCallback((value: string) => {
    setActive(Option.some(value));
  }, []);

  const focusRow = useCallback(
    (row: TabRow, select: boolean): void => {
      setActive(Option.some(row.value));
      renderer?.focusElement?.(row.id);
      if (select) setSelected(row.value);
    },
    [renderer, setSelected],
  );

  const indexOf = useCallback(
    (value: string) => Arr.findFirstIndex(rows, (row) => row.value === value),
    [rows],
  );

  const moveBy = useCallback(
    (delta: 1 | -1): void => {
      pipe(
        rowAt(
          rows,
          nextEnabled(collection(rows), Option.flatMap(active, indexOf), delta),
        ),
        Option.match({
          onNone: () => undefined,
          onSome: (row) => focusRow(row, selectsOnFocus(activation)),
        }),
      );
    },
    [activation, active, focusRow, indexOf, rows],
  );

  const jumpTo = useCallback(
    (edge: "first" | "last"): void => {
      const enabled =
        edge === "first"
          ? firstEnabled(collection(rows))
          : lastEnabled(collection(rows));
      pipe(
        rowAt(rows, enabled),
        Option.match({
          onNone: () => undefined,
          onSome: (row) => focusRow(row, selectsOnFocus(activation)),
        }),
      );
    },
    [activation, focusRow, rows],
  );

  const select = useCallback(
    (value: string): void => {
      pipe(
        Arr.findFirst(rows, (row) => row.value === value),
        Option.filter((row) => !row.disabled),
        Option.match({
          onNone: () => undefined,
          onSome: (row) => setSelected(row.value),
        }),
      );
    },
    [rows, setSelected],
  );

  const selectActive = useCallback((): void => {
    pipe(
      active,
      Option.match({
        onNone: () => undefined,
        onSome: select,
      }),
    );
  }, [active, select]);

  /**
   * One tab stop: the selected tab when it accepts input, otherwise the first
   * enabled tab. A disabled selected tab must not eat the list's only stop.
   */
  const tabbable = useMemo(
    () =>
      pipe(
        Arr.findFirst(rows, (row) => row.value === selected && !row.disabled),
        Option.orElse(() => Arr.findFirst(rows, (row) => !row.disabled)),
        Option.map((row) => row.value),
      ),
    [rows, selected],
  );

  const context = useMemo<TabsContextValue>(
    () => ({
      selected,
      active,
      tabbable,
      orientation,
      activation,
      rows,
      register,
      select,
      noteFocus,
      focusRow,
      moveBy,
      jumpTo,
      selectActive,
    }),
    [
      activation,
      active,
      focusRow,
      jumpTo,
      moveBy,
      noteFocus,
      orientation,
      register,
      rows,
      select,
      selectActive,
      selected,
      tabbable,
    ],
  );

  return (
    <TabsContext.Provider value={context}>
      <div
        {...rest}
        style={mergeStyles(
          {
            display: "flex",
            flexDirection: orientation === "horizontal" ? "column" : "row",
            gap: theme.spacing.md,
          },
          style,
        )}
      >
        {children}
      </div>
    </TabsContext.Provider>
  );
};

/** {@link TabsList} props: the rail, optionally named for assistive technology. */
export interface TabsListProps extends Props {
  /** The tab list's accessible name. */
  readonly label?: string;
}

/** The row of triggers. Owns the arrow, Home and End keys. */
export const TabsList = ({
  label,
  onKeyDown,
  style,
  ...rest
}: TabsListProps) => {
  const theme = useTheme();
  const { orientation, moveBy, jumpTo, selectActive } = useTabsContext();

  const direction = (event: EventPayload): Option.Option<1 | -1> =>
    orientation === "horizontal"
      ? isRight(event)
        ? Option.some(1)
        : isLeft(event)
          ? Option.some(-1)
          : Option.none()
      : isDown(event)
        ? Option.some(1)
        : isUp(event)
          ? Option.some(-1)
          : Option.none();

  const handleKeyDown = (event: EventPayload): void => {
    Match.value(event).pipe(
      Match.when(isFirst, () => jumpTo("first")),
      Match.when(isLast, () => jumpTo("last")),
      Match.when(isActivation, selectActive),
      Match.orElse((value) =>
        pipe(
          direction(value),
          Option.match({ onNone: () => undefined, onSome: moveBy }),
        ),
      ),
    );
  };

  return (
    <div
      role="tablist"
      {...(label === undefined ? {} : { "aria-label": label })}
      {...rest}
      onKeyDown={(event) => {
        handleKeyDown(event);
        onKeyDown?.(event);
      }}
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: orientation === "horizontal" ? "row" : "column",
          alignItems: "stretch",
          gap: theme.spacing.xs,
          padding: theme.spacing.xs,
          backgroundColor: theme.colors.background,
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.md,
        },
        style,
      )}
    />
  );
};

/** {@link TabsTrigger} props. */
export interface TabsTriggerProps extends Props {
  /** The value this trigger selects. Must match a {@link TabsContent}. */
  readonly value: string;
  readonly disabled?: boolean;
}

/** One tab. Focusable only when selected, or when the selection is disabled. */
export const TabsTrigger = ({
  value,
  disabled = false,
  onClick,
  onFocus,
  style,
  ...rest
}: TabsTriggerProps) => {
  const theme = useTheme();
  const { selected, tabbable, register, select, noteFocus } = useTabsContext();
  const [focused, setFocused] = useState(false);
  const [instance, setInstance] = useState<PublicInstance | undefined>(
    undefined,
  );

  const attach = useCallback((next: PublicInstance | null) => {
    setInstance(next ?? undefined);
  }, []);

  useLayoutEffect(() => {
    if (instance === undefined) return;
    return register({ value, id: instance.id, disabled });
  }, [disabled, instance, register, value]);

  const isSelected = selected === value;
  const isTabbable = Option.contains(tabbable, value);

  return (
    <div
      role="tab"
      aria-selected={isSelected}
      {...rest}
      ref={attach}
      tabIndex={disabled ? -1 : isTabbable ? 0 : -1}
      onFocus={(event) => {
        noteFocus(value);
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={() => setFocused(false)}
      onClick={
        disabled
          ? undefined
          : (event) => {
              onClick?.(event);
              select(value);
            }
      }
      style={mergeStyles(
        {
          ...textStyle(theme, "label"),
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          height: controlHeight(theme, "md"),
          paddingLeft: theme.spacing.lg,
          paddingRight: theme.spacing.lg,
          borderRadius: theme.radius.sm,
          backgroundColor: isSelected ? theme.colors.card : undefined,
          color: isSelected
            ? theme.colors.foreground
            : theme.colors.mutedForeground,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          hover: disabled
            ? undefined
            : {
                backgroundColor: isSelected
                  ? theme.colors.card
                  : theme.colors.hover,
                color: theme.colors.foreground,
              },
          ...(focused ? focusRing(theme) : {}),
        },
        style,
      )}
    />
  );
};

/** {@link TabsContent} props. */
export interface TabsContentProps extends Props {
  /** The trigger value that reveals this panel. */
  readonly value: string;
}

/** The panel for one tab. Renders nothing while another tab is selected. */
export const TabsContent = ({ value, style, ...rest }: TabsContentProps) => {
  const { selected } = useTabsContext();
  const theme = useTheme();

  if (selected !== value) return null;
  return (
    <div
      role="tabpanel"
      aria-label={value}
      {...rest}
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.md,
          color: theme.colors.foreground,
        },
        style,
      )}
    />
  );
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const tabsMeta = {
  name: "Tabs",
  tier: 2,
  status: "done",
  gpuixSupport: "yes",
  limitations: [
    "no aria-orientation, aria-controls or aria-labelledby in 0.10.0; the panel is named by its value",
    "the trigger/panel relationship is positional, not semantic",
  ],
  docs: "docs/tabs.mdx",
  example: "examples/tabs.example.tsx",
  testFile: "src/behaviour/tabs.test.tsx",
} as const;
