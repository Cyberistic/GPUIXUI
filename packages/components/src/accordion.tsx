/**
 * Accordion: stacked sections where one — or several — can be open.
 *
 * The two modes are separate state shapes in `accordion/logic.ts`, not a list
 * plus a boolean, because single mode has to decide what "opening another"
 * means and multiple mode has to preserve the order sections were opened in.
 *
 * The indicator is an icon swap (`chevron-down`/`chevron-up`), not a rotation:
 * `@gpuix/native@0.11.0` has no `transform` in `StyleDesc`.
 */

import type { KeyEvent, Props, PublicInstance } from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import { Icon } from "@gpuixui/icons";
import {
  ACCORDION_CONTENT,
  ACCORDION_INDICATOR,
  ACCORDION_ITEM,
  ACCORDION_ROOT,
  ACCORDION_TRIGGER,
  ACCORDION_TRIGGER_ROW,
  cn,
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
  initial,
  isOpen as isOpenState,
  toggle,
  type AccordionState,
} from "./accordion/logic.js";
import { AutoHeight } from "./auto-height.js";
import {
  firstEnabled,
  lastEnabled,
  nextEnabled,
  upsertValue,
  type ValueItem,
} from "./internal/collection.js";
import {
  isActivation,
  isDown,
  isFirst,
  isLast,
  isUp,
  swallowsDefault,
} from "./internal/key.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import { recipeStyle } from "./internal/recipe.js";
import { useMergedRef } from "./internal/ref.js";
import { controlHeight, controlRing, useTheme } from "./internal/theme.js";

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
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
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
  className,
  children,
  style,
  ...rest
}: Props & {
  readonly state: AccordionState;
  readonly onToggle: (item: string) => void;
  readonly className?: string;
}) => {
  const theme = useTheme();
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
          recipeStyle(cn(ACCORDION_ROOT, className), theme),
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
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly children?: PartChildren;
}

/** One section: a trigger and the content it reveals. */
export const AccordionItem = ({
  value,
  disabled = false,
  className,
  children,
  style,
  ...rest
}: AccordionItemProps) => {
  const theme = useTheme();
  const { lastValue } = useAccordionContext();

  const item = useMemo<AccordionItemContextValue>(
    () => ({ value, disabled }),
    [disabled, value],
  );
  const isLast = Option.contains(lastValue, value);
  assertParts(accordionItem, children);

  return (
    <AccordionItemContext.Provider value={item}>
      <div
        {...rest}
        style={mergeStyles(
          mergeStyles(
            recipeStyle(cn(ACCORDION_ITEM, className), theme),
            isLast
              ? undefined
              : {
                  borderBottomWidth: 1,
                  borderColor: theme.colors.border,
                },
          ),
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
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
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
  className,
  style,
  children,
  ref,
  ...rest
}: AccordionTriggerProps) => {
  const theme = useTheme();
  const { isOpen, toggle, registerTrigger, moveFrom, jumpTo } =
    useAccordionContext();
  const { value, disabled } = useAccordionItemContext();
  const [focused, setFocused] = useState(false);
  const [instance, setInstance] = useState<PublicInstance | undefined>(
    undefined,
  );
  const open = isOpen(value);
  const state: AccordionTriggerState = { open, disabled, focused };

  // Stable identity: a fresh ref callback each render would re-register the row
  // on every paint (ListItem has the same constraint).
  const attach = useCallback((next: PublicInstance | null) => {
    setInstance(next ?? undefined);
  }, []);
  const setElement = useMergedRef<PublicInstance | null>(attach, ref);

  useLayoutEffect(() => {
    // The native id only exists after commit, and it is what `moveFrom` focuses.
    if (instance === undefined) return;
    return registerTrigger({ id: instance.id, value, disabled });
  }, [disabled, instance, registerTrigger, value]);

  const flip = (): void => {
    if (!disabled) toggle(value);
  };

  const handleKeyDown = (event: KeyEvent): void => {
    if (disabled) return;
    // The press half of Space starts the gesture; the release flips the section.
    if (swallowsDefault(event, "down")) event.preventDefault();
    Match.value(event).pipe(
      Match.when((press) => isActivation(press, "down"), flip),
      Match.when(isDown, () => moveFrom(value, 1)),
      Match.when(isUp, () => moveFrom(value, -1)),
      Match.when(isFirst, () => jumpTo("first")),
      Match.when(isLast, () => jumpTo("last")),
      Match.orElse(() => undefined),
    );
  };

  const handleKeyUp = (event: KeyEvent): void => {
    if (disabled) return;
    if (isActivation(event, "up")) flip();
  };

  return (
    <div
      role="button"
      aria-expanded={open}
      {...rest}
      ref={setElement}
      tabIndex={disabled ? -1 : 0}
      onClick={
        disabled
          ? undefined
          : (event) => {
              onClick?.(event);
              flip();
            }
      }
      onKeyDown={(event: KeyEvent) => {
        handleKeyDown(event);
        onKeyDown?.(event);
      }}
      onKeyUp={(event: KeyEvent) => {
        handleKeyUp(event);
        onKeyUp?.(event);
      }}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(ACCORDION_TRIGGER, className), theme), {
          height: controlHeight(theme, "lg"),
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          hover: disabled ? undefined : { backgroundColor: theme.colors.hover },
          ...controlRing(theme, { disabled }),
        }),
        resolveStyle(style, state),
      )}
    >
      <div style={recipeStyle(ACCORDION_TRIGGER_ROW, theme)}>{children}</div>
      <div style={recipeStyle(ACCORDION_INDICATOR, theme)}>
        <Icon
          name={open ? "chevron-up" : "chevron-down"}
          size="xs"
          color={theme.colors.mutedForeground}
          label={open ? "Collapse" : "Expand"}
        />
      </div>
    </div>
  );
};

/** {@link AccordionContent} props. */
export interface AccordionContentProps extends Props {
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
}

/**
 * The body of an open section.
 *
 * The measured reveal belongs to `AutoHeight` — the plan-600 primitive that
 * reports the content's painted height and tweens the clipping box to it, keeps
 * the body mounted for its exit and paints it whole under the reduced
 * preference. This part only names the section's state and its recipe, so the
 * reveal's rules live in one module rather than one per disclosure surface.
 */
export const AccordionContent = ({
  className,
  style,
  children,
  ...rest
}: AccordionContentProps) => {
  const { isOpen } = useAccordionContext();
  const { value } = useAccordionItemContext();

  return (
    <AutoHeight
      {...rest}
      open={isOpen(value)}
      contentClassName={cn(ACCORDION_CONTENT, className)}
      style={style}
    >
      {children}
    </AutoHeight>
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
  limitations: [
    "the indicator is an icon swap: 0.11.0's StyleDesc has no transform",
    "the panel grows through `AutoHeight`'s measured height, so its first open paints at zero for a frame before it grows",
  ],
  docs: "docs/accordion.mdx",
  example: "examples/accordion.example.tsx",
  testFile: "src/behaviour/accordion.test.tsx",
} as const;
