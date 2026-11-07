import { auditTheme, extendTheme, lightTheme } from "./index.js";

export const almostBrandTheme = extendTheme(lightTheme, {
  name: "Almost Acme",
  colors: { primary: "#7C5CF" },
});

export const almostBrandAudit = auditTheme(almostBrandTheme);
