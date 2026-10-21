import {
  resolveThemeChoice,
  themeChoiceFromRow,
  themeChoiceParams,
  type Theme,
  type ThemeChoice,
} from "./index.js";

/**
 * A settings row as it comes back from storage. `themeChoiceFromRow` narrows
 * the five axes of an un-narrowed row, so the row's shape never reaches
 * `resolveThemeChoice`; the precedence stays the package's, so a settings screen
 * and a docs toggle cannot disagree. Asserted in `theme-choice.test.ts`.
 */
export const storedChoice: ThemeChoice = {
  mode: "dark",
  contrast: "high",
  platform: "win32",
  density: "compact",
};

/** The theme the stored row resolves to: Windows, AAA dark, compact. */
export const resolvedChoice: Theme = resolveThemeChoice(storedChoice);

/**
 * A row as storage really returns it: un-narrowed, and carrying a density no
 * release ships and a key the row has never heard of.
 */
export const storedRow: unknown = {
  mode: "dark",
  platform: "win32",
  density: "wide",
  from: "an-older-release",
};

/** The theme the raw row resolves to: Windows dark, the unknown density ignored. */
export const resolvedStoredRow: Theme = resolveThemeChoice(
  themeChoiceFromRow(storedRow),
);

/** A missing storage key, which must open the identity instead of throwing. */
export const emptyStoredRow: Theme = resolveThemeChoice(
  themeChoiceFromRow(null),
);

/**
 * The canonical link for a row that names only a platform: the platform and the
 * density it resolves to, so the link keeps macOS' `compact` when a reader
 * edits the platform axis. Asserted in `theme-choice-params.test.ts`.
 */
export const canonicalLink = themeChoiceParams({ platform: "darwin" });
