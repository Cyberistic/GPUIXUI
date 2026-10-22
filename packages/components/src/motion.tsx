/**
 * The motion preference: one provider, one hook.
 *
 * GPUix exposes no reduced-motion query (`docs/gpuix-capabilities.md` records
 * the detection as unverified), so the application owns the flag exactly as it
 * owns the theme mode. Every animated surface reads it — a dialog, a drawer, a
 * popover, a menu, a toast, an accordion panel, the tab pill and a preview card.
 *
 * ```tsx
 * <MotionProvider preference={reduceMotion ? "reduced" : "animated"}>
 *   <App />
 * </MotionProvider>
 * ```
 *
 * A reduced run is a zero-duration assignment: the resting frame still paints,
 * only the journey is removed. The levels, easings and that policy live in
 * `@gpuixui/motion` (`motionTiming`); the frames and the mount window live in
 * `internal/presence.tsx`. `docs/component-api.md` §11 has the per-surface table.
 */

export {
  MotionProvider,
  useMotionPreference,
  type MotionProviderProps,
} from "./internal/presence.js";
export type { MotionPreference } from "@gpuixui/motion/timing";
