import {
  filledControl,
  type FilledControlFamily,
  type Theme,
} from "./index.js";

/** One designed state: the fill to paint and the label it carries. */
export interface FilledControlPaint {
  /** The state's designed fill. */
  readonly backgroundColor: string;
  /** The family foreground, readable on every state. */
  readonly color: string;
}

/** The three paints of a filled control. */
export interface FilledControlPaints {
  /** The resting paint. */
  readonly rest: FilledControlPaint;
  /** The paint under the pointer. */
  readonly hover: FilledControlPaint;
  /** The paint while pressed. */
  readonly press: FilledControlPaint;
}

/**
 * The paints a filled control spreads into its style and its `hover`/`active`
 * states. This is the replacement for `alpha(fill, 0.9)` / `alpha(fill, 0.8)`:
 * the state is an opaque, editable role, and the label keeps its floor on it.
 *
 * @example
 * ```tsx
 * const paints = filledControlPaints(theme, "primary");
 * <div
 *   style={{ ...paints.rest, hover: paints.hover, active: paints.press }}
 * />
 * ```
 */
export const filledControlPaints = (
  theme: Theme,
  family: FilledControlFamily,
): FilledControlPaints => {
  const { background, foreground, hover, active } = filledControl(
    theme,
    family,
  );
  return {
    rest: { backgroundColor: background, color: foreground },
    hover: { backgroundColor: hover, color: foreground },
    press: { backgroundColor: active, color: foreground },
  };
};
