import {
  controlFocusRing,
  focusRing,
  keyboardFocusRing,
  type ControlFocusState,
  type FocusRing,
  type KeyboardFocusRing,
} from "./styles.js";
import { lightTheme, type Theme } from "./theme.js";

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
