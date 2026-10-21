/**
 * Small pieces every component needs.
 *
 * `mergeStyle` is how a caller's `style` prop wins over a resolved one without
 * each component re-implementing a spread. `useStep` is the one animation the
 * runtime allows: a discrete step advanced on a timer, because `motion` cannot
 * rotate or interpolate a colour (plan 020 §1.2).
 */

import { useEffect, useState } from "react";
import * as Option from "effect/Option";
import type { StyleDesc } from "@gpuix/react";
import {
  initValueState,
  setValue,
  withValue,
  type ValueState,
} from "../core/state.js";
import type { Density, PrimitiveTheme } from "../core/theme.js";

/** The caller's style wins, property by property. */
export const mergeStyle = (
  base: StyleDesc,
  override: StyleDesc | undefined,
): StyleDesc => (override === undefined ? base : { ...base, ...override });

/** A disabled control keeps its resting fill and drops hover/active feedback. */
export const suppressFeedback = (style: StyleDesc): StyleDesc => ({
  ...style,
  hover: { backgroundColor: style.backgroundColor },
  active: { backgroundColor: style.backgroundColor },
});

/**
 * A disabled selection control (checkbox, radio, switch) keeps its resting
 * fill **and border**, and drops the press response entirely — unlike a field,
 * whose disabled hover still lifts the fill. Matches `selectionBoxStyle`'s and
 * `switchTrackStyle`'s disabled branch.
 */
export const suppressSelectionFeedback = (style: StyleDesc): StyleDesc => ({
  ...style,
  hover: {
    backgroundColor: style.backgroundColor,
    borderColor: style.borderColor,
  },
  active: {},
});

/**
 * The theme a provider hands down.
 *
 * Density moves numbers and never colour, so the override swaps the `density`
 * group and nothing else — and an absent override returns the theme *itself*,
 * so a re-render cannot silently clone a palette.
 */
export const withDensity = (
  theme: PrimitiveTheme,
  density: Density | undefined,
): PrimitiveTheme => (density === undefined ? theme : { ...theme, density });

/** Whether a control holds focus, and the handlers that track it. */
export interface FocusState {
  readonly focused: boolean;
  readonly onFocus: () => void;
  readonly onBlur: () => void;
}

/**
 * Track focus for a control.
 *
 * The ring is no longer painted from this state — it is `keyboardRing`, declared
 * at rest and painted by the runtime after keyboard input (`core/focus.ts`). What
 * remains is the public `focused` flag a `StateStyle` callback may branch on.
 * React-local render state with no other reader, so a hook — not a shared Atom —
 * is right.
 */
export const useFocus = (): FocusState => {
  const [focused, setFocused] = useState(false);
  return {
    focused,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
  };
};

/**
 * The change props a boolean control accepts.
 *
 * `onCheckedChange` is the contract's name for a boolean part
 * (`docs/component-api.md` §2, base-gpui's `on_checked_change`). `onChange` is
 * the deprecated alias kept for one release; when a caller passes both, the new
 * name is the one that runs, so migrating cannot double-fire a handler.
 */
export interface CheckedChangeProps {
  readonly onCheckedChange?: (next: boolean) => void;
  /** @deprecated use `onCheckedChange`; removed in the next release. */
  readonly onChange?: (next: boolean) => void;
}

/** The one change callback a boolean control calls. */
export const checkedChange = (
  props: CheckedChangeProps,
): ((next: boolean) => void) | undefined =>
  props.onCheckedChange ?? props.onChange;

/**
 * The change props a value control accepts.
 *
 * `onValueChange` is the contract's name (`docs/component-api.md` §2). `onChange`
 * is the deprecated alias kept for one release; when a caller passes both, the
 * new name runs, so migrating cannot double-fire a handler.
 */
export interface ValueChangeProps<Value> {
  readonly onValueChange?: (next: Value) => void;
  /** @deprecated use `onValueChange`; removed in the next release. */
  readonly onChange?: (next: Value) => void;
}

/** The one change callback a value control calls. */
export const valueChange = <Value>(
  props: ValueChangeProps<Value>,
): ((next: Value) => void) | undefined => props.onValueChange ?? props.onChange;

/** A control's controlled/uncontrolled value, and the setter that respects it. */
export interface ControlState<Value> {
  readonly value: ValueState<Value>;
  readonly set: (next: Value) => void;
}

/**
 * The shared controlled/uncontrolled behaviour for any control.
 *
 * `value` present means the parent owns the value; absent means the control
 * keeps its own copy. `onChange` is only called when the value actually changed,
 * so a parent is not woken by an interaction that changed nothing.
 */
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

/**
 * A counter that advances every `intervalMs` and wraps at `steps`.
 *
 * Used only by the loading indicators, which have no other way to move. It is
 * React-local animation state — nothing else reads it and it is discarded when
 * the indicator unmounts — so a `useState`/`useEffect` pair is the right tool;
 * an Atom would make a private frame counter shared, global state. The step
 * *maths* stays in `core/loading.ts` where it is provable.
 */
export const useStep = (steps: number, intervalMs: number): number => {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(
      () => setStep((current) => (current + 1) % steps),
      intervalMs,
    );
    return () => clearInterval(id);
  }, [steps, intervalMs]);
  return step;
};
