/**
 * Accordion: stacked sections where one — or several — can be open.
 *
 * The two modes are separate state shapes in `accordion/logic.ts`, not a list
 * plus a boolean, because single mode has to decide what "opening another"
 * means and multiple mode has to preserve the order sections were opened in.
 *
 * The indicator swaps `chevron-down` for `chevron-up`, not a rotation:
 * `@gpuix/native@0.10.0`
 * has no `transform` in `StyleDesc` (see `host.ts:121-237`).
 */

import type { EventPayload, Props, PublicInstance } from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import { Icon } from "@gpuixui/icons";
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
  type RefObject,
} from "react";
import {
  initial,
  isOpen as isOpenState,
  toggle,
  type AccordionState,
} from "./accordion/logic.js";
import { activationHandlers } from "./internal/activate.js";
import { controlName } from "./internal/name.js";
import { stateDescription } from "./internal/state-description.js";
import {
  firstEnabled,
  lastEnabled,
  nextEnabled,
  upsertValue,
  type ValueItem,
} from "./internal/collection.js";
import { isDown, isFirst, isLast, isUp } from "./internal/key.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import { useMergedRef } from "./internal/ref.js";
import { Reveal } from "./internal/reveal.js";
import {
  controlHeight,
  focusRing,
  textStyle,
  useTheme,
} from "./internal/theme.js";

/** What an accordion part can rely on, regardless of mode. */
interface AccordionContextValue {
  readonly isOpen: (item: string) => boolean;
  readonly toggle: (item: string) => void;
  /** The last item in declaration order, so it draws no divider. */
  readonly lastValue: Option.Option<string>;
  /** Register a header row; returns the unregister function. */
  readonly registerTrigger: (row: ValueItem) => () => void;
  /** Move focus one enabled header from `value`. */
  readonly moveFrom: (value: string, delta: 1 | -1) => void;
  /** Focus the first or last enabled header. */
  readonly jumpTo: (edge: "first" | "last") => void;
}

const AccordionContext = createContext<AccordionContextValue | undefined>(
  undefined,
);

const useAccordionContext = (): AccordionContextValue => {
  const value = useContext(AccordionContext);
  if (value === undefined) {
    throw new Error("Accordion parts must be used inside Accordion");
  }
  return value;
};

/** The section a trigger and its content belong to. */
interface AccordionItemContextValue {
  readonly value: string;
  readonly disabled: boolean;
  /** The section header's native instance, so a close can return focus to it. */
  readonly trigger: RefObject<Option.Option<PublicInstance>>;
}

const AccordionItemContext = createContext<
  AccordionItemContextValue | undefined
>(undefined);

const useAccordionItemContext = (): AccordionItemContextValue => {
  const value = useContext(AccordionItemContext);
  if (value === undefined) {
    throw new Error(
      "AccordionTrigger and AccordionContent need an AccordionItem",
    );
  }
  return value;
};

/** Props every mode shares. */
interface AccordionCommonProps extends Omit<Props, "children"> {
  readonly children?: PartChildren;
}

/** {@link Accordion} props: one of two genuinely different state shapes. */
export type AccordionProps =
  | (AccordionCommonProps & {
      readonly type: "single";
      /** Whether the open section may be closed again. Default `false`. */
      readonly collapsible?: boolean;
      /** `null` means "nothing open"; `undefined` means uncontrolled. */
      readonly value?: string | null;
      readonly defaultValue?: string;
      readonly onValueChange?: (value: string | null) => void;
    })
  | (AccordionCommonProps & {
      readonly type: "multiple";
      readonly value?: ReadonlyArray<string>;
      readonly defaultValue?: ReadonlyArray<string>;
      readonly onValueChange?: (value: ReadonlyArray<string>) => void;
    });

/** The state the current props describe. */
const singleState = (
  value: string | null | undefined,
  collapsible: boolean | undefined,
): Option.Option<AccordionState> =>
  value === undefined
    ? Option.none()
    : Option.some({
        type: "single",
        open: Option.fromNullishOr(value),
        collapsible: collapsible ?? false,
      });

