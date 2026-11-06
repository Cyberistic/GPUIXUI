import {
  actionFeedbackFailures,
  extendTheme,
  lightTheme,
  type Theme,
} from "./index.js";

export const invisibleFeedbackBrand = extendTheme(lightTheme, {
  colors: {
    foreground: "#1E3478",
    primary: "#1E3478",
  },
});

export const reportFeedback = (theme: Theme): ReadonlyArray<string> =>
  actionFeedbackFailures(theme).map(
    ({ role, ratio }) =>
      `${role}: ${ratio === undefined ? "unmeasurable" : ratio.toFixed(2)}`,
  );
