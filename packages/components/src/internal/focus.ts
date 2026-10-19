/**
 * The focus state a part paints.
 *
 * `autoFocus` seeds it because the runtime applies native focus after React's
 * effects, so `onFocus` never runs (plan 388). A part that becomes disabled
 * drops it: no React `blur` arrives for the native focus it keeps, and a
 * disabled control must not paint a focus ring (plans 394, 660, 680).
 * Re-enabling never fabricates a focus that cannot be observed; the ring
 * returns on the next real focus signal.
 */

import {
  useLayoutEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

/** The painted focus flag and the setter a part's focus handlers drive. */
export type FocusState = readonly [boolean, Dispatch<SetStateAction<boolean>>];

/** Focus state seeded by `autoFocus`, painted only while the part is enabled. */
export const useFocusState = (
  autoFocus: boolean,
  disabled: boolean,
): FocusState => {
  const [focused, setFocused] = useState(autoFocus && !disabled);
  useLayoutEffect(() => {
    if (disabled) setFocused(false);
  }, [disabled]);
  return [focused && !disabled, setFocused] as const;
};
