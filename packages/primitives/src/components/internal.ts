import {
  Children,
  createContext,
  useEffect,
  useState,
  type ReactNode,
  type Ref,
} from "react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type {
  EventPayload,
  KeyEvent,
  Props,
  PublicInstance,
  StyleDesc,
} from "@gpuix/react";
import {
  initValueState,
  setValue,
  withValue,
  type ValueState,
} from "../core/state.js";
import type { Density, PrimitiveTheme } from "../core/theme.js";

export const childrenName = (children: ReactNode): string | undefined => {
  const text = Children.toArray(children)
    .filter(
      (child): child is string | number =>
        typeof child === "string" || typeof child === "number",
    )
    .join(" ")
    .trim();
  return text === "" ? undefined : text;
};

export const mergeStyle = (
  base: StyleDesc,
  override: StyleDesc | undefined,
): StyleDesc => (override === undefined ? base : { ...base, ...override });

export interface InteractionProps {
  readonly onClick?: (event: EventPayload) => void;
  readonly onKeyDown?: (event: KeyEvent) => void;
  readonly onKeyUp?: (event: KeyEvent) => void;
  readonly onFocus?: (event: EventPayload) => void;
  readonly onBlur?: (event: EventPayload) => void;
}

export interface ElementHostProps {
  readonly ref?: Ref<PublicInstance>;

  readonly "aria-id"?: string;

  readonly onLayout?: (event: EventPayload) => void;
}

export type FieldHostProps = ElementHostProps;

export interface HelpProps {
  readonly description?: string;
}

export const mergeRefs = <Instance>(
  ...refs: ReadonlyArray<Ref<Instance> | undefined>
): ((instance: Instance | null) => void) => {
  return (instance) => {
    Arr.forEach(refs, (ref) => {
      if (ref === undefined || ref === null) return;
      if (typeof ref === "function") ref(instance);
      else ref.current = instance;
    });
  };
};

export const AttachedGroup = createContext(false);

export type ActionHostProps = Omit<
  Props,
  | "key"
  | "children"
  | "style"
  | "role"
  | "tabIndex"
  | "aria-label"
  | "aria-description"
  | "motion"
  | "testId"
  | "onClick"
  | "onKeyDown"
  | "onKeyUp"
  | "onFocus"
  | "onBlur"
  | "onMouseEnter"
  | "onMouseLeave"
>;

export interface TooltipTriggerProps {
  readonly onMouseEnter?: (event: EventPayload) => void;
  readonly onMouseLeave?: (event: EventPayload) => void;
  readonly "aria-description"?: string;
}

export const composeEvent = <Event>(
  caller: ((event: Event) => void) | undefined,
  internal: ((event: Event) => void) | undefined,
): ((event: Event) => void) | undefined =>
  caller === undefined
    ? internal
    : internal === undefined
      ? caller
      : (event) => {
          caller(event);
          internal(event);
        };

export const composePress = (
  blocked: boolean,
  caller: ((event: EventPayload) => void) | undefined,
  action: (event: EventPayload) => void,
): ((event: EventPayload) => void) | undefined =>
  blocked
    ? undefined
    : (event) => {
        caller?.(event);
        action(event);
      };

export const suppressFeedback = (style: StyleDesc): StyleDesc => ({
  ...style,
  hover: { backgroundColor: style.backgroundColor },
  active: { backgroundColor: style.backgroundColor },
});

export const suppressSelectionFeedback = (style: StyleDesc): StyleDesc => ({
  ...style,
  hover: {
    backgroundColor: style.backgroundColor,
    borderColor: style.borderColor,
  },
  active: {},
});

export const decorative = (style: StyleDesc): StyleDesc =>
  mergeStyle(style, { pointerEvents: "none" });

export const withDensity = (
  theme: PrimitiveTheme,
  density: Density | null | undefined,
): PrimitiveTheme =>
  density === null || density === undefined ? theme : { ...theme, density };

export interface FocusState {
  readonly focused: boolean;
  readonly onFocus: () => void;
  readonly onBlur: () => void;
}

export const useFocus = (): FocusState => {
  const [focused, setFocused] = useState(false);
  return {
    focused,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
  };
};

export interface CheckedChangeProps {
  readonly onCheckedChange?: (next: boolean) => void;

  readonly onChange?: (next: boolean) => void;
}

export const checkedChange = (
  props: CheckedChangeProps,
): ((next: boolean) => void) | undefined =>
  props.onCheckedChange ?? props.onChange;

export interface ValueChangeProps<Value> {
  readonly onValueChange?: (next: Value) => void;

  readonly onChange?: (next: Value) => void;
}

export const valueChange = <Value>(
  props: ValueChangeProps<Value>,
): ((next: Value) => void) | undefined => props.onValueChange ?? props.onChange;

export interface ControlState<Value> {
  readonly value: ValueState<Value>;
  readonly set: (next: Value) => void;
}

export const useControlState = <Value>(
  value: Value | undefined,
  defaultValue: Value,
  onChange: ((next: Value) => void) | undefined,
): ControlState<Value> => {
  const [state, setState] = useState(() =>
    initValueState(Option.fromNullishOr(value), defaultValue),
  );
  const current = withValue(state, Option.fromNullishOr(value));
  return {
    value: current,
    set: (next) => {
      const applied = setValue(current, next);
      setState(applied.state);
      if (applied.notify) onChange?.(next);
    },
  };
};

export const useStep = (
  steps: number,
  intervalMs: number,
  running = true,
): number => {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(
      () => setStep((current) => (current + 1) % steps),
      intervalMs,
    );
    return () => clearInterval(id);
  }, [steps, intervalMs, running]);
  return step;
};