/** The frame every mode shares: the trigger registry, the divider order and the box. */
const AccordionFrame = ({
  state,
  onToggle,
  children,
  style,
  ...rest
}: Props & {
  readonly state: AccordionState;
  readonly onToggle: (item: string) => void;
}) => {
  const renderer = useGpuix().renderer;
  const [rows, setRows] = useState<ReadonlyArray<ValueItem>>([]);

  const registerTrigger = useCallback((row: ValueItem) => {
    setRows((current) => upsertValue(current, row));
    return () =>
      setRows((current) =>
        Arr.filter(current, (candidate) => candidate.value !== row.value),
      );
  }, []);

  const focusRow = useCallback(
    (row: ValueItem) => {
      renderer?.focusElement?.(row.id);
    },
    [renderer],
  );

  const moveFrom = useCallback(
    (value: string, delta: 1 | -1) => {
      pipe(
        nextEnabled(
          rows,
          Arr.findFirstIndex(rows, (row) => row.value === value),
          delta,
        ),
        Option.flatMap((index) => Arr.get(rows, index)),
        Option.match({ onNone: () => undefined, onSome: focusRow }),
      );
    },
    [focusRow, rows],
  );

  const jumpTo = useCallback(
    (edge: "first" | "last") => {
      const index = edge === "first" ? firstEnabled(rows) : lastEnabled(rows);
      pipe(
        Option.flatMap(index, (position) => Arr.get(rows, position)),
        Option.match({ onNone: () => undefined, onSome: focusRow }),
      );
    },
    [focusRow, rows],
  );

  const context = useMemo<AccordionContextValue>(
    () => ({
      isOpen: (item) => isOpenState(state, item),
      toggle: onToggle,
      lastValue: Option.map(Arr.last(rows), (row) => row.value),
      registerTrigger,
      moveFrom,
      jumpTo,
    }),
    [jumpTo, moveFrom, onToggle, registerTrigger, rows, state],
  );

  assertParts(accordionRoot, children);

  return (
    <AccordionContext.Provider value={context}>
      <div
        {...rest}
        style={mergeStyles(
          {
            display: "flex",
            flexDirection: "column",
            width: "100%",
          },
          style,
        )}
      >
        {children}
      </div>
    </AccordionContext.Provider>
  );
};

const SingleAccordion = ({
  collapsible = false,
  value,
  defaultValue,
  onValueChange,
  children,
  ...rest
}: Props & {
  readonly collapsible?: boolean;
  readonly value?: string | null;
  readonly defaultValue?: string;
  readonly onValueChange?: (value: string | null) => void;
}) => {
  const [state, setState] = useState<AccordionState>(() =>
    initial({ type: "single", collapsible, defaultValue }),
  );
  const current = Option.getOrElse(
    singleState(value, collapsible),
    () => state,
  );

  const toggleItem = useCallback(
    (item: string): void => {
      const next = toggle(current, item);
      // A non-collapsible accordion refuses to close its only open section;
      // `toggle` returns the same state, so there is nothing to report or store.
      if (next === current) return;
      if (value === undefined) setState(next);
      onValueChange?.(
        next.type === "single" ? Option.getOrNull(next.open) : null,
      );
    },
    [current, onValueChange, value],
  );

  return (
    <AccordionFrame state={current} onToggle={toggleItem} {...rest}>
      {children}
    </AccordionFrame>
  );
};

const MultipleAccordion = ({
  value,
  defaultValue,
  onValueChange,
  children,
  ...rest
}: Props & {
  readonly value?: ReadonlyArray<string>;
  readonly defaultValue?: ReadonlyArray<string>;
  readonly onValueChange?: (value: ReadonlyArray<string>) => void;
}) => {
  const [state, setState] = useState<AccordionState>(() =>
    initial({ type: "multiple", defaultValue }),
  );
  const current =
    value === undefined ? state : ({ type: "multiple", open: value } as const);

  const toggleItem = useCallback(
    (item: string): void => {
      const next = toggle(current, item);
      if (value === undefined) setState(next);
      onValueChange?.(next.type === "multiple" ? next.open : []);
    },
    [current, onValueChange, value],
  );

  return (
    <AccordionFrame state={current} onToggle={toggleItem} {...rest}>
      {children}
    </AccordionFrame>
  );
};

