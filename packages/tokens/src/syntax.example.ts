/**
 * A brand's syntax palette, and the audit that holds it to the floors. Executed
 * by `syntax.test.ts`, so the call site the catalogue and the package README
 * teach is a real one: `nativeTextTheme` is the only consumer, and it hands the
 * resolved palette to the runtime's `<code>` host.
 */

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

/** The two tokens the house recolors; every other token keeps the shipped table. */
export const houseSyntax = {
  ...syntaxColors(themes.light),
  keyword: "#7A1F5C",
  string: "#0B5E4A",
} satisfies SyntaxColors;

/** A brand built from the light theme whose code block uses the house tokens. */
export const houseSyntaxTheme: Theme = extendTheme(lightTheme, {
  name: "Acme code",
  syntax: houseSyntax,
});

/** A syntax failure written the way a theme editor shows it. */
export function syntaxReport(theme: Theme): ReadonlyArray<string> {
  return syntaxFailures(theme).map(
    ({ role, surface, ratio }) =>
      `${role} on ${surface} is ${ratio === undefined ? "unmeasurable" : ratio.toFixed(2)}`,
  );
}

/**
 * The look a house ships when its code block sits on a tinted page: a style in
 * the `PlatformStyle` shape with the look's own palette, per mode.
 *
 * A look that repaints the fill a code host paints needs one — the tokens are
 * read against that page — and `applyStyle` hands it over under the same
 * `contrast` rule as the look's colour roles. This is Darwin's chrome with a
 * house palette, the way a consumer authors one.
 */
export const houseSyntaxLook: PlatformStyle = {
  ...platformStyles.darwin,
  label: "macOS · house code",
  syntax: { light: { ...syntaxColors(themes.light), keyword: "#4A2A7A" } },
};

/** The look applied to a base theme, which is what the code block paints on. */
export const houseSyntaxLookTheme = (mode: ThemeMode): Theme =>
  applyStyle(themes[mode], houseSyntaxLook);

/** What the documented brand resolves to, for the page and its tests. */
export const housePalette: SyntaxColors = syntaxColors(houseSyntaxTheme);

/** The house palette's audit: no report, so the block reads in every token. */
export const houseAudit = auditTheme(houseSyntaxTheme);
