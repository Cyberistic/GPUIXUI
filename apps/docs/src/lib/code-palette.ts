import { darkTheme, lightTheme } from "@gpuixui/tokens";

/**
 * The syntax palette, and the two GitHub colours it corrects (plan 498).
 *
 * Measured on the production build, `#e36209` painted 3.49:1 on the light code
 * surface and `#6a737d` painted 3.51:1 on the dark one — below the 4.5:1 text
 * floor. Shiki applies `colorReplacements` per theme name, so each correction
 * reaches one scheme. The generated prop tables run their own Shiki pipeline;
 * both read this map through `source.config.ts`.
 */
export const codeThemes = {
  light: {
    theme: "github-light",
    background: lightTheme.colors.card,
    replacements: { "#e36209": "#b34700" },
  },
  dark: {
    theme: "github-dark",
    background: darkTheme.colors.card,
    replacements: { "#6a737d": "#8b949e" },
  },
} as const;

/** Shiki's per-theme replacement shape, shared by both highlight pipelines. */
export const codeColorReplacements = {
  [codeThemes.light.theme]: codeThemes.light.replacements,
  [codeThemes.dark.theme]: codeThemes.dark.replacements,
};

/** The theme pair both highlight pipelines are asked for, by name. */
export const codeThemeNames = {
  light: codeThemes.light.theme,
  dark: codeThemes.dark.theme,
};

/** An opaque sRGB colour. */
export interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

const HEX = /^#([0-9a-f]{6})$/i;
const RGB = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+\s*)?\)$/i;

/** Read an opaque `#rrggbb` or `rgb(r, g, b)` value; `null` if it is neither. */
export const parseColour = (colour: string): Rgb | null => {
  const value = colour.trim();
  const hex = HEX.exec(value);
  if (hex?.[1] !== undefined) {
    const digits = Number.parseInt(hex[1], 16);
    return { r: (digits >> 16) & 255, g: (digits >> 8) & 255, b: digits & 255 };
  }
  const rgb = RGB.exec(value);
  if (rgb === null) return null;
  const [r, g, b] = [rgb[1], rgb[2], rgb[3]].map((part) =>
    part === undefined ? Number.NaN : Number.parseInt(part, 10),
  );
  if (r === undefined || g === undefined || b === undefined) return null;
  if ([r, g, b].some((channel) => Number.isNaN(channel))) return null;
  return { r, g, b };
};

const luminance = ({ r, g, b }: Rgb): number => {
  const channel = (raw: number): number => {
    const scaled = raw / 255;
    return scaled <= 0.03928
      ? scaled / 12.92
      : Math.pow((scaled + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

/** WCAG 2.1 contrast ratio of two opaque colours (1–21). */
export const contrastRatio = (foreground: Rgb, background: Rgb): number => {
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
};

/** The floor the site holds code text to: WCAG AA normal text. */
export const TEXT_CONTRAST_FLOOR = 4.5;
