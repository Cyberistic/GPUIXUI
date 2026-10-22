/**
 * The selection-wash check over the theme the library ships and over two brands
 * that break one of its two floors on purpose. Executed by `selection.test.ts`,
 * so the call site the catalogue documents is a real one.
 */

import { alpha, selectionFailures, selectionOn, type Theme } from "./index.js";
import { extendTheme, lightTheme } from "./theme.js";

/** Whether every selectable pair keeps its wash visible and its text readable. */
export const selectionWashesAreReadable = (theme: Theme): boolean =>
  selectionFailures(theme).length === 0;

/** A brand whose wash is its own text colour: a selection erases what it selects. */
export const unreadableSelectionBrand = extendTheme(lightTheme, {
  colors: { selection: lightTheme.colors.foreground },
});

/** A brand whose wash is fully transparent: a selection the reader cannot find. */
export const invisibleSelectionBrand = extendTheme(lightTheme, {
  colors: { selection: alpha(lightTheme.colors.card, 0) },
});

/** A failure written the way a theme editor shows it. */
export const report = (theme: Theme): ReadonlyArray<string> =>
  selectionFailures(theme).map(
    ({ kind, foreground, background, ratio }) =>
      `${kind}: ${foreground} on ${background} is ${
        ratio === undefined ? "unmeasurable" : ratio.toFixed(2)
      }`,
  );

/**
 * The wash each status tone's own copy can be selected with, on that tone's
 * tint. The designed `selection` cannot serve a dark tint, so a message hands
 * the surface it paints on to `selectionOn`.
 */
export const tintSelectionWashes = (theme: Theme) =>
  ({
    info: selectionOn(theme, "infoSoft"),
    success: selectionOn(theme, "successSoft"),
    warning: selectionOn(theme, "warningSoft"),
    destructive: selectionOn(theme, "destructiveSoft"),
  }) as const;
