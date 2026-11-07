import {
  applyStyle,
  auditTheme,
  extendTheme,
  lightTheme,
  syntaxColors,
  syntaxFailures,
  type PlatformStyle,
  type SyntaxColors,
  type Theme,
  type ThemeMode,
} from "./index.js";
import { platformStyles } from "./platforms.js";
import { themes } from "./theme.js";

export const houseSyntax = {
  ...syntaxColors(themes.light),
  keyword: "#7A1F5C",
  string: "#0B5E4A",
} satisfies SyntaxColors;

export const houseSyntaxTheme: Theme = extendTheme(lightTheme, {
  name: "Acme code",
  syntax: houseSyntax,
});

export function syntaxReport(theme: Theme): ReadonlyArray<string> {
  return syntaxFailures(theme).map(
    ({ role, surface, ratio }) =>
      `${role} on ${surface} is ${ratio === undefined ? "unmeasurable" : ratio.toFixed(2)}`,
  );
}

export const houseSyntaxLook: PlatformStyle = {
  ...platformStyles.darwin,
  label: "macOS · house code",
  syntax: { light: { ...syntaxColors(themes.light), keyword: "#4A2A7A" } },
};

export const houseSyntaxLookTheme = (mode: ThemeMode): Theme =>
  applyStyle(themes[mode], houseSyntaxLook);

export const housePalette: SyntaxColors = syntaxColors(houseSyntaxTheme);

export const houseAudit = auditTheme(houseSyntaxTheme);
