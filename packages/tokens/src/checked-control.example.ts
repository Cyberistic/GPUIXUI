import { getTheme, type Theme } from "./index.js";

/**
 * The roles a selected option paints: the chosen row's fill, the fill it steps
 * to while pressed, the label beside the check, and the `primary` check glyph
 * itself. A selected option at rest sits on `selected`; the check is measured
 * there and on `selectedActive` at the mark floor (`comboboxCheckPairs`).
 *
 * @example
 * ```ts
 * import { getTheme } from "@gpuixui/tokens";
 * import { selectedOption } from "./checked-control.example.js";
 *
 * const option = selectedOption(getTheme("light"));
 * option.background; // selected
 * option.check; // primary
 * ```
 */
export const selectedOption = (theme: Theme) => ({
  background: theme.colors.selected,
  pressedBackground: theme.colors.selectedActive,
  foreground: theme.colors.popoverForeground,
  check: theme.colors.primary,
});

/** The light theme's selected option, resolved for the suite. */
export const selectedOptionLight = selectedOption(getTheme("light"));
