/**
 * Accordion: stacked sections where one — or several — can be open.
 *
 * The two modes are separate state shapes in `accordion/logic.ts`, not a list
 * plus a boolean, because single mode has to decide what "opening another"
 * means and multiple mode has to preserve the order sections were opened in.
 *
 * The indicator is a glyph swap (`⌄`/`⌃`), not a rotation: `@gpuix/native@0.10.0`
 * has no `transform` in `StyleDesc` (see `host.ts:121-237`).
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
  initial,
  isOpen as isOpenState,
  toggle,
  type AccordionState,
} from "./accordion/logic.js";
import {
  firstEnabled,
  lastEnabled,
  nextEnabled,
  upsertValue,
  type ValueItem,
} from "./internal/collection.js";
import { isActivation, isDown, isFirst, isLast, isUp } from "./internal/key.js";
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
interface AccordionCommonProps extends Props {
  readonly children?: ReactNode;
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
export interface AccordionItemProps extends Props {
  /** Stable id and the value the root reports. */
  readonly value: string;
  readonly disabled?: boolean;
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

  const item = useMemo<AccordionItemContextValue>(
    () => ({ value, disabled }),
    [disabled, value],
  );
  const isLast = Option.contains(lastValue, value);

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

/** The full-width heading button of one section. */
export const AccordionTrigger = ({
  onClick,
  onKeyDown,
  onFocus,
  onBlur,
  style,
  children,
  ...rest
}: Props) => {
  const theme = useTheme();
  const { isOpen, toggle, registerTrigger, moveFrom, jumpTo } =
    useAccordionContext();
  const { value, disabled } = useAccordionItemContext();
  const [focused, setFocused] = useState(false);
  const [instance, setInstance] = useState<PublicInstance | undefined>(
    undefined,
  );
  const open = isOpen(value);

  // Stable identity: a fresh ref callback each render would re-register the row
  // on every paint (ListItem has the same constraint).
  const attach = useCallback((next: PublicInstance | null) => {
    setInstance(next ?? undefined);
  }, []);

  useLayoutEffect(() => {
    // The native id only exists after commit, and it is what `moveFrom` focuses.
    if (instance === undefined) return;
    return registerTrigger({ id: instance.id, value, disabled });
  }, [disabled, instance, registerTrigger, value]);

  const flip = (): void => {
    if (!disabled) toggle(value);
  };

  const handleKeyDown = (event: EventPayload): void => {
    if (disabled) return;
    Match.value(event).pipe(
      Match.when(isActivation, flip),
      Match.when(isDown, () => moveFrom(value, 1)),
      Match.when(isUp, () => moveFrom(value, -1)),
      Match.when(isFirst, () => jumpTo("first")),
      Match.when(isLast, () => jumpTo("last")),
      Match.orElse(() => undefined),
    );
  };

  return (
    <div
      role="button"
      aria-expanded={open}
      {...rest}
      ref={attach}
      tabIndex={disabled ? -1 : 0}
      onClick={
        disabled
          ? undefined
          : (event) => {
              onClick?.(event);
              flip();
            }
      }
      onKeyDown={(event: EventPayload) => {
        handleKeyDown(event);
        onKeyDown?.(event);
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
        style,
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
      <text
        aria-label={open ? "Collapse" : "Expand"}
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        {open ? "⌃" : "⌄"}
      </text>
    </div>
  );
};

/** The body of an open section. Unmounts while closed. */
export const AccordionContent = ({ style, children, ...rest }: Props) => {
  const theme = useTheme();
  const { isOpen } = useAccordionContext();
  const { value } = useAccordionItemContext();

  if (!isOpen(value)) return null;

  return (
    <div
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
    </div>
  );
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const accordionMeta = {
  name: "Accordions",
  tier: 2,
  status: "done",
  gpuixSupport: "yes",
  limitations: [
    "the indicator is a glyph swap: 0.10.0's StyleDesc has no transform",
    "sections mount and unmount instantly; no height animation",
  ],
  docs: "docs/accordion.mdx",
  example: "examples/accordion.example.tsx",
  testFile: "src/behaviour/accordion.test.tsx",
} as const;
