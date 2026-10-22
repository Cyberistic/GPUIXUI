/**
 * Tabs: a roving-focus tab list and the panels it switches.
 *
 * The list owns the keys — a key event fired on a focused trigger bubbles to the
 * list, the same measured behaviour that lets `List` own its rows — and the
 * trigger owns its own focus. A `Tab` traversal does deliver `onFocus`
 * (re-measured on 0.11.0 by the playground's `tabs-lifecycle`, `focuses=1`), but
 * an arrow move anchors on the trigger that sent the key, then the selection:
 * the key's own element is the precise origin, and a key that names no row still
 * moves from the selection rather than re-anchoring at the first enabled tab.
 * Index arithmetic is
 * `internal/collection.ts`, so disabled tabs are skipped and wrap-around agrees
 * with every other collection in the package.
 *
 * The selected surface is **one** element for the whole set (`tabs-indicator`),
 * not a background on each trigger. It is measured rather than assumed: each
 * trigger reports its painted box through `onLayout`, the rail reports where its
 * absolute children start from (`tabs-origin`), and `tabs/indicator.ts` turns the
 * pair into the pill's offsets. So the pill follows a trigger that resizes, and
 * a caller's rail padding or border cannot leave it short.
 *
 * Measured limitations: the pill **slides** by retargeting the box's
 * `left`/`top`/`width`/`height` (a `normal` motion target), because
 * `@gpuix/native@0.11.0` has no `transform`; the movement is a box
 * interpolation rather than a scaled layer, and reduced motion is the
 * consumer's policy (`MotionProvider`). There is no `zIndex`, so the pill stays
 * behind the triggers by being their earlier sibling. It has no
 * `aria-orientation`, `aria-controls` or `aria-labelledby` either (`HostProps`),
 * so the panel is named by its value and the trigger/panel relationship is
 * positional.
 */

import type {
  EventPayload,
  KeyEvent,
  Props,
  PublicInstance,
} from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import {
  cn,
  TABS_CONTENT,
  TABS_LIST,
  TABS_LIST_ORIENTATION,
  TABS_ORIENTATION,
  TABS_ROOT,
  TABS_TRIGGER,
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
  swallowsDefault,
} from "./internal/key.js";
import { useSurfaceTiming } from "./internal/presence.js";
import { recipeStyle } from "./internal/recipe.js";
import { useMergedRef } from "./internal/ref.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import { controlHeight, keyboardRing, useTheme } from "./internal/theme.js";
import { indicatorBox, measuredBox, type TabBox } from "./tabs/indicator.js";
import {
  moveOrigin,
  selectsOnFocus,
  type TabsActivation,
} from "./tabs/logic.js";

/** The two axes a tab list can run along. */
export type TabsOrientation = "horizontal" | "vertical";

/** One registered trigger: its value, native id and whether it accepts input. */
interface TabRow {
  readonly value: string;
  readonly id: number;
  readonly disabled: boolean;
}

/** A trigger's painted box, kept by the set for the shared selected surface. */
interface MeasuredTab extends TabBox {
  readonly value: string;
}

