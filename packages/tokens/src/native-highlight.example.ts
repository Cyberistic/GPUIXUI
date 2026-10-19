import { getTheme, nativeHighlight, nativeHighlightStep } from "./index.js";

const light = getTheme("light");
const dark = getTheme("dark");

/** A find bar over a light document: every match and the active match. */
export const findBar = { highlight: nativeHighlight(light) };

/** The same bar in dark mode, where the runtime's accent default is unreadable. */
export const darkFindBar = { highlight: nativeHighlight(dark) };

/** The step the active match adds to the selection wash's own alpha. */
export const activeStep = nativeHighlightStep;
