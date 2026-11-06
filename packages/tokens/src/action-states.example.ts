import {
  disabledAction,
  filledHover,
  filledPressed,
  type FilledAction,
  type FilledRole,
  type Theme,
} from "./index.js";

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

export const filledActionStyles = (theme: Theme, action: FilledAction) =>
  filledFace(theme, action);

export const toggleFillStyles = (theme: Theme) => filledFace(theme, "accent");
