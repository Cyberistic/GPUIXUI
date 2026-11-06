import { useCallback, useState } from "react";

export type ControllableState<Value> = readonly [Value, (next: Value) => void];

export interface ControllableStateOptions<Value> {
  readonly value: Value | undefined;

  readonly defaultValue: Value;

  readonly onChange?: (next: Value) => void;
}

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