/**
 * One accordion. `single` keeps at most one section open; with
 * `collapsible={false}` it refuses to close the open one. `multiple` keeps an
 * ordered set. Disabled sections cannot be toggled by any path.
 */
export const Accordion = (props: AccordionProps) => {
  if (props.type === "single") {
    const { type: _type, ...rest } = props;
    return <SingleAccordion {...rest} />;
  }
  const { type: _type, ...rest } = props;
  return <MultipleAccordion {...rest} />;
};

/** {@link AccordionItem} props. */
export interface AccordionItemProps extends Omit<Props, "children"> {
  /** Stable id and the value the root reports. */
  readonly value: string;
  readonly disabled?: boolean;
  readonly children?: PartChildren;
}

/** One section: a trigger and the content it reveals. */
export const AccordionItem = ({
  value,
  disabled = false,
  children,
  style,
  ...rest
}: AccordionItemProps) => {
  const theme = useTheme();
  const { lastValue } = useAccordionContext();
  const trigger = useRef<Option.Option<PublicInstance>>(Option.none());

  const item = useMemo<AccordionItemContextValue>(
    () => ({ value, disabled, trigger }),
    [disabled, trigger, value],
  );
  const isLast = Option.contains(lastValue, value);
  assertParts(accordionItem, children);

  return (
    <AccordionItemContext.Provider value={item}>
      <div
        {...rest}
        style={mergeStyles(
          {
            display: "flex",
            flexDirection: "column",
            ...(isLast
              ? {}
              : {
                  borderBottomWidth: theme.borderWidth.thin,
                  borderColor: theme.colors.border,
                }),
          },
          style,
        )}
      >
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
};

/** {@link AccordionTrigger} props. */
export interface AccordionTriggerProps extends Omit<Props, "style"> {
  /** A style, or a function of the header's state. */
  readonly style?: StateStyle<AccordionTriggerState>;
}

/** What a header draws: its section's state and its own focus. */
export interface AccordionTriggerState {
  /** The section this header controls is open. */
  readonly open: boolean;
  readonly disabled: boolean;
  readonly focused: boolean;
}

/** The full-width heading button of one section. */
export const AccordionTrigger = ({
  onClick,
  onKeyDown,
  onKeyUp,
  onFocus,
  onBlur,
  autoFocus = false,
  style,
  children,
  ref,
  ...rest
}: AccordionTriggerProps) => {
  const theme = useTheme();
  const { isOpen, toggle, registerTrigger, moveFrom, jumpTo } =
    useAccordionContext();
  const { value, disabled, trigger } = useAccordionItemContext();
  const name = controlName(rest["aria-label"], children);
  const [focused, setFocused] = useState(autoFocus && !disabled);
  const [instance, setInstance] = useState<PublicInstance | undefined>(
    undefined,
  );
  const open = isOpen(value);
  const state: AccordionTriggerState = { open, disabled, focused };

  // Stable identity: a fresh ref callback each render would re-register the row
  // on every paint (ListItem has the same constraint).
  const attach = useCallback(
    (next: PublicInstance | null) => {
      trigger.current = Option.fromNullishOr(next);
      setInstance(next ?? undefined);
    },
    [trigger],
  );
  const setElement = useMergedRef<PublicInstance | null>(attach, ref);

  useLayoutEffect(() => {
    // The native id only exists after commit, and it is what `moveFrom` focuses.
    if (instance === undefined) return;
    return registerTrigger({ id: instance.id, value, disabled });
  }, [disabled, instance, registerTrigger, value]);

  const flip = (): void => {
    if (!disabled) toggle(value);
  };

  const navigate = (event: EventPayload): void => {
    if (disabled) return;
    Match.value(event).pipe(
      Match.when(isDown, () => moveFrom(value, 1)),
      Match.when(isUp, () => moveFrom(value, -1)),
      Match.when(isFirst, () => jumpTo("first")),
      Match.when(isLast, () => jumpTo("last")),
      Match.orElse(() => undefined),
    );
  };

  const keyHandlers = activationHandlers(flip, {
    disabled,
    onKeyDown: (event) => {
      navigate(event);
      onKeyDown?.(event);
    },
    onKeyUp,
  });

  return (
    <div
      role="button"
      aria-expanded={open}
      {...rest}
      {...(name === undefined ? {} : { "aria-label": name })}
      {...stateDescription(disabled, rest["aria-description"])}
      ref={setElement}
      autoFocus={autoFocus && !disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={
        disabled
          ? undefined
          : (event) => {
              onClick?.(event);
              flip();
            }
      }
      {...keyHandlers}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      style={mergeStyles(
        {
          ...textStyle(theme, "label"),
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: theme.spacing.md,
          width: "100%",
          height: controlHeight(theme, "lg"),
          paddingLeft: theme.spacing.xs,
          paddingRight: theme.spacing.xs,
          backgroundColor: undefined,
          color: theme.colors.foreground,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          hover: disabled ? undefined : { color: theme.colors.primary },
          ...(focused ? focusRing(theme) : {}),
        },
        resolveStyle(style, state),
      )}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          flexGrow: 1,
          minWidth: 0,
        }}
      >
        {children}
      </div>
      <Icon
        name={open ? "chevron-up" : "chevron-down"}
        color={theme.colors.mutedForeground}
        size="sm"
      />
    </div>
  );
};

