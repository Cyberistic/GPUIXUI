import { statusTone, textStyle, type StatusTone, type Theme } from "./index.js";

/**
 * Status text and an indicator dot drawn on a plain surface. The tone's `text`
 * role is the readable foreground for `background` and `card`; the solid and
 * soft roles are surfaces, so a component never paints them as text.
 */
export const statusTextStyles = (theme: Theme, tone: StatusTone) => {
  const { text } = statusTone(theme, tone);
  return {
    label: { ...textStyle(theme, "label"), color: text },
    dot: {
      width: theme.iconSize.xs,
      height: theme.iconSize.xs,
      borderRadius: theme.radius.full,
      backgroundColor: text,
    },
  };
};
