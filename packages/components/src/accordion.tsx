/** @jsxImportSource @gpuix/react */
import type { KeyEvent, Props, PublicInstance } from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
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
  openSectionsOf,
  toggle,
  type AccordionState,
} from "./accordion/logic.js";
import { AutoHeight } from "./auto-height.js";
import { FlipMark } from "./internal/flip-mark.js";
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
import {
  controlHeight,
  controlRing,
  disabledFade,
  useTheme,
} from "./internal/theme.js";

interface AccordionContextValue {
  readonly isOpen: (item: string) => boolean;
  readonly toggle: (item: string) => void;

  readonly lastValue: Option.Option<string>;

  readonly registerTrigger: (row: ValueItem) => () => void;

  readonly moveFrom: (value: string, delta: 1 | -1) => void;

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

interface AccordionCommonProps extends Omit<Props, "children"> {
  readonly className?: string;
  readonly children?: PartChildren;
}

export type AccordionProps =
  | (AccordionCommonProps & {
      readonly type: "single";

      readonly collapsible?: boolean;

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

  const controlled = useMemo(() => openSectionsOf(value), [value]);
  const current = Option.match(controlled, {
    onNone: () => state,
    onSome: (open) => ({ type: "multiple", open }) as const,
  });

  const toggleItem = useCallback(
    (item: string): void => {
      const next = toggle(current, item);
      if (Option.isNone(controlled)) setState(next);
      onValueChange?.(next.type === "multiple" ? next.open : []);
    },
    [controlled, current, onValueChange],
  );

  return (
    <AccordionFrame state={current} onToggle={toggleItem} {...rest}>
      {children}
    </AccordionFrame>
  );
};

export const Accordion = (props: AccordionProps) => {
  if (props.type === "single") {
    const { type: _type, ...rest } = props;
    return <SingleAccordion {...rest} />;
  }
  const { type: _type, ...rest } = props;
  return <MultipleAccordion {...rest} />;
};

export interface AccordionItemProps extends Omit<Props, "children"> {
  readonly value: string;
  readonly disabled?: boolean;

  readonly className?: string;
  readonly children?: PartChildren;
}

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

export interface AccordionTriggerProps extends Omit<Props, "style"> {
  readonly className?: string;

  readonly style?: StateStyle<AccordionTriggerState>;
}

export interface AccordionTriggerState {
  readonly open: boolean;
  readonly disabled: boolean;
  readonly focused: boolean;
}

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

  const attach = useCallback((next: PublicInstance | null) => {
    setInstance(next ?? undefined);
  }, []);
  const setElement = useMergedRef<PublicInstance | null>(attach, ref);

  useLayoutEffect(() => {
    if (instance === undefined) return;
    return registerTrigger({ id: instance.id, value, disabled });
  }, [disabled, instance, registerTrigger, value]);

  const flip = (): void => {
    if (!disabled) toggle(value);
  };

  const handleKeyDown = (event: KeyEvent): void => {
    if (disabled) return;

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

  const glyphId = (mark: "up" | "down"): string | undefined =>
    rest.testId === undefined ? undefined : `${rest.testId}-chevron-${mark}`;

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
          ...disabledFade(disabled),
          hover: disabled ? undefined : { backgroundColor: theme.colors.hover },
          ...controlRing(theme, { disabled }),
        }),
        resolveStyle(style, state),
      )}
    >
      <div style={recipeStyle(ACCORDION_TRIGGER_ROW, theme)}>{children}</div>
      <div style={recipeStyle(ACCORDION_INDICATOR, theme)}>
        <FlipMark
          off="chevron-down"
          on="chevron-up"
          shown={open}
          offLabel="Expand"
          onLabel="Collapse"
          color={theme.colors.mutedForeground}
          testIdFor={(mark) => glyphId(mark === "on" ? "up" : "down")}
        />
      </div>
    </div>
  );
};

export interface AccordionContentProps extends Props {
  readonly className?: string;
}

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

export const accordionMeta = {
  name: "Accordions",
  tier: 2,
  status: "done",
  gpuixSupport: "yes",
  limitations: [
    "the panel grows to the content's measured height, and the indicator cross-fades two marks instead of rotating one: 0.11.0's StyleDesc has no transform",
  ],
  docs: "docs/accordion.mdx",
  example: "examples/accordion.example.tsx",
  testFile: "src/behaviour/accordion.test.tsx",
} as const;
