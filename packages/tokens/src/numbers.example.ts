import { auditTheme, extendTheme, lightTheme } from "./index.js";

export const unmeasuredBrandTheme = extendTheme(lightTheme, {
  name: "Unmeasured",
  radius: { md: Number.NaN },
});

export const unmeasuredBrandAudit = auditTheme(unmeasuredBrandTheme);

export const squatDensityTheme = extendTheme(lightTheme, {
  name: "Squat",
  density: {
    controlHeight: { sm: 20, md: 22, lg: 24 },
    rowHeight: 20,
  },
});

export const squatDensityAudit = auditTheme(squatDensityTheme);

export const crushedTypeTheme = extendTheme(lightTheme, {
  name: "Crushed",
  typography: {
    display: { lineHeight: 20 },
    h1: { lineHeight: 16 },
    body: { lineHeight: 10 },
  },
});

export const crushedTypeAudit = auditTheme(crushedTypeTheme);

export const tallTypeTheme = extendTheme(lightTheme, {
  name: "Tall type",
  density: "compact",
  typography: {
    body: { lineHeight: 26 },
    bodyStrong: { lineHeight: 26 },
  },
});

export const tallTypeAudit = auditTheme(tallTypeTheme);

export const shavedRowTheme = extendTheme(lightTheme, {
  name: "Shaved row",
  density: { rowHeight: 24 },
  typography: {
    body: { lineHeight: 26 },
    bodyStrong: { lineHeight: 26 },
  },
});

export const shavedRowAudit = auditTheme(shavedRowTheme);

export const grownIconTheme = extendTheme(lightTheme, {
  name: "Grown icon",
  density: "compact",
  iconSize: { md: 26, lg: 28, xl: 30 },
});

export const grownIconAudit = auditTheme(grownIconTheme);

export const invisibleRingTheme = extendTheme(lightTheme, {
  name: "Invisible ring",
  borderWidth: { strong: 0 },
});

export const invisibleRingAudit = auditTheme(invisibleRingTheme);

export const flatEmphasisTheme = extendTheme(lightTheme, {
  name: "Flat emphasis",
  typography: { bodyStrong: { fontWeight: 400 } },
});

export const flatEmphasisAudit = auditTheme(flatEmphasisTheme);

export const lopsidedEmphasisTheme = extendTheme(lightTheme, {
  name: "Lopsided emphasis",
  typography: { body: { fontSize: 15 } },
});

export const lopsidedEmphasisAudit = auditTheme(lopsidedEmphasisTheme);

const storedTypography = {
  ...lightTheme.typography,
  h1: { ...lightTheme.typography.h1, fontWeight: Number.NaN },
};

export const droppedWeightTheme = {
  ...lightTheme,
  name: "Dropped weight",
  typography: storedTypography,
};

export const droppedWeightAudit = auditTheme(droppedWeightTheme);
