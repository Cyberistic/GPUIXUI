import {
  auditTheme,
  decodeOmarchyPalette,
  getTheme,
  paletteToTokens,
} from "@gpuixui/tokens";

/**
 * The desktop palette `/docs/theming` prints, decoded and mapped by the shipped
 * functions.
 *
 * A documentation table copied from a run drifts the moment the decoder or the
 * mapper moves, so the page renders this module's values instead. The sample is
 * Tokyo Night, the `colors.toml` Omarchy's own theme ships, trimmed to the keys
 * the page teaches; `system-theme-page.test.ts` holds the page's fence to this
 * string, so the printed palette and the decoded one cannot disagree.
 */
export const omarchySample = `mode = "dark"
background = "#1a1b26"
foreground = "#a9b1d6"
accent = "#7aa2f7"
muted = "#414868"
red = "#f7768e"
selection = "#292e42"`;

/** The file as the reader hands it back: the palette plus any unusable lines. */
export const omarchyFile = decodeOmarchyPalette(omarchySample);

/** The theme a dark application wears after the desktop's palette is mapped. */
export const omarchyTheme = paletteToTokens(
  omarchyFile.palette,
  getTheme("dark"),
);

/**
 * The library's own gate on the mapped theme.
 *
 * A desktop palette names a handful of roles, so the result is a mix of the
 * desktop's colours and the base theme's surfaces. This is that mix measured,
 * and the page prints the counts rather than calling the sample shippable.
 */
export const omarchyAudit = auditTheme(omarchyTheme);
