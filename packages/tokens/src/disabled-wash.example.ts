/**
 * An edited theme whose selection wash equals the fill an unavailable control
 * keeps. Every text pair still passes — the label is exactly as readable as it
 * was at rest — and the wash pair is the only check that reports the erased
 * highlight.
 */
import { extendTheme, getTheme, themeContrastFailures } from "./index.js";

const light = getTheme("light");

export const invisibleDisabledWash = extendTheme(light, {
  colors: { selection: light.colors.disabled },
});

export const invisibleDisabledWashFailures = themeContrastFailures(
  invisibleDisabledWash,
).filter(
  ({ foreground, background, wash }) =>
    foreground === "selection" &&
    background === "disabled" &&
    wash === "selection",
);
