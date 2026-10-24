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

import { motionLevelOf, type MotionLevel } from "@gpuixui/motion/timing";

export {
  MotionProvider,
  useMotionPreference,
  type MotionProviderProps,
} from "./internal/presence.js";
export type { MotionPreference } from "@gpuixui/motion/timing";

/**
 * The level a surface's `level` prop names: a level of the motion table, or
 * `"none"` for a surface that paints its resting frame in the frame it appears.
 *
 * Four surfaces widen the table this way — `PageTransition`, `CodeBlock`,
 * `CopyButton` and `ThemeToggler` — because a caller sometimes wants an element
 * to simply be there: a page swapped by a route the reader did not ask to
 * animate, a block in a screenshot, a glyph in a toolbar. `"none"` is the prop's
 * word, not the table's, so it is read by {@link surfaceLevelOf} rather than by
 * `@gpuixui/motion`'s `motionLevelOf`.
 */
export type SurfaceLevel = MotionLevel | "none";

/**
 * The surface level a value names, read from a level a store wrote.
 *
 * A level is a persisted choice as often as a literal — a saved page, a
 * dashboard widget's speed, a settings row — so an application decodes one from
 * storage before it paints. `@gpuixui/motion` publishes `motionLevelOf` for that
 * read, but the table it reads cannot answer `"none"`: to it the word is a name
 * it does not carry, so it reads as the house `normal` arrival and a surface a
 * caller asked to paint still animates. This reader keeps `"none"` as itself and
 * routes every other value through `motionLevelOf`, so a stored choice and the
 * prop's vocabulary cannot disagree — a name the table does not carry is still
 * the house arrival rather than a `NaN` duration.
 *
 * ```tsx
 * <PageTransition viewKey={view.id} level={surfaceLevelOf(saved.level)}>
 * ```
 */
export const surfaceLevelOf = (value: unknown): SurfaceLevel =>
  value === "none" ? "none" : motionLevelOf(value);
