import {
  selectionStyle,
  statusTone,
  textStyle,
  type StatusTone,
  type Theme,
} from "./index.js";

/**
 * The style objects a tone-tinted Alert or Badge spreads for a soft status tone.
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

/**
 * The style objects a solid status chip spreads. The solid role is a fill and
 * carries its own on-colour, so the pair comes from `statusTone(...).solid`
 * rather than from two role lookups at the call site. The chip's label is
 * selectable, and the accent-tinted wash is invisible on a solid fill, so the
 * container takes the inverse veil.
 */
export const statusSolidStyles = (theme: Theme, tone: StatusTone) => {
  const { solid } = statusTone(theme, tone);
  return {
    container: {
      ...selectionStyle(theme, "fill"),
      backgroundColor: solid.background,
      borderRadius: theme.radius.full,
      paddingLeft: theme.spacing.md,
      paddingRight: theme.spacing.md,
      paddingTop: theme.spacing["2xs"],
      paddingBottom: theme.spacing["2xs"],
      alignSelf: "flex-start",
    },
    text: { ...textStyle(theme, "label"), color: solid.foreground },
  };
};
