import type { Ref, RefCallback } from "react";
import { useCallback } from "react";

const assign = <T>(ref: Ref<T> | undefined, value: T): void => {
  if (ref === null || ref === undefined) return;
  if (typeof ref === "function") {
    ref(value);
    return;
  }
  ref.current = value;
};

export const useMergedRef = <T>(
  internal: Ref<T>,
  caller: Ref<T> | undefined,
): RefCallback<T> =>
  useCallback(
    (value: T) => {
      assign(internal, value);
      assign(caller, value);
    },
    [internal, caller],
  );
