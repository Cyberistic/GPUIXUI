/**
 * The focus state a part paints.
 *
 * `autoFocus` seeds it because the runtime applies native focus after React's
 * effects, so `onFocus` never runs (plan 388). A part that names its own host id
 * samples the renderer's focused host instead, because 0.10.0 delivers no React
 * `focus`/`blur` for a native move (plans 536/540, 748, 752): the ring then
 * follows `Tab`, a pointer press and a programmatic focus alike, and clears when
 * focus leaves. A part that becomes disabled drops it: no React `blur` arrives
 * for the native focus it keeps, and a disabled control must not paint a focus
 * ring (plans 394, 660, 680). Re-enabling never fabricates a focus that cannot
 * be observed; the ring returns on the next real focus signal.
 */

import {
  useLayoutEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useNativeFocusId } from "./native-focus.js";

/** The painted focus flag and the setter a part's focus handlers drive. */
export type FocusState = readonly [boolean, Dispatch<SetStateAction<boolean>>];

/**
 * Focus state for one part. Pass the part's host id to follow native focus;
 * without one the React `focus`/`blur` handlers remain the only signal.
 *
 * The `autoFocus` seed and the React flag stand until the sample names a host,
 * then the sample is the truth — that is what clears a stale ring after focus
 * moves on.
 */
export const useFocusState = (
  autoFocus: boolean,
  disabled: boolean,
  hostId?: number | null,
): FocusState => {
  const [focused, setFocused] = useState(autoFocus && !disabled);
  const sampled = !disabled && hostId !== undefined && hostId !== null;
  const focusedId = useNativeFocusId(sampled);

  useLayoutEffect(() => {
    if (disabled) setFocused(false);
  }, [disabled]);

  const shown = !sampled
    ? focused
    : focusedId === null
      ? focused || autoFocus
      : focusedId === hostId;
  return [shown && !disabled, setFocused] as const;
};
