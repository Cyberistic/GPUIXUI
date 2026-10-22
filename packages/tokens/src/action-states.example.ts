import {
  disabledAction,
  filledHover,
  filledPressed,
  type FilledAction,
  type Theme,
} from "./index.js";

/**
 * The fills a filled control paints at rest, hovered, pressed and disabled, with
 * the on-colour text held constant. A real button adds its own geometry; this
 * shows only the parts a component must not invent — including the disabled
 * state, which is the neutral pair rather than a faded fill: a fade composites
 * with the surface behind it, and on a card it does not keep the floor.
 */
export const filledActionStyles = (theme: Theme, action: FilledAction) => {
  const foreground = theme.colors[`${action}Foreground`];
  return {
    resting: { backgroundColor: theme.colors[action], color: foreground },
    hover: { backgroundColor: filledHover(theme, action), color: foreground },
    pressed: {
      backgroundColor: filledPressed(theme, action),
      color: foreground,
    },
    disabled: disabledAction(theme),
  };
};
