import { shippedThemes, themeFailures, type ShippedTheme } from "./index.js";

/**
 * A caption for a gallery or a failing assertion. `theme.name` already carries
 * the variant label; the source says which axis produced it, because macOS and
 * XP both reach the light palette and a name alone does not say how.
 */
export const shippedThemeLabel = (set: ShippedTheme): string =>
  set.source === "identity"
    ? `${set.theme.name} (identity)`
    : set.source === "platform"
      ? `${set.theme.name} (platform: ${set.platform})`
      : `${set.theme.name} (recipe: ${set.recipe})`;

/** Every defect in every shipped set. The library's guarantee is `[]`. */
export const shippedThemeFailures = shippedThemes.flatMap(({ theme }) =>
  themeFailures(theme).map((failure) => ({ theme: theme.name, ...failure })),
);

/** One line per shipped set, in documentation order. */
export const shippedThemeLabels = shippedThemes.map(shippedThemeLabel);
