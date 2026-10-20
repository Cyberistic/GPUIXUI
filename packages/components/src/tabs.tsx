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
import { useGpuix, useWindowSize } from "@gpuix/react";
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
import { useFocusState } from "./internal/focus.js";
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
import { MotionSurface } from "./internal/motion.js";
import { useMergedRef } from "./internal/ref.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import { useNativeFocusId } from "./internal/native-focus.js";
import {
  controlHeight,
  focusRing,
  textStyle,
  useTheme,
} from "./internal/theme.js";
import {
  indicatorBox,
  indicatorThickness,
  selectsOnFocus,
  type IndicatorBox,
  type TabsActivation,
  type TabsOrientation,
} from "./tabs/logic.js";

export type { TabsOrientation } from "./tabs/logic.js";

/** One registered trigger: its value, native id, whether it accepts input, and
 *  the name it paints (so its panel can be announced by the same label). */
interface TabRow {
  readonly value: string;
  readonly id: number;
  readonly disabled: boolean;
  readonly name: Option.Option<string>;
}

/** The registered rail: the host the indicator measures, and its test handle. */
interface TabListRow {
  readonly id: number;
  readonly testId: Option.Option<string>;
}

/** The rules a tab part follows; throws outside a {@link Tabs} root. */
interface TabsContextValue {
  readonly selected: string;
  readonly active: Option.Option<string>;
  readonly tabbable: Option.Option<string>;
  readonly orientation: TabsOrientation;
  readonly activation: TabsActivation;
  readonly rows: ReadonlyArray<TabRow>;
  /** The rail, so {@link TabsIndicator} can measure it; none before mount. */
  readonly list: Option.Option<TabListRow>;
  readonly setList: (row: Option.Option<TabListRow>) => void;
  /** Whether an indicator owns the rail's emphasis, so a trigger steps aside. */
  readonly indicator: boolean;
  readonly registerIndicator: () => () => void;
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
  const [list, setList] = useState<Option.Option<TabListRow>>(Option.none());
  const [indicator, setIndicator] = useState(false);

  /** An indicator owns the rail's emphasis from its first commit (plan 715). */
  const registerIndicator = useCallback((): (() => void) => {
    setIndicator(true);
    return () => setIndicator(false);
  }, []);

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

  /**
   * The tab that held focus when it was last observable. A native focus change
   * runs no React `onFocus` and a removed host can no longer be read, so the
   * holder is remembered while the element still exists (plans 511/712).
   */
  const heldTab = useRef<Option.Option<string>>(Option.none());

  /** The tab a host id belongs to; the sampled and live reads share it. */
  const heldOf = useCallback(
    (id: number | null): Option.Option<string> =>
      id === null
        ? Option.none()
        : Option.map(
            Arr.findFirst(rows, (row) => row.id === id),
            (row) => row.value,
          ),
    [rows],
  );

