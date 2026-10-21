import { auditTheme, extendTheme, lightTheme } from "./index.js";

/**
 * A brand theme with one misspelt fill: the renderer would paint it black in
 * silence, so the audit is what turns the typo into a reported role.
 */
export const almostBrandTheme = extendTheme(lightTheme, {
  name: "Almost Acme",
  colors: { primary: "#7C5CF" },
});

/**
 * The checks a brand theme runs before it ships, as one call, on a theme that
 * fails one of them: an unparsable role is reported, and `passed` is false.
 */
export const almostBrandAudit = auditTheme(almostBrandTheme);
