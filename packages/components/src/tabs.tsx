/**
 * Tabs: a roving-focus tab list and the panels it switches.
 *
 * The list owns the roving keys — a key event fired on a focused trigger bubbles
 * to the list, the same measured behaviour that lets `List` own its rows — and
 * each trigger owns its own focus and activation. Index arithmetic is
 * `internal/collection.ts`, so disabled tabs are skipped and wrap-around agrees
 * with every other collection in the package.
 *
 * Measured limitation: `@gpuix/native@0.10.0` has no `aria-orientation`,
 * `aria-controls` or `aria-labelledby` (`HostProps`), so the panel is named by
 * its value and the trigger/panel relationship is positional.
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
import * as Option from "effect/Option";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { activationHandlers } from "./internal/activate.js";
import {
  firstEnabled,
  lastEnabled,
  nextEnabled,
  type CollectionItem,
} from "./internal/collection.js";
import { useControllableState } from "./internal/controllable.js";
import { controlName } from "./internal/name.js";
import { stateDescription } from "./internal/state-description.js";
import {
  isDown,
  isFirst,
  isLast,
  isLeft,
  isRight,
  isUp,
} from "./internal/key.js";
import { useMergedRef } from "./internal/ref.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import {
  controlHeight,
  focusRing,
  textStyle,
  useTheme,
} from "./internal/theme.js";
import { selectsOnFocus, type TabsActivation } from "./tabs/logic.js";

/** The two axes a tab list can run along. */
export type TabsOrientation = "horizontal" | "vertical";

/** One registered trigger: its value, native id, whether it accepts input, and
 *  the name it paints (so its panel can be announced by the same label). */
interface TabRow {
  readonly value: string;
  readonly id: number;
  readonly disabled: boolean;
  readonly name: Option.Option<string>;
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
  /** Change a registered trigger in place; a re-register would move it. */
  readonly updateRow: (row: TabRow) => void;
  readonly select: (value: string) => void;
  readonly noteFocus: (value: string) => void;
  readonly focusRow: (row: TabRow, select: boolean) => void;
  readonly moveBy: (delta: 1 | -1) => void;
  readonly jumpTo: (edge: "first" | "last") => void;
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
        current.id === row.id &&
        current.disabled === row.disabled &&
        Option.getOrUndefined(current.name) === Option.getOrUndefined(row.name)
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
export interface TabsProps extends Omit<Props, "children"> {
  /** The controlled selected value. `undefined` means uncontrolled. */
  readonly value?: string;
  /** The uncontrolled starting value. Default `""`, no tab selected. */
  readonly defaultValue?: string;
  readonly onValueChange?: (value: string) => void;
  /** Default `"horizontal"`. */
  readonly orientation?: TabsOrientation;
  /** Default `"automatic"`: moving focus selects. */
  readonly activation?: TabsActivation;
  readonly children?: PartChildren;
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

  /**
   * The tab the user is on, when it still exists and accepts input. A tab that
   * is disabled by the app must not keep the ring (plan 511).
   */
  const liveActive = useMemo(
    () =>
      Option.filter(active, (value) =>
        Arr.some(rows, (row) => row.value === value && !row.disabled),
      ),
    [active, rows],
  );

  /** The native id of the tab the tabs last focused (plan 511). */
  const focusedTab = useRef<Option.Option<number>>(Option.none());

  const register = useCallback((row: TabRow) => {
    setRows((current) => upsert(current, row));
    return () =>
      setRows((current) =>
        Arr.filter(current, (candidate) => candidate.value !== row.value),
      );
  }, []);

  /** Update in place: a re-register would move the trigger to the end. */
  const updateRow = useCallback((row: TabRow) => {
    setRows((current) => upsert(current, row));
  }, []);

  const noteFocus = useCallback(
    (value: string) => {
      setActive(Option.some(value));
      Option.match(
        Arr.findFirst(rows, (row) => row.value === value),
        {
          onNone: () => undefined,
          onSome: (row) => {
            focusedTab.current = Option.some(row.id);
          },
        },
      );
    },
    [rows],
  );

  const focusRow = useCallback(
    (row: TabRow, select: boolean): void => {
      setActive(Option.some(row.value));
      focusedTab.current = Option.some(row.id);
      renderer?.focusElement?.(row.id);
      if (select) setSelected(row.value);
    },
    [renderer, setSelected],
  );

  const indexOf = useCallback(
    (value: string) => Arr.findFirstIndex(rows, (row) => row.value === value),
    [rows],
  );

