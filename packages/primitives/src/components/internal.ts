/**
 * Small pieces every component needs.
 *
 * `mergeStyle` is how a caller's `style` prop wins over a resolved one without
 * each component re-implementing a spread. `useStep` is the one animation the
 * runtime allows: a discrete step advanced on a timer, because `motion` cannot
 * rotate or interpolate a colour (plan 020 §1.2).
 */

import { Children, useEffect, useState, type ReactNode } from "react";
import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import * as Str from "effect/String";
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

/**
 * The accessible name a text-only child list gives a control.
 *
 * GPUix does not derive a button's name from painted text (measured: plan `058`
 * §0), so a `Button`/`Toggle` must carry the name itself. This is the only
 * honest source: every child is a string or number. An icon, an element or a
 * mixed list returns `None` — the caller owns the name then, and the library
 * does not invent one.
 */
export const textOf = (children: ReactNode): Option.Option<string> => {
  const parts = Children.toArray(children);
  const textOnly = Arr.every(
    parts,
    (part) => P.isString(part) || P.isNumber(part),
  );
  if (!textOnly || Arr.isReadonlyArrayEmpty(parts)) return Option.none();
  return pipe(
    Arr.join(
      Arr.map(parts, (part) => `${part}`),
      "",
    ),
    Str.trim,
    (name) => (Str.isEmpty(name) ? Option.none() : Option.some(name)),
  );
};

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
 * The runtime has no `focusVisible` state (plan 020 §1.2), so a focus ring has
 * to be drawn by the component; this is where it learns it should be. React-local
 * render state with no other reader, so a hook — not a shared Atom — is right.
 */
export const useFocus = (): FocusState => {
  const [focused, setFocused] = useState(false);
  return {
    focused,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
  };
};

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
