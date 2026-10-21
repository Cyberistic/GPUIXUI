import { focusRing } from "./styles.js";
import { lightTheme, type Theme } from "./theme.js";

/**
 * A control's inline style before and after it takes focus. The ring is a
 * shadow, so gaining focus never changes the element's size or position; the
 * 0.11 runtime declares `outline*` and `focusVisible`, which plan 053 adopts.
 * Exercised by `focus.test.ts`.
 */
export const focusExample = (
  theme: Theme = lightTheme,
): {
  readonly rest: { readonly backgroundColor: string };
  readonly focused: ReturnType<typeof focusRing>;
} => ({
  rest: { backgroundColor: theme.colors.input },
  focused: focusRing(theme),
});