  const nativeFocus = useNativeFocusId(rows.length > 0);

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
          onSome: () => {
            heldTab.current = Option.some(value);
          },
        },
      );
    },
    [rows],
  );

  const focusRow = useCallback(
    (row: TabRow, select: boolean): void => {
      setActive(Option.some(row.value));
      heldTab.current = Option.some(row.value);
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
    const live = Option.fromNullishOr(
      renderer?.getFocusedElementId?.() ?? null,
    );
    const liveTab = Option.flatMap(live, heldOf);
    const holder = Option.orElse(liveTab, () => heldTab.current);
    const target = Option.flatMap(holder, (value) =>
      Arr.findFirst(rows, (row) => row.value === value),
    );
    const lost = Option.exists(holder, () =>
      Option.match(target, {
        onNone: () => true,
        onSome: (row) => row.disabled,
      }),
    );
    // A control outside the tabs that the consumer focused in this update wins.
    const claimed = Option.isSome(live) && Option.isNone(liveTab);
    if (!lost || claimed) return;

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
  }, [focusRow, heldOf, renderer, rows, tabbable]);

  /**
   * Remember the tab the focus belongs to, so the next tabs change can tell a
   * vanished host from a set that never held focus. Runs after the handover: the
   * handover must read the holder from before this commit. The live read wins
   * over the sample, which is up to one interval old (plan 712).
   */
  useLayoutEffect(() => {
    heldTab.current = Option.orElse(
      Option.flatMap(
        Option.fromNullishOr(renderer?.getFocusedElementId?.() ?? null),
        heldOf,
      ),
      () => heldOf(nativeFocus),
    );
  }, [heldOf, nativeFocus, renderer]);

  const context = useMemo<TabsContextValue>(
    () => ({
      selected,
      active: liveActive,
      tabbable,
      orientation,
      activation,
      rows,
      list,
      setList,
      indicator,
      registerIndicator,
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
      indicator,
      jumpTo,
      list,
      liveActive,
      moveBy,
      noteFocus,
      orientation,
      register,
      registerIndicator,
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
  ref,
  ...rest
}: TabsListProps) => {
  const theme = useTheme();
  const { orientation, moveBy, jumpTo, setList } = useTabsContext();
  const [instance, setInstance] = useState<PublicInstance | undefined>(
    undefined,
  );
  const attach = useCallback((next: PublicInstance | null) => {
    setInstance(next ?? undefined);
  }, []);
  const setElement = useMergedRef<PublicInstance | null>(attach, ref);
  const testId = rest.testId;

  // The rail's host id is what the indicator measures, so it is registered with
  // the root rather than held here (plan 715).
  useLayoutEffect(() => {
    if (instance === undefined) return;
    setList(
      Option.some({
        id: instance.id,
        testId: Option.fromNullishOr(testId),
      }),
    );
    return () => setList(Option.none());
  }, [instance, setList, testId]);

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
      ref={setElement}
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
    indicator,
    register,
    updateRow,
    select,
    noteFocus,
  } = useTabsContext();
  const [focused, setFocused] = useFocusState(autoFocus, disabled);
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
  // The rail's selection is one thing at a time: an indicator paints it, so the
  // trigger only changes its text colour (plan 715).
  const filled = isSelected && !indicator;
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
          backgroundColor: filled ? theme.colors.card : undefined,
          color: isSelected
            ? theme.colors.foreground
            : theme.colors.mutedForeground,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          hover: disabled
            ? undefined
            : {
                backgroundColor: filled
                  ? theme.colors.card
                  : isSelected
                    ? undefined
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

/** {@link TabsIndicator} props. */
export interface TabsIndicatorProps extends Omit<Props, "children"> {
  /** The bar's thickness in px. Default 2; a fractional value truncates. */
  readonly thickness?: number;
  /** Whether the bar travels to a new tab. Default `true`. */
  readonly animate?: boolean;
}

/** 150 ms, easeOut: one tab's width, not an overlay's entrance. */
const INDICATOR_MOTION = { duration: 0.15, ease: "easeOut" } as const;

/**
 * The rail's selected cue as one shared bar, so it can travel between tabs.
 *
 * Mounted inside {@link TabsList}; while it is mounted the selected trigger does
 * not paint its own fill, so the rail's emphasis is exactly one element (plan
 * 715). The box is measured from the rail and the selected trigger after every
 * commit that can move it — the rail registers late, the selection and the rows
 * change, and the theme or the window resize the rail — and animates `left`,
 * `top`, `width` and `height`. A missing host renders nothing rather than a bar
 * at the origin.
 */
export const TabsIndicator = ({
  thickness: thicknessProp,
  animate = true,
  style,
  ...rest
}: TabsIndicatorProps) => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const window = useWindowSize();
  const { list, selected, rows, orientation, registerIndicator } =
    useTabsContext();
  const thickness = indicatorThickness(thicknessProp);
  const [box, setBox] = useState<Option.Option<IndicatorBox>>(Option.none());

  useLayoutEffect(() => registerIndicator(), [registerIndicator]);

  /** The selected trigger's host, or `-1` while no live trigger carries it. */
  const triggerId = Option.getOrElse(
    Option.map(
      Arr.findFirst(rows, (row) => row.value === selected),
      (row) => row.id,
    ),
    () => -1,
  );

  useLayoutEffect(() => {
    setBox(
      Option.flatMap(list, (rail) =>
        Option.flatMap(
          Option.fromNullishOr(renderer?.getElementBounds?.(rail.id) ?? null),
          (listBox) =>
            Option.map(
              Option.fromNullishOr(
                renderer?.getElementBounds?.(triggerId) ?? null,
              ),
              (triggerBox) =>
                indicatorBox({
                  list: listBox,
                  trigger: triggerBox,
                  padding: theme.spacing.xs,
                  orientation,
                  thickness,
                }),
            ),
        ),
      ),
    );
  }, [
    list,
    orientation,
    renderer,
    rows,
    selected,
    theme,
    thickness,
    triggerId,
    window.height,
    window.width,
  ]);

  // A caller's testId wins; otherwise the rail names the bar it owns.
  const testId =
    rest.testId ??
    Option.getOrElse(
      Option.flatMap(list, (rail) =>
        Option.map(rail.testId, (value) => `${value}-indicator`),
      ),
      () => "tabs-indicator",
    );

  return Option.match(box, {
    onNone: () => null,
    onSome: (value) => (
      <MotionSurface
        {...rest}
        testId={testId}
        initial={false}
        animate={value}
        transition={animate ? INDICATOR_MOTION : { duration: 0 }}
        style={mergeStyles(
          {
            position: "absolute",
            pointerEvents: "none",
            backgroundColor: theme.colors.primary,
            borderRadius: theme.radius.sm,
          },
          style,
        )}
      />
    ),
  });
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
  TabsIndicator,
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
  accepts: [TabsTrigger, TabsIndicator],
  hint: "Put TabsTrigger and TabsIndicator directly inside TabsList; put TabsContent beside it.",
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
    "the indicator's start along the rail is the list's own spacing.xs padding, so a caller padding override shifts it; no transform, so the slide animates left/top/width/height, and no reduced-motion signal",
  ],
  docs: "docs/tabs.mdx",
  example: "examples/tabs.example.tsx",
  testFile: "src/behaviour/tabs.test.tsx",
} as const;
