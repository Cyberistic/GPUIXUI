import {
  disabledAction,
  filledHover,
  filledPressed,
  type FilledAction,
  type FilledRole,
  type Theme,
} from "./index.js";

/**
 * The four paints a face has while it carries a label: at rest, hovered,
 * pressed and disabled.
 *
 * A real control adds its own geometry; this shows only the parts a component
 * must not invent — including the disabled state, which is the neutral pair
 * rather than a faded fill: a fade composites with the surface behind it, and on
 * a card it does not keep the floor.
 */
const filledFace = (theme: Theme, role: FilledRole) => {
  const foreground = theme.colors[`${role}Foreground`];
  return {
    resting: { backgroundColor: theme.colors[role], color: foreground },
    hover: { backgroundColor: filledHover(theme, role), color: foreground },
    pressed: {
      backgroundColor: filledPressed(theme, role),
      color: foreground,
    },
    disabled: disabledAction(theme),
  };
};

/**
 * The fills a filled action paints. A toggle's on-state is the same shape in the
 * `accent` role, whose press stops a step short of the other three because its
 * label floor is tighter.
 */
export const filledActionStyles = (theme: Theme, action: FilledAction) =>
  filledFace(theme, action);

/** The fills a toggle's on-state paints — the non-action filled face. */
export const toggleFillStyles = (theme: Theme) => filledFace(theme, "accent");
