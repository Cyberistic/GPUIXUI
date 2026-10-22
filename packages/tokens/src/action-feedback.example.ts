/**
 * The pointer-feedback check over the brand that erases it. Executed by
 * `action-feedback.test.ts`, so the call site the catalogue documents is a real
 * one.
 */

import {
  actionFeedbackFailures,
  extendTheme,
  lightTheme,
  type Theme,
} from "./index.js";

/**
 * A brand built in one hue: its page text and its primary action are the same
 * deep navy, so the action still carries its own white label and the page copy
 * still reads — while the hover, derived by moving the fill 12% toward that
 * text, has nowhere to move.
 *
 * This is the reachable defect the contract exists for: `filledHover` moves
 * toward `foreground`, which is a free role, and nothing in the type says the
 * foreground has to be far from an action fill.
 */
export const invisibleFeedbackBrand = extendTheme(lightTheme, {
  colors: {
    foreground: "#1E3478",
    primary: "#1E3478",
  },
});

/** A pointer step written the way a theme editor shows it. */
export const reportFeedback = (theme: Theme): ReadonlyArray<string> =>
  actionFeedbackFailures(theme).map(
    ({ role, ratio }) =>
      `${role}: ${ratio === undefined ? "unmeasurable" : ratio.toFixed(2)}`,
  );
