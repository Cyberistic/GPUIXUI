/** @jsxImportSource @gpuix/react */
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
  useRef,
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
import { useMoveTiming } from "./internal/presence.js";
import { recipeStyle } from "./internal/recipe.js";
import { useMergedRef } from "./internal/ref.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import {
  controlHeight,
  controlRing,
  disabledFade,
  useTheme,
} from "./internal/theme.js";
import { indicatorBox, measuredBox, type TabBox } from "./tabs/indicator.js";
import {
  activationOf,
  moveOrigin,
  orientationOf,
  selectsOnFocus,
  type TabsActivation,
  type TabsOrientation,
} from "./tabs/logic.js";

export type { TabsActivation, TabsOrientation } from "./tabs/logic.js";

interface TabRow {
  readonly value: string;
  readonly id: number;
  readonly disabled: boolean;
}

interface MeasuredTab extends TabBox {
  readonly value: string;
}

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

const useTabsContext = (): TabsContextValue => {
  const value = useContext(TabsContext);
  if (value === undefined) {
    throw new Error("Tabs parts must be used inside Tabs");
  }
  return value;
};

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

const sameBox = (a: TabBox, b: TabBox): boolean =>
  Math.abs(a.x - b.x) < 0.5 &&
  Math.abs(a.y - b.y) < 0.5 &&
  Math.abs(a.width - b.width) < 0.5 &&
  Math.abs(a.height - b.height) < 0.5;

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

export interface TabsProps extends Omit<Props, "children"> {
  readonly value?: string;

  readonly defaultValue?: string;
  readonly onValueChange?: (value: string) => void;

  readonly orientation?: TabsOrientation;

  readonly activation?: TabsActivation;

  readonly className?: string;
  readonly children?: PartChildren;
}

export const Tabs = ({
  value: valueProp,
  defaultValue = "",
  onValueChange,
  orientation,
  activation,
  className,
  children,
  style,
  ...rest
}: TabsProps) => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;

  const axis = orientationOf(orientation);
  const policy = activationOf(activation);
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
          onSome: (row) => focusRow(row, selectsOnFocus(policy)),
        }),
      );
    },
    [active, focusRow, indexOf, policy, rows, selected],
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
          onSome: (row) => focusRow(row, selectsOnFocus(policy)),
        }),
      );
    },
    [focusRow, policy, rows],
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
      orientation: axis,
      activation: policy,
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
      axis,
      active,
      boxes,
      focusRow,
      jumpTo,
      moveBy,
      noteFocus,
      policy,
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
          recipeStyle(cn(TABS_ROOT, TABS_ORIENTATION[axis], className), theme),
          style,
        )}
      >
        {children}
      </div>
    </TabsContext.Provider>
  );
};

export interface TabsListProps extends Omit<Props, "children"> {
  readonly label?: string;

  readonly className?: string;
  readonly children?: PartChildren;
}

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
  const renderer = useGpuix().renderer;
  const {
    orientation,
    moveBy,
    jumpTo,
    selectActive,
    selected,
    boxes,
    rows,
    reportBox,
  } = useTabsContext();
  const [origin, setOrigin] = useState<Option.Option<TabBox>>(Option.none());
  const probe = useRef<PublicInstance | null>(null);
  const move = useMoveTiming("normal");
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

  const keepOrigin = (box: TabBox): void =>
    setOrigin((current) =>
      Option.match(current, {
        onNone: () => Option.some(box),
        onSome: (previous) =>
          sameBox(previous, box) ? current : Option.some(box),
      }),
    );

  const noteOrigin = (event: EventPayload): void =>
    pipe(
      measuredBox(event),
      Option.match({ onNone: () => undefined, onSome: keepOrigin }),
    );

  useLayoutEffect(() => {
    const at = (id: number) =>
      Option.fromNullishOr(renderer?.getElementBounds?.(id));
    Option.match(
      Option.flatMap(Option.fromNullishOr(probe.current), (element) =>
        at(element.id),
      ),
      {
        onNone: () => undefined,
        onSome: (box) => {
          keepOrigin(box);
          Arr.forEach(rows, (row) =>
            Option.match(at(row.id), {
              onNone: () => undefined,
              onSome: (next) => reportBox(row.value, next),
            }),
          );
        },
      },
    );
  }, [boxes, className, origin, renderer, reportBox, rows, style]);

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

          { position: "relative" },
        ),
        style,
      )}
    >
      <div
        testId="tabs-origin"
        ref={probe}
        onLayout={noteOrigin}
        style={{
          position: "absolute",

          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
          pointerEvents: "none",
        }}
      />
      {Option.match(surface, {
        onNone: () => null,
        onSome: ({ origin: anchoredAt, selected: box }) => (
          <div
            testId="tabs-indicator"
            motion={{
              initial: false,
              animate: indicatorBox(anchoredAt, box),
              transition: move,
            }}
            style={{
              position: "absolute",

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

export interface TabsTriggerProps extends Omit<Props, "style"> {
  readonly value: string;
  readonly disabled?: boolean;

  readonly className?: string;

  readonly style?: StateStyle<TabsTriggerState>;
}

export interface TabsTriggerState {
  readonly active: boolean;
  readonly disabled: boolean;
  readonly focused: boolean;

  readonly highlighted: boolean;
  readonly orientation: TabsOrientation;
}

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
          ...disabledFade(disabled),
          hover: disabled
            ? undefined
            : {
                backgroundColor: isSelected ? undefined : theme.colors.hover,
                color: theme.colors.foreground,
              },
          ...controlRing(theme, { disabled }),
        }),
        resolveStyle(style, state),
      )}
    />
  );
};

export interface TabsContentProps extends Props {
  readonly value: string;

  readonly className?: string;
}

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

export const tabsMeta = {
  name: "Tabs",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "no aria-orientation, aria-controls or aria-labelledby in 0.11.0; the panel is named by its value",
    "the trigger/panel relationship is positional, not semantic",
    "the selected surface is measured through onLayout and slides by retargeting its left/top/width/height on the timing table's `standard` phase, because it moves between two resting states rather than arriving; the runtime has no transform, so the movement is a box interpolation, and reduced motion is the caller's MotionProvider policy",
    "no zIndex: the surface stays behind the triggers by being their earlier sibling",
  ],
  docs: "docs/tabs.mdx",
  example: "examples/tabs.example.tsx",
  testFile: "src/behaviour/tabs.test.tsx",
} as const;
