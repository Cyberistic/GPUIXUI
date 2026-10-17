/**
 * One host ref callback for a part that also needs the instance itself.
 *
 * In React 19 a function component receives `ref` as an ordinary prop. A part
 * that spreads its props onto a host element and also passes its own `ref` —
 * `<Button {...rest} ref={trigger} />` — silently discards the caller's: the last
 * `ref` wins. Parts with internal focus bookkeeping compose instead.
 */

import type { Ref, RefCallback } from "react";
import { useCallback } from "react";

/** Hand `value` to a callback ref, an object ref, or nothing. */
const assign = <T>(ref: Ref<T> | undefined, value: T): void => {
  if (ref === null || ref === undefined) return;
  if (typeof ref === "function") {
    ref(value);
    return;
  }
  ref.current = value;
};

/** A stable ref callback that feeds both the part's own ref and the caller's. */
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
