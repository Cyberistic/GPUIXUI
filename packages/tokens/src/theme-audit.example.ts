import {
  contrastFailures,
  extendTheme,
  invalidColorRoles,
  lightTheme,
  type ContrastFailure,
  type InvalidColorRole,
  type Theme,
} from "./index.js";

/** What a theme must be free of before it ships. */
export interface ThemeAudit {
  /** Roles whose value is not a colour the renderer can paint. */
  readonly invalidRoles: readonly InvalidColorRole[];
  /** Text-on-surface pairs below their contrast floor, or unmeasurable. */
  readonly contrastFailures: readonly ContrastFailure[];
}

/**
 * The two checks a brand theme runs before it ships: every role is a colour
 * GPUix can paint, and every measured pair meets its floor. An empty audit is
 * the only passing result — the renderer ignores a value it cannot parse and
 * paints nothing for a pair nobody measured.
 */
export const auditTheme = (theme: Theme): ThemeAudit => ({
  invalidRoles: invalidColorRoles(theme),
  contrastFailures: contrastFailures(theme),
});

/** A brand theme with one misspelt fill, so the audit has something to report. */
export const almostBrandTheme = extendTheme(lightTheme, {
  name: "Almost Acme",
  colors: { primary: "#7C5CF" },
});
