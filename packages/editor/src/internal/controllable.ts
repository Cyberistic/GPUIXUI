/**
 * Controlled-and-uncontrolled state in one hook, so a component can offer
 * `value`/`defaultValue`/`onValueChange` without the consumer opting in.
 *
 * A controlled value is authoritative: setting it without re-rendering with a
 * new `value` leaves the visual state where it was, while `onValueChange` still
 * fires — the classic controlled-component contract.
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
 * in uncontrolled mode it also stores.
 */
export const useControllableState = <Value>({
  value,
  defaultValue,
  onChange,
}: ControllableStateOptions<Value>): ControllableState<Value> => {
  const [internal, setInternal] = useState(defaultValue);
  const controlled = value !== undefined;

  const setValue = useCallback(
    (next: Value) => {
      if (!controlled) setInternal(next);
      if (value !== next) onChange?.(next);
    },
    [controlled, value, onChange],
  );

  return [controlled ? value : internal, setValue];
};
