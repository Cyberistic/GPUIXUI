/**
 * Controlled and uncontrolled state.
 *
 * A control that both owns a value and accepts one from its parent is the
 * classic source of "my input keeps reverting": the parent's value and the
 * internal copy disagree, and which one wins depends on render order. This
 * module is the one place that decides, so every control behaves the same way.
 *
 * It is a small state machine rather than a React hook on purpose: the decision
 * is what needs to be provable, and a pure reducer needs no rendering runtime
 * to test (see `.agents/slop/plans/020-gpuix-runtime-capability.md` §3).
 */

import * as Option from "effect/Option";

/** Which mode a control is in, derived from whether a value was supplied. */
export type ControlMode = "controlled" | "uncontrolled";

export interface ValueState<Value> {
  readonly mode: ControlMode;
  /** The value to render now. */
  readonly current: Value;
  /** The last value this control produced itself. Ignored while controlled. */
  readonly internal: Value;
}

/**
 * Build the state for a control.
 *
 * A supplied `value` (even `Some(undefined)` is impossible — `Option` cannot
 * hold a hole) makes the control controlled and its internal copy irrelevant.
 */
export const initValueState = <Value>(
  value: Option.Option<Value>,
  defaultValue: Value,
): ValueState<Value> => ({
  mode: Option.isSome(value) ? "controlled" : "uncontrolled",
  current: Option.getOrElse(value, () => defaultValue),
  internal: defaultValue,
});

/**
 * Apply a value the control produced.
 *
 * `notify` is false when the value did not actually change, so a parent is not
 * woken by an interaction that changed nothing.
 */
export const setValue = <Value>(
  state: ValueState<Value>,
  next: Value,
): { readonly state: ValueState<Value>; readonly notify: boolean } => {
  const notify = !Object.is(state.current, next);
  if (state.mode === "controlled") {
    // The parent owns the value: show what it produced, keep no private copy.
    return {
      state: { mode: state.mode, current: next, internal: state.internal },
      notify,
    };
  }
  return {
    state: { mode: state.mode, current: next, internal: next },
    notify,
  };
};

/**
 * Re-derive the rendered value after a parent re-render.
 *
 * A controlled control follows its `value`; an uncontrolled one keeps whatever
 * it last produced, so a re-render never resets user input.
 *
 * **The mode is decided per render, not once at mount.** A control that is
 * given a value after it mounted is controlled from that moment: the value its
 * owner pushed reaches the user instead of being dropped, which is what a
 * field loaded from a server needs. A control that keeps no value prop keeps
 * its own copy, so a re-render never resets what the user typed.
 */
export const withValue = <Value>(
  state: ValueState<Value>,
  value: Option.Option<Value>,
): ValueState<Value> =>
  Option.match(value, {
    onSome: (incoming) => ({
      mode: "controlled",
      current: incoming,
      internal: state.internal,
    }),
    onNone: () => state,
  });
