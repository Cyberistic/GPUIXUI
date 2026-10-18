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
 * Build the initial state for a control.
 *
 * A supplied `value` (even `Some(undefined)` is impossible — `Option` cannot
 * hold a hole) makes the control controlled on its first render and its internal
 * copy irrelevant. Later renders go through `withValue`.
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
 * Controlled-ness is a property of **this render**: a supplied `value` makes the
 * control controlled and it follows the parent, while an absent one leaves it
 * uncontrolled on its own draft. The decision is not frozen at mount, so a
 * parent that loads its value later (`value={data?.name}`) is not ignored.
 * `internal` is the uncontrolled draft and survives the switch; a controlled
 * control keeps no private copy of an interaction.
 */
export const withValue = <Value>(
  state: ValueState<Value>,
  value: Option.Option<Value>,
): ValueState<Value> =>
  Option.match(value, {
    onNone: () => ({
      mode: "uncontrolled",
      current: state.internal,
      internal: state.internal,
    }),
    onSome: (current) => ({
      mode: "controlled",
      current,
      internal: state.internal,
    }),
  });
