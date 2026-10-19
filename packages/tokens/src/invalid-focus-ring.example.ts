import { invalidFocusRing } from "./styles.js";
import { lightTheme, type Theme } from "./theme.js";

/**
 * An invalid field at rest and focused. The error edge and the focus ring are
 * the two signals a failed field shows; the ring is the only focus indicator the
 * runtime can draw, so the helper recolours it rather than lying about the
 * geometry. Exercised by `invalid-focus-ring.test.ts`.
 */
export const invalidFocusExample = (
  theme: Theme = lightTheme,
): {
  readonly rest: {
    readonly backgroundColor: string;
    readonly color: string;
    readonly borderColor: string;
    readonly borderWidth: number;
  };
  readonly focused: ReturnType<typeof invalidFocusRing>;
} => ({
  rest: {
    backgroundColor: theme.colors.input,
    color: theme.colors.inputForeground,
    borderColor: theme.colors.destructive,
    borderWidth: theme.borderWidth.thin,
  },
  focused: invalidFocusRing(theme),
});