/** The rules a tab part follows; throws outside a {@link Tabs} root. */
interface TabsContextValue {
  readonly selected: string;
  readonly active: Option.Option<string>;
  readonly tabbable: Option.Option<string>;
  readonly orientation: TabsOrientation;
  readonly activation: TabsActivation;
  readonly rows: ReadonlyArray<TabRow>;
  readonly boxes: ReadonlyArray<MeasuredTab>;
  readonly register: (row: TabRow) => () => void;
  readonly reportBox: (value: string, box: TabBox) => void;
  readonly select: (value: string) => void;
  readonly noteFocus: (value: string) => void;
  readonly focusRow: (row: TabRow, select: boolean) => void;
  readonly moveBy: (delta: 1 | -1, keyOrigin?: Option.Option<string>) => void;
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

/** Whether two painted boxes are the same box, to the nearest subpixel. */
const sameBox = (a: TabBox, b: TabBox): boolean =>
  Math.abs(a.x - b.x) < 0.5 &&
  Math.abs(a.y - b.y) < 0.5 &&
  Math.abs(a.width - b.width) < 0.5 &&
  Math.abs(a.height - b.height) < 0.5;

/**
 * Take a trigger's latest painted box. An unmoved box keeps the previous array,
 * so a paint that reports the same geometry costs no render.
 */
const upsertBox = (
  boxes: ReadonlyArray<MeasuredTab>,
  box: MeasuredTab,
): ReadonlyArray<MeasuredTab> =>
  Option.match(
    Arr.findFirst(boxes, (candidate) => candidate.value === box.value),
    {
      onNone: () => Arr.append(boxes, box),
      onSome: (current) =>
        sameBox(current, box)
          ? boxes
          : Arr.map(boxes, (candidate) =>
              candidate.value === box.value ? box : candidate,
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
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
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
  className,
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
  const [boxes, setBoxes] = useState<ReadonlyArray<MeasuredTab>>([]);

  const reportBox = useCallback((value: string, box: TabBox) => {
    setBoxes((current) => upsertBox(current, { value, ...box }));
  }, []);

  const register = useCallback((row: TabRow) => {
    setRows((current) => upsert(current, row));
    return () => {
      setRows((current) =>
        Arr.filter(current, (candidate) => candidate.value !== row.value),
      );
      setBoxes((current) =>
        Arr.filter(current, (box) => box.value !== row.value),
      );
    };
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
    (delta: 1 | -1, keyOrigin: Option.Option<string> = Option.none()): void => {
      pipe(
        rowAt(
          rows,
          nextEnabled(
            collection(rows),
            moveOrigin({ keyOrigin, active, selected }, indexOf),
            delta,
          ),
        ),
        Option.match({
          onNone: () => undefined,
          onSome: (row) => focusRow(row, selectsOnFocus(activation)),
        }),
      );
    },
    [activation, active, focusRow, indexOf, rows, selected],
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
      boxes,
      register,
      reportBox,
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
      boxes,
      focusRow,
      jumpTo,
      moveBy,
      noteFocus,
      orientation,
      register,
      reportBox,
      rows,
      select,
      selectActive,
      selected,
      tabbable,
    ],
  );

  assertParts(tabsRoot, children);

  return (
    <TabsContext.Provider value={context}>
      <div
        {...rest}
        style={mergeStyles(
          recipeStyle(
            cn(TABS_ROOT, TABS_ORIENTATION[orientation], className),
            theme,
          ),
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
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly children?: PartChildren;
}

/**
 * The row of triggers. Owns the arrow, Home and End keys, and the shared
 * selected surface every trigger paints over.
 *
 * The surface is placed from two measurements rather than guessed: the
 * `tabs-origin` probe is a 1×1 swatch at the rail's absolute origin (whatever
 * box the runtime resolves that against, borders and padding included), and each
 * trigger reports its own painted box. Together they give the pill's offsets
 * exactly, so a caller's rail padding cannot leave it short.
 */
export const TabsList = ({
  label,
  className,
  onKeyDown,
  onKeyUp,
  children,
  style,
  ...rest
}: TabsListProps) => {
  const theme = useTheme();
  const { orientation, moveBy, jumpTo, selectActive, selected, boxes, rows } =
    useTabsContext();
  const [origin, setOrigin] = useState<Option.Option<TabBox>>(Option.none());
  const timing = useSurfaceTiming("normal");
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

  /** The trigger whose key reached the list, when a trigger fired it. */
  const originOf = (event: EventPayload): Option.Option<string> =>
    pipe(
      Arr.findFirst(rows, (row) => row.id === event.elementId),
      Option.map((row) => row.value),
    );

  const handleKeyDown = (event: KeyEvent): void => {
    if (swallowsDefault(event, "down")) event.preventDefault();
    Match.value(event).pipe(
      Match.when(isFirst, () => jumpTo("first")),
      Match.when(isLast, () => jumpTo("last")),
      Match.when((press) => isActivation(press, "down"), selectActive),
      Match.orElse((value) =>
        pipe(
          direction(value),
          Option.match({
            onNone: () => undefined,
            onSome: (delta) => moveBy(delta, originOf(value)),
          }),
        ),
      ),
    );
  };

  /** The origin is a property of the rail's containing block: take it once. */
  const noteOrigin = (event: EventPayload): void =>
    pipe(
      measuredBox(event),
      Option.match({
        onNone: () => undefined,
        onSome: (box) =>
          setOrigin((current) =>
            Option.isNone(current) ? Option.some(box) : current,
          ),
      }),
    );

  const surface = Option.all({
    origin,
    selected: Arr.findFirst(boxes, (box) => box.value === selected),
  });

  return (
    <div
      role="tablist"
      {...(label === undefined ? {} : { "aria-label": label })}
      {...rest}
      onKeyDown={(event) => {
        handleKeyDown(event);
        onKeyDown?.(event);
      }}
      onKeyUp={(event) => {
        if (isActivation(event, "up")) selectActive();
        onKeyUp?.(event);
      }}
      style={mergeStyles(
        mergeStyles(
          recipeStyle(
            cn(TABS_LIST, TABS_LIST_ORIENTATION[orientation], className),
            theme,
          ),
          // The pill's containing block: it must be the rail, and its absolute
          // children are what the probe measures.
          { position: "relative" },
        ),
        style,
      )}
    >
      <div
        testId="tabs-origin"
        onLayout={noteOrigin}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 1,
          height: 1,
          backgroundColor: theme.colors.background,
          pointerEvents: "none",
        }}
      />
      {Option.match(surface, {
        onNone: () => null,
        onSome: ({ origin: anchoredAt, selected: box }) => (
          <div
            testId="tabs-indicator"
            motion={{
              // The first measured box is painted where it is; every later one
              // retargets from the box on screen, which is the slide.
              initial: false,
              animate: indicatorBox(anchoredAt, box),
              transition: timing.enter,
            }}
            style={{
              position: "absolute",
              // The pill's whole job is to show which tab is selected, so it
              // wears the `selected` state wash: `card` equals the rail's own
              // `background` in the high-contrast light theme (1.00:1), so the
              // selected tab painted no surface at all. `selected` is held to
              // the decorative floor on `background`, and the `foreground`
              // label it carries is a measured body pair on that fill.
              backgroundColor: theme.colors.selected,
              borderRadius: theme.radius.sm,
              pointerEvents: "none",
            }}
          />
        ),
      })}
      {children}
    </div>
  );
};

/** {@link TabsTrigger} props. */
export interface TabsTriggerProps extends Omit<Props, "style"> {
  /** The value this trigger selects. Must match a {@link TabsContent}. */
  readonly value: string;
  readonly disabled?: boolean;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
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
  className,
  onClick,
  onFocus,
  onBlur,
  onLayout,
  style,
  ref,
  ...rest
}: TabsTriggerProps) => {
  const theme = useTheme();
  const {
    selected,
    active,
    orientation,
    tabbable,
    register,
    reportBox,
    select,
    noteFocus,
  } = useTabsContext();
  const [focused, setFocused] = useState(false);
  const [instance, setInstance] = useState<PublicInstance | undefined>(
    undefined,
  );

  const attach = useCallback((next: PublicInstance | null) => {
    setInstance(next ?? undefined);
  }, []);
  const setElement = useMergedRef<PublicInstance | null>(attach, ref);

  useLayoutEffect(() => {
    if (instance === undefined) return;
    return register({ value, id: instance.id, disabled });
  }, [disabled, instance, register, value]);

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
      ref={setElement}
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
      onLayout={(event) => {
        pipe(
          measuredBox(event),
          Option.match({
            onNone: () => undefined,
            onSome: (box) => reportBox(value, box),
          }),
        );
        onLayout?.(event);
      }}
      onClick={
        disabled
          ? undefined
          : (event) => {
              onClick?.(event);
              select(value);
            }
      }
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(TABS_TRIGGER, className), theme), {
          height: controlHeight(theme, "md"),
          color: isSelected
            ? theme.colors.foreground
            : theme.colors.mutedForeground,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          hover: disabled
            ? undefined
            : {
                backgroundColor: isSelected ? undefined : theme.colors.hover,
                color: theme.colors.foreground,
              },
          ...keyboardRing(theme),
        }),
        resolveStyle(style, state),
      )}
    />
  );
};

/** {@link TabsContent} props. */
export interface TabsContentProps extends Props {
  /** The trigger value that reveals this panel. */
  readonly value: string;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
}

/** The panel for one tab. Renders nothing while another tab is selected. */
export const TabsContent = ({
  value,
  className,
  style,
  ...rest
}: TabsContentProps) => {
  const { selected } = useTabsContext();
  const theme = useTheme();

  if (selected !== value) return null;
  return (
    <div
      role="tabpanel"
      aria-label={value}
      {...rest}
      style={mergeStyles(
        recipeStyle(cn(TABS_CONTENT, className), theme),
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
  limitations: [
    "no aria-orientation, aria-controls or aria-labelledby in 0.11.0; the panel is named by its value",
    "the trigger/panel relationship is positional, not semantic",
    "the selected surface is measured through onLayout and slides by retargeting its left/top/width/height; the runtime has no transform, so the movement is a box interpolation, and reduced motion is the caller's MotionProvider policy",
    "no zIndex: the surface stays behind the triggers by being their earlier sibling",
  ],
  docs: "docs/tabs.mdx",
  example: "examples/tabs.example.tsx",
  testFile: "src/behaviour/tabs.test.tsx",
} as const;
