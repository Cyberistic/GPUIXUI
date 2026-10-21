import { focusRing, keyboardFocusRing, type FocusRing } from "./styles.js";
import { lightTheme, type Theme } from "./theme.js";

/**
 * A control's inline style at rest and on the one path the keyboard ring cannot
 * cover. The keyboard outline is applied once at rest; the runtime paints it
 * after Tab. A mouse-opened overlay focuses its content programmatically before
 * any keyboard input, so it paints the shadow while focused instead.
 * Exercised by `focus.test.ts`.
 */
export const focusExample = (
  theme: Theme = lightTheme,
): {
  readonly rest: {
    readonly backgroundColor: string;
    readonly focusVisible: {
      readonly outlineWidth: number;
      readonly outlineColor: string;
      readonly outlineOffset: number;
    };
  };
  readonly programmatic: FocusRing;
} => ({
  rest: {
    backgroundColor: theme.colors.input,
    ...keyboardFocusRing(theme),
  },
  programmatic: focusRing(theme),
});
