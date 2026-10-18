import { statusTone, textStyle, type StatusTone, type Theme } from "./index.js";

/**
 * The text roles a status panel paints on its tone-tinted root: the tone's own
 * title, body prose, a caption in the quiet tonality and a link or action in the
 * brand tonality. The last two are the roles the contrast contract holds on
 * every soft status fill (`softPanelTextPairs`).
 */
export const statusPanelTextStyles = (theme: Theme, tone: StatusTone) => {
  const { background, foreground } = statusTone(theme, tone);
  return {
    surface: background,
    title: { ...textStyle(theme, "bodyStrong"), color: foreground },
    body: { ...textStyle(theme, "body"), color: theme.colors.foreground },
    caption: {
      ...textStyle(theme, "caption"),
      color: theme.colors.mutedForeground,
    },
    link: { ...textStyle(theme, "body"), color: theme.colors.primaryText },
  };
};