  /**
   * The tab an arrow move starts from: the natively focused one when the runtime
   * names it, otherwise the last highlighted tab. A live click and `autoFocus`
   * move native focus without running React's `onFocus` (plan 345), so the
   * focused element is the only reliable origin.
   */
  const origin = useCallback(
    (): Option.Option<string> =>
      pipe(
        Option.fromNullishOr(renderer?.getFocusedElementId?.() ?? null),
        Option.flatMap((id) => Arr.findFirst(rows, (row) => row.id === id)),
        Option.map((row) => row.value),
        Option.orElse(() => liveActive),
      ),
    [liveActive, renderer, rows],
  );

  const moveBy = useCallback(
    (delta: 1 | -1): void => {
      pipe(
        rowAt(
          rows,
          nextEnabled(
            collection(rows),
            Option.flatMap(origin(), indexOf),
            delta,
          ),
        ),
        Option.match({
          onNone: () => undefined,
          onSome: (row) => focusRow(row, selectsOnFocus(activation)),
        }),
      );
    },
    [activation, focusRow, indexOf, origin, rows],
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

  /**
   * A tab that vanishes or turns disabled takes the user's focus with it. The
   * origin is the **natively focused** row: a `Tab` entry and a programmatic
   * move focus the host without running React's `onFocus` (plans 345/536/578),
   * so the renderer is asked first; the last recorded tab is the fallback for a
   * focus no handler can see. Hand focus to the tab stop without changing the
   * selected tab, and never steal it from another control the consumer focused
   * in the same update (plans 511/646).
   */
  useLayoutEffect(() => {
    const nativeRow = Option.flatMap(
      Option.fromNullishOr(renderer?.getFocusedElementId?.() ?? null),
      (id) => Arr.findFirst(rows, (row) => row.id === id),
    );
    const remembered = Option.orElse(
      Option.map(nativeRow, (row) => row.id),
      () => focusedTab.current,
    );
    if (Option.isNone(remembered)) return;

    const target = Arr.findFirst(rows, (row) => row.id === remembered.value);
    if (Option.exists(target, (row) => !row.disabled)) return;

    focusedTab.current = Option.none();
    const focused = Option.fromNullishOr(renderer?.getFocusedElementId?.());
    if (Option.exists(focused, (id) => id !== remembered.value)) return;

    Option.match(tabbable, {
      onNone: () => undefined,
      onSome: (value) =>
        Option.match(
          Arr.findFirst(rows, (row) => row.value === value),
          {
            onNone: () => undefined,
            onSome: (row) => focusRow(row, false),
          },
        ),
    });
  }, [focusRow, renderer, rows, tabbable]);

  const context = useMemo<TabsContextValue>(
    () => ({
      selected,
      active: liveActive,
      tabbable,
      orientation,
      activation,
      rows,
      register,
      updateRow,
      select,
      noteFocus,
      focusRow,
      moveBy,
      jumpTo,
    }),
    [
      activation,
      focusRow,
      jumpTo,
      liveActive,
      moveBy,
      noteFocus,
      orientation,
      register,
      rows,
      select,
      selected,
      tabbable,
      updateRow,
    ],
  );

  assertParts(tabsRoot, children);

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
export interface TabsListProps extends Omit<Props, "children"> {
  /** The tab list's accessible name. */
  readonly label?: string;
  readonly children?: PartChildren;
}

/** The row of triggers. Owns the arrow, Home and End keys. */
export const TabsList = ({
  label,
  onKeyDown,
  children,
  style,
  ...rest
}: TabsListProps) => {
  const theme = useTheme();
  const { orientation, moveBy, jumpTo } = useTabsContext();
  assertParts(tabsList, children);

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
    >
      {children}
    </div>
  );
};

/** {@link TabsTrigger} props. */
export interface TabsTriggerProps extends Omit<Props, "style"> {
  /** The value this trigger selects. Must match a {@link TabsContent}. */
  readonly value: string;
  readonly disabled?: boolean;
  /** A style, or a function of the trigger's state. */
  readonly style?: StateStyle<TabsTriggerState>;
}

/** What a trigger draws: its selection, input state and axis. */
export interface TabsTriggerState {
  /** Selected (`aria-selected`). */
  readonly active: boolean;
  readonly disabled: boolean;
  readonly focused: boolean;
  /** The tab the last arrow/Home/End gesture landed on. */
  readonly highlighted: boolean;
  readonly orientation: TabsOrientation;
}

/** One tab. Focusable only when selected, or when the selection is disabled. */
export const TabsTrigger = ({
  value,
  disabled = false,
  autoFocus = false,
  onClick,
  onKeyDown,
  onKeyUp,
  onFocus,
  onBlur,
  style,
  children,
  ref,
  ...rest
}: TabsTriggerProps) => {
  const theme = useTheme();
  const name = controlName(rest["aria-label"], children);
  const {
    selected,
    active,
    orientation,
    tabbable,
    register,
    updateRow,
    select,
    noteFocus,
  } = useTabsContext();
  const [focused, setFocused] = useState(autoFocus && !disabled);
  const [instance, setInstance] = useState<PublicInstance | undefined>(
    undefined,
  );

  const attach = useCallback((next: PublicInstance | null) => {
    setInstance(next ?? undefined);
  }, []);
  const setElement = useMergedRef<PublicInstance | null>(attach, ref);

  // Mount (and a changed value) owns the row's position. Every other change is
  // an in-place update: letting registration's cleanup run would remove the row
  // and the next register would append it at the end, reordering the tabs.
  useLayoutEffect(() => {
    if (instance === undefined) return;
    return register({
      value,
      id: instance.id,
      disabled: false,
      name: Option.none(),
    });
  }, [instance, register, value]);

  useLayoutEffect(() => {
    if (instance === undefined) return;
    updateRow({
      value,
      id: instance.id,
      disabled,
      name: Option.fromNullishOr(name),
    });
  }, [disabled, instance, name, updateRow, value]);

  useEffect(() => {
    // `autoFocus` focuses natively after React's effects, so `onFocus` never
    // runs; the roving highlight has to be told (plan 388).
    if (autoFocus && !disabled) noteFocus(value);
  }, [autoFocus, disabled, noteFocus, value]);

  const isSelected = selected === value;
  const isTabbable = Option.contains(tabbable, value);
  const state: TabsTriggerState = {
    active: isSelected,
    disabled,
    focused,
    highlighted: Option.contains(active, value),
    orientation,
  };

  return (
    <div
      role="tab"
      aria-selected={isSelected}
      {...rest}
      {...(name === undefined ? {} : { "aria-label": name })}
      {...stateDescription(disabled, rest["aria-description"])}
      ref={setElement}
      autoFocus={autoFocus && !disabled}
      tabIndex={disabled ? -1 : isTabbable ? 0 : -1}
      onFocus={(event) => {
        noteFocus(value);
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      onClick={
        disabled
          ? undefined
          : (event) => {
              onClick?.(event);
              // A live click focuses natively without running `onFocus`
              // (plan 345), so the click supplies the state `onFocus` misses.
              noteFocus(value);
              setFocused(true);
              select(value);
            }
      }
      {...activationHandlers(() => select(value), {
        disabled,
        onKeyDown,
        onKeyUp,
      })}
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
        resolveStyle(style, state),
      )}
    >
      {children}
    </div>
  );
};

/** {@link TabsContent} props. */
export interface TabsContentProps extends Props {
  /** The trigger value that reveals this panel. */
  readonly value: string;
}

/** The panel for one tab. Renders nothing while another tab is selected. */
export const TabsContent = ({ value, style, ...rest }: TabsContentProps) => {
  const { rows, selected } = useTabsContext();
  const theme = useTheme();

  // The panel follows the live tabs: a trigger that unmounts takes its panel
  // with it, while the selection stays what the app (or the user) chose. A
  // disabled trigger is still a tab and keeps its panel.
  const isLive = Arr.some(rows, (row) => row.value === value);
  if (selected !== value || !isLive) return null;
  // 0.10.0 has no `aria-labelledby`, so the panel borrows the trigger's name —
  // the same plain-text rule the trigger paints. The caller's `aria-label` wins,
  // and a composed trigger falls back to the value.
  const panelName = Option.getOrElse(
    Option.firstSomeOf([
      Option.fromNullishOr(rest["aria-label"]),
      Option.flatMap(
        Arr.findFirst(rows, (row) => row.value === value),
        (row) => row.name,
      ),
    ]),
    () => value,
  );
  return (
    <div
      role="tabpanel"
      {...rest}
      aria-label={panelName}
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

/** Every part of Tabs, so a misplaced sibling is named. */
const tabsParts: ReadonlyArray<PartComponent> = [
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
];

const tabsRoot: PartsContract = {
  parent: "Tabs",
  family: tabsParts,
  accepts: [TabsList, TabsContent],
  hint: "Put TabsList and TabsContent directly inside Tabs.",
};

const tabsList: PartsContract = {
  parent: "TabsList",
  family: tabsParts,
  accepts: [TabsTrigger],
  hint: "Put TabsTrigger directly inside TabsList; put TabsContent beside it.",
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const tabsMeta = {
  name: "Tabs",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  focusable: true,
  limitations: [
    "no aria-orientation, aria-controls or aria-labelledby in 0.10.0; the panel borrows its trigger's plain-text name, falling back to the value for a composed trigger",
    "the trigger/panel relationship is positional, not semantic",
    "a panel renders only while a live trigger with its value is registered; the selection is never rewritten",
  ],
  docs: "docs/tabs.mdx",
  example: "examples/tabs.example.tsx",
  testFile: "src/behaviour/tabs.test.tsx",
} as const;
