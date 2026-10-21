import { auditTheme, extendTheme, lightTheme } from "./index.js";

/**
 * A brand whose corner radius was computed from a scale factor nobody set: the
 * value is `NaN`, the style batch serialises it to `null`, and the runtime drops
 * the property in silence — so every card paints square while the theme claims a
 * radius.
 */
export const unmeasuredBrandTheme = extendTheme(lightTheme, {
  name: "Unmeasured",
  radius: { md: Number.NaN },
});

/**
 * What the gate reports for it: the radius by group, path, value and rule, and
 * none of the colour reports, because nothing is wrong with a colour.
 */
export const unmeasuredBrandAudit = auditTheme(unmeasuredBrandTheme);
