import { statusTone, textStyle, type StatusTone, type Theme } from "./index.js";

/**
 * The style objects an Alert, Badge or Toast spreads for a soft status tone.
 * A real component adds its own layout; this shows only the tone's colour and
 * text, which is the part that must not be invented per component.
 */
export const statusToneStyles = (theme: Theme, tone: StatusTone) => {
  const { background, foreground, border } = statusTone(theme, tone);
  return {
    container: {
      backgroundColor: background,
      borderColor: border,
      borderWidth: theme.borderWidth.thin,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
    },
    text: { ...textStyle(theme, "label"), color: foreground },
  };
};
