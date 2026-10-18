import { resolveThemeChoice, type Theme, type ThemeChoice } from "./index.js";

/**
 * A settings row as it comes back from storage. The shape is decoded by the
 * application; the package narrows the five axes. `resolveThemeChoice` is the
 * one call that turns the row into a theme, so a settings screen and a docs
 * toggle cannot disagree about precedence. Asserted in `theme-choice.test.ts`.
 */
export const storedChoice: ThemeChoice = {
  mode: "dark",
  contrast: "high",
  platform: "win32",
  density: "compact",
};

/** The theme the stored row resolves to: Windows, AAA dark, compact. */
export const resolvedChoice: Theme = resolveThemeChoice(storedChoice);
