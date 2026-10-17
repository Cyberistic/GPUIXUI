import type { Theme } from "./theme.js";

/** The three paints of a toggle that is on. */
export interface ToggleOnPaints {
  /** The resting paint, while the mode is on. */
  readonly rest: ToggleOnPaint;
  /** The paint under the pointer. */
  readonly hover: ToggleOnPaint;
  /** The paint while pressed. */
  readonly press: ToggleOnPaint;
}

/** One toggle paint: a designed fill and the foreground it carries. */
export interface ToggleOnPaint {
  /** The accent family's fill for this state. */
  readonly backgroundColor: string;
  /** `accentForeground`, readable on every step. */
  readonly color: string;
}

/**
 * The three paints of a toggle that is on, read from the theme.
 *
 * A component never composites `alpha(accent, 0.9)` for hover: that state would
 * take its colour from the surface behind the control, and no contrast pair can
 * measure it. The accent family carries designed steps like the filled actions
 * (plan 327).
 *
 * @example
 * ```tsx
 * const paints = toggleOnPaints(theme);
 * <div style={paints[state]} />
 * ```
 */
export const toggleOnPaints = (theme: Theme): ToggleOnPaints => ({
  rest: {
    backgroundColor: theme.colors.accent,
    color: theme.colors.accentForeground,
  },
  hover: {
    backgroundColor: theme.colors.accentHover,
    color: theme.colors.accentForeground,
  },
  press: {
    backgroundColor: theme.colors.accentActive,
    color: theme.colors.accentForeground,
  },
});
