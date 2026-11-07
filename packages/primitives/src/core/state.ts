import * as Option from "effect/Option";

export type ControlMode = "controlled" | "uncontrolled";

export interface ValueState<Value> {
  readonly mode: ControlMode;

  readonly current: Value;

  readonly internal: Value;
}

export const initValueState = <Value>(
  value: Option.Option<Value>,
  defaultValue: Value,
): ValueState<Value> => ({
  mode: Option.isSome(value) ? "controlled" : "uncontrolled",
  current: Option.getOrElse(value, () => defaultValue),
  internal: defaultValue,
});

export const setValue = <Value>(
  state: ValueState<Value>,
  next: Value,
): { readonly state: ValueState<Value>; readonly notify: boolean } => {
  const notify = !Object.is(state.current, next);
  if (state.mode === "controlled") {
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
