import {
  filledHover,
  filledPressed,
  type FilledAction,
  type Theme,
} from "./index.js";

/**
 * The fills a filled control paints at rest, hovered and pressed, with the
 * on-colour text held constant. A real button adds its own geometry; this shows
 * only the parts a component must not invent.
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
  };
};
