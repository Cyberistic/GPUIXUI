import { alpha, selectionFailures, selectionOn, type Theme } from "./index.js";
import { extendTheme, lightTheme } from "./theme.js";

export const selectionWashesAreReadable = (theme: Theme): boolean =>
  selectionFailures(theme).length === 0;

export const unreadableSelectionBrand = extendTheme(lightTheme, {
  colors: { selection: lightTheme.colors.foreground },
});

export const invisibleSelectionBrand = extendTheme(lightTheme, {
  colors: { selection: alpha(lightTheme.colors.card, 0) },
});

export const report = (theme: Theme): ReadonlyArray<string> =>
  selectionFailures(theme).map(
    ({ kind, foreground, background, ratio }) =>
      `${kind}: ${foreground} on ${background} is ${
        ratio === undefined ? "unmeasurable" : ratio.toFixed(2)
      }`,
  );

export const tintSelectionWashes = (theme: Theme) =>
  ({
    info: selectionOn(theme, "infoSoft"),
    success: selectionOn(theme, "successSoft"),
    warning: selectionOn(theme, "warningSoft"),
    destructive: selectionOn(theme, "destructiveSoft"),
  }) as const;
