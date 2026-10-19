/**
 * Controlled-and-uncontrolled state in one hook, so a component can offer
 * `value`/`defaultValue`/`onValueChange` without the consumer opting in.
 *
 * `@gpuix/react@0.10.0` has this internally for its own controls but does not
 * export it from `@gpuix/react/floating` (plan 110 §2 lists this file for the
 * same reason). A controlled value is authoritative: setting it without
 * re-rendering with a new `value` leaves the visual state where it was, while
 * `onValueChange` still fires — the classic controlled-component contract, and
 * one the List suite asserts. Supplying both `value` and `defaultValue` is
 * tolerated: the controlled value wins and `defaultValue` seeds only the
 * uncontrolled state. No diagnostic is emitted — this hook owns no logger
 * (plan 685).
 */

import { useCallback, useState } from "react";

/** The result: the current value, and a setter that respects the mode. */
export type ControllableState<Value> = readonly [Value, (next: Value) => void];

/** {@link useControllableState} options. */
export interface ControllableStateOptions<Value> {
  /** The controlled value. `undefined` means uncontrolled. */
  readonly value: Value | undefined;
  /** The uncontrolled starting value. */
  readonly defaultValue: Value;
  /** Called with every accepted change, in both modes. */
  readonly onChange?: (next: Value) => void;
}

/**
 * The current value and its setter. In controlled mode the setter only reports;
 * in uncontrolled mode it also stores. Either way it reports only a real
 * change: a request for the value already held updates nothing and calls no
 * callback (plan 517).
 */
export const useControllableState = <Value>({
  value,
  defaultValue,
  onChange,
}: ControllableStateOptions<Value>): ControllableState<Value> => {
  const [internal, setInternal] = useState(defaultValue);
  const controlled = value !== undefined;
  const current = controlled ? value : internal;

  const setValue = useCallback(
    (next: Value) => {
      if (!controlled) setInternal(next);
      if (!Object.is(current, next)) onChange?.(next);
    },
    [controlled, current, onChange],
  );

  return [current, setValue];
};