/** {@link AccordionContent} props. */
export interface AccordionContentProps extends Props {
  /** Tween to the measured height; `false` snaps. Default `true`. */
  readonly animate?: boolean;
}

/**
 * The body of a section. It stays mounted — so its state survives a switch —
 * and its height tweens to the measured content height. While closed it is
 * hidden, which also removes it from the tab order (plan 372).
 */
export const AccordionContent = ({
  animate = true,
  style,
  children,
  ...rest
}: AccordionContentProps) => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const { isOpen } = useAccordionContext();
  const { value, trigger } = useAccordionItemContext();
  const restoreFocus = useCallback(() => {
    Option.match(trigger.current, {
      onNone: () => undefined,
      onSome: (element) => renderer?.focusElement?.(element.id),
    });
  }, [renderer, trigger]);

  return (
    <Reveal
      open={isOpen(value)}
      animate={animate}
      restoreFocus={restoreFocus}
      {...rest}
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.md,
          paddingLeft: theme.spacing.xs,
          paddingRight: theme.spacing.xs,
          paddingBottom: theme.spacing.md,
          color: theme.colors.mutedForeground,
        },
        style,
      )}
    >
      {children}
    </Reveal>
  );
};

/** Every part of Accordion, so a misplaced sibling is named. */
const accordionParts: ReadonlyArray<PartComponent> = [
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
];

const accordionRoot: PartsContract = {
  parent: "Accordion",
  family: accordionParts,
  accepts: [AccordionItem],
  hint: "Put AccordionItem sections directly inside Accordion.",
};

const accordionItem: PartsContract = {
  parent: "AccordionItem",
  family: accordionParts,
  accepts: [AccordionTrigger, AccordionContent],
  hint: "Put AccordionTrigger and AccordionContent directly inside AccordionItem.",
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const accordionMeta = {
  name: "Accordions",
  tier: 2,
  status: "done",
  gpuixSupport: "yes",
  focusable: true,
  limitations: [
    "the chevron swaps direction: 0.10.0's StyleDesc has no transform",
    "closed bodies stay mounted and are hidden by `visibility`; a rewrap while closed is not re-measured until the next open",
    "a close that began with focus inside the body returns focus to its header by box containment; a control clipped out of the visible body is not recognised",
  ],
  docs: "docs/accordion.mdx",
  example: "examples/accordion.example.tsx",
  testFile: "src/behaviour/accordion.test.tsx",
} as const;
