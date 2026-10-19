/**
 * The two roles a countdown indicator paints.
 *
 * The shipped Toast countdown paints its 2px groove with `muted`, a surface
 * role, on a `popover` card (`components/src/toast/viewport.tsx`). `muted` is
 * `popover` in the identity dark theme and every platform and recipe dark set,
 * so the groove measures **1.000:1** and the unfilled remainder of the
 * countdown has no shape. The designed groove is `track` (plans `347` and
 * `503`); it clears the floor on the toast card at **1.069:1** in the tightest
 * shipped set.
 *
 * The bar is the tone's readable ink (`xText`), not `xSoftForeground`: the soft
 * foreground is designed for the tone's own tint, not for a `popover` card
 * (plan `348`).
 */
import { statusTone, type StatusTone } from "./styles.js";
import type { Theme } from "./theme.js";

/** The groove and the elapsed-time bar of a status-toned countdown. */
export interface CountdownStyle {
  /** The unfilled groove, `track`. */
  readonly groove: string;
  /** The bar, in the tone's readable ink (`xText`). */
  readonly bar: string;
}

/**
 * The designed countdown indicator for a status-toned toast.
 *
 * @example
 * ```tsx
 * const countdown = countdownStyle(theme, toast.tone);
 * <div style={{ backgroundColor: countdown.groove }}>
 *   <div style={{ backgroundColor: countdown.bar, width: elapsed }} />
 * </div>;
 * ```
 */
export const countdownStyle = (
  theme: Theme,
  tone: StatusTone,
): CountdownStyle => ({
  groove: theme.colors.track,
  bar: statusTone(theme, tone).text,
});
