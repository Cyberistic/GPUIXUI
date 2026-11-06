import { invalidScales, type Theme } from "./index.js";
import { extendTheme, lightTheme } from "./theme.js";

export const computedBrand: Theme = extendTheme(lightTheme, {
  name: "Acme computed",
  radius: { xl: 6 },
  density: { controlHeight: { sm: 40, md: 28, lg: 36 } },
  typography: { h2: { fontSize: 12 } },
});

export const brandScaleReport = invalidScales(computedBrand);

export const equalRadiusBrand: Theme = extendTheme(lightTheme, {
  name: "Acme Fluent corners",
  radius: { xl: 8 },
});

export const equalRadiusReport = invalidScales(equalRadiusBrand);

export const unevenElevationBrand: Theme = extendTheme(lightTheme, {
  name: "Acme uneven elevation",
  elevation: {
    md: [
      {
        offsetX: 0,
        offsetY: 24,
        blurRadius: 56,
        spreadRadius: -12,
        color: "#191D25A6",
      },
    ],
  },
});

export const elevationScaleReport = invalidScales(unevenElevationBrand);
