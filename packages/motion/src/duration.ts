/**
 * The clock the runtime schedules a motion description on.
 *
 * The renderer converts a transition's seconds into a `Duration` and rejects a
 * description whose value it cannot represent — non-finite, negative, or past
 * the range a clock can show (`@gpuix/native@0.11.0`, `packages/native/src/
 * motion.rs`'s `validate_seconds`) — and a rejected description paints **no**
 * frame at all. Every entry point in this package that builds a timing or a hold
 * window reads its seconds through this module, so the bound has one home.
 *
 * Private to the package: `index.ts` does not re-export this module.
 */

/** The largest wait, in seconds, the renderer can schedule. */
const SCHEDULABLE_SECONDS = Number.MAX_SAFE_INTEGER;

/**
 * A seconds field the renderer can schedule, read from a value a caller may have
 * stored: a positive, finite number inside the clock's range.
 *
 * A field outside it is **no time**, the reading `transitionWindowMs` takes of a
 * duration and `motionTimingOf` takes of a millisecond value, so a surface
 * handed one paints its resting frame instead of a description the runtime
 * refuses.
 */
export const schedulableSeconds = (
  value: number | null | undefined,
): number | undefined =>
  value !== null &&
  value !== undefined &&
  Number.isFinite(value) &&
  value > 0 &&
  value <= SCHEDULABLE_SECONDS
    ? value
    : undefined;
