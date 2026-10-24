/**
 * The application's motion preference, supplied once for the whole library.
 *
 * GPUix exposes no reduced-motion query (`docs/gpuix-capabilities.md` records
 * the detection as `not supported`), so the application owns the flag exactly as
 * it owns the theme mode. The context lives in this package — the one that owns
 * the timing, the levels and the preference policy — rather than in a component
 * package, so every package that moves reads **one** preference: a primitive, a
 * component and an application surface below one provider agree, and a package
 * that wants the flag does not have to depend on the components library.
 *
 * `@gpuixui/components` re-publishes this provider and hook, so a tree written
 * against that package keeps compiling and reads the same context.
 */

import {
  createContext,
  createElement,
  useContext,
  type ReactNode,
} from "react";
import { preferenceOf, type MotionPreference } from "./timing.js";

const MotionPreferenceContext = createContext<MotionPreference>("animated");

/** Props for {@link MotionProvider}. */
export interface MotionProviderProps {
  /**
   * The reader's preference. Default `"animated"`.
   *
   * A value read back from storage is decoded by `preferenceOf`: an absent one
   * keeps the default and one the union does not name is the reduced policy.
   */
  readonly preference?: MotionPreference;
  readonly children?: ReactNode;
}

/**
 * Supply the reader's motion preference to every surface below it.
 *
 * The preference is a policy, not a parameter: a reduced run is a zero-duration
 * assignment, so the resting frame still paints and only the journey is removed.
 * With no provider the library reads `"animated"`, so a tree that never states a
 * preference keeps its motion.
 *
 * The published value is the name the library carries, never the caller's raw
 * one, because a surface compares it (`"reduced"`) rather than reading it: an
 * application that persisted its setting and read back `NULL` or a name a
 * release renamed would otherwise hand every consumer a value outside the union
 * and animate a reader who asked for less motion.
 *
 * The element is built with `createElement` rather than JSX: this package is
 * renderer-neutral and declares no JSX factory, so the same provider renders
 * under whichever React reconciler the consumer uses — a GPUix tree names
 * `@gpuix/react` as its factory and a plain React test names `react`.
 */
export const MotionProvider = ({ preference, children }: MotionProviderProps) =>
  createElement(
    MotionPreferenceContext.Provider,
    { value: preferenceOf(preference) },
    children,
  );

/** Read the nearest motion preference; `"animated"` without a provider. */
export const useMotionPreference = (): MotionPreference =>
  useContext(MotionPreferenceContext);
