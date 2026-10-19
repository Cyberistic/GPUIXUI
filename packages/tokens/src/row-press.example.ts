import { extendTheme, getTheme, themeDirectionFailures } from "./index.js";

/**
 * A dark theme whose selectable row presses toward the canvas. `accent` is the
 * fill a row hovers with and `active` the fill it presses with; the two are a
 * 1.094:1 step, so the contrast contract accepts them, but the press moves
 * darker in a dark theme instead of lighter.
 */
export const invertedRowPressTheme = extendTheme(getTheme("dark"), {
  colors: {
    accent: "#393939",
    hover: "#2C2C2C",
    active: "#333333",
    selected: "#3F3F3F",
    border: "#414A57",
  },
});

/** The one failure the direction check reports for it. */
export const rowPressFailures = themeDirectionFailures(invertedRowPressTheme);
