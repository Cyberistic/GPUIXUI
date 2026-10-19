/**
 * A focused filled control inside a clipped group paints its focus indicator
 * inside its own box, because the group clips the outer shadow. The `ring` role
 * is designed for the surface behind a control; `insetFocusRing` returns the
 * family's measured on-colour at the outer ring's thickness instead.
 */
import type { ControlSize } from "./scale.js";
import {
  controlHeight,
  controlPaddingX,
  filledControl,
  insetFocusRing,
} from "./styles.js";
import type { Theme } from "./theme.js";

/** The style a focused primary member of a clipped button group paints. */
export const clippedFocusedButtonStyle = (
  theme: Theme,
  size: ControlSize = "md",
) => {
  const fill = filledControl(theme, "primary");
  const ring = insetFocusRing(theme, "primary");
  return {
    backgroundColor: fill.background,
    color: fill.foreground,
    height: controlHeight(theme, size),
    paddingLeft: controlPaddingX(theme, size),
    paddingRight: controlPaddingX(theme, size),
    borderColor: ring.borderColor,
    borderWidth: ring.borderWidth,
  };
};
