/** @jsxImportSource @gpuix/react */
/**
 * The motion preference: one provider, one hook.
 *
 * GPUix exposes no reduced-motion query (`docs/gpuix-capabilities.md` records
 * the detection as `not supported`), so the application owns the flag exactly as
 * it owns the theme mode. Every animated surface reads it — a dialog, a drawer, a
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
 * `@gpuixui/motion` (`motionTiming`); the frames live in
 * `@gpuixui/motion/presence` and the mounted window in
 * `@gpuixui/motion/react/presence` — the React half of the table, published
 * without the physics a fade never samples — and this package's seam
 * (`internal/presence.tsx`) re-publishes both, so every surface here composes
 * the one table rather than a copy of it. The **provider itself** is the motion
 * package's (`@gpuixui/motion/react/presence`) and this module re-publishes it,
 * so a primitive or another package below the same provider reads the one
 * preference rather than taking its own flag. `docs/component-api.md` §11 has
 * the per-surface table.
 */

export {
  MotionProvider,
  useMotionPreference,
  type MotionProviderProps,
} from "./internal/presence.js";
export type { MotionPreference } from "@gpuixui/motion/timing";
