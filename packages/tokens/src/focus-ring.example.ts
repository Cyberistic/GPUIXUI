import {
  controlFocusRing,
  focusRing,
  keyboardFocusRing,
  type ControlFocusState,
  type FocusRing,
  type KeyboardFocusRing,
} from "./styles.js";
import { lightTheme, type Theme } from "./theme.js";

/**
 * A painted control: its fill, and the ring its own state allows. The ring is
 * absent for a disabled control, so the field is optional — the same shape a
 * `StyleDesc` has, since spreading `undefined` paints nothing.
 */
export interface PaintedControl extends Partial<KeyboardFocusRing> {
  readonly backgroundColor: string;
}

const paint = (
  theme: Theme,
  state: ControlFocusState,
  fill: string,
): PaintedControl => ({
  backgroundColor: fill,
  ...controlFocusRing(theme, state),
});

/**
 * A control's inline style at rest, while invalid, while disabled, and on the
 * one path the keyboard ring cannot cover. The keyboard outline is applied once
 * at rest; the runtime paints it after Tab. A mouse-opened overlay focuses its
 * content programmatically before any keyboard input, so it paints the shadow
 * while focused instead.
 *
 * The control's own state decides the rest of it: a failed validation recolours
 * the outline to `destructive`, and a disabled control declares no ring at all
 * — `controlFocusRing` returns `undefined` there, so the fill is all it paints.
 * Exercised by `focus.test.ts`.
 */
export const focusExample = (
  theme: Theme = lightTheme,
): {
  readonly rest: PaintedControl;
  readonly invalid: PaintedControl;
  readonly disabled: PaintedControl;
  readonly programmatic: FocusRing;
} => ({
  rest: { backgroundColor: theme.colors.input, ...keyboardFocusRing(theme) },
  invalid: paint(theme, { invalid: true }, theme.colors.input),
  disabled: paint(theme, { disabled: true }, theme.colors.disabled),
  programmatic: focusRing(theme),
});
