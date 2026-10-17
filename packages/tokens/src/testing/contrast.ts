/**
 * WCAG contrast maths and the semantic pairs every shipped colour set is held
 * to. Shared by the identity suite (`color.test.ts`) and the platform-style
 * suite (`platforms.test.ts`), so a new variant cannot be checked against a
 * weaker list than the themes it derives from.
 *
 * This is test-only code: the package ships no runtime helper for contrast.
 */

import type { ThemeColors } from "../color.js";

/** The contrast floor a pair is held to, by the class of text it carries. */
export type PairClass = "body" | "secondary" | "boundary";

/** A foreground/background role pair and the floor it must clear. */
export type Pair = readonly [keyof ThemeColors, keyof ThemeColors, PairClass];

/** Every documented text, status and boundary pair. */
export const pairs: readonly Pair[] = [
  ["foreground", "background", "body"],
  ["foreground", "card", "body"],
  ["cardForeground", "card", "body"],
  ["popoverForeground", "popover", "body"],
  ["mutedForeground", "muted", "secondary"],
  ["mutedForeground", "background", "secondary"],
  ["mutedForeground", "card", "secondary"],
  ["mutedForeground", "popover", "secondary"],
  ["inputForeground", "input", "body"],
  ["foreground", "hover", "body"],
  ["foreground", "active", "body"],
  ["secondaryForeground", "secondary", "secondary"],
  ["primaryForeground", "primary", "secondary"],
  ["primaryForeground", "primaryHover", "secondary"],
  ["destructiveForeground", "destructive", "secondary"],
  ["destructiveForeground", "destructiveHover", "secondary"],
  ["successForeground", "success", "secondary"],
  ["warningForeground", "warning", "secondary"],
  ["infoForeground", "info", "secondary"],
  ["infoSoftForeground", "infoSoft", "body"],
  ["successSoftForeground", "successSoft", "body"],
  ["warningSoftForeground", "warningSoft", "body"],
  ["destructiveSoftForeground", "destructiveSoft", "body"],
  ["infoText", "background", "secondary"],
  ["infoText", "card", "secondary"],
  ["successText", "background", "secondary"],
  ["successText", "card", "secondary"],
  ["warningText", "background", "secondary"],
  ["warningText", "card", "secondary"],
  ["destructiveText", "background", "secondary"],
  ["destructiveText", "card", "secondary"],
  ["accentForeground", "accent", "secondary"],
  ["selectedForeground", "selected", "secondary"],
  ["placeholder", "input", "secondary"],
  ["borderStrong", "background", "boundary"],
  ["borderStrong", "card", "boundary"],
  ["borderStrong", "input", "boundary"],
  ["ring", "background", "boundary"],
  ["ring", "card", "boundary"],
  ["ring", "popover", "boundary"],
];

const channel = (hex: string, at: number): number =>
  Number.parseInt(hex.slice(at, at + 2), 16) / 255;

const linear = (value: number): number =>
  value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;

const luminance = (color: string): number => {
  const hex = color.slice(1);
  const red = linear(channel(hex, 0));
  const green = linear(channel(hex, 2));
  const blue = linear(channel(hex, 4));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

/** WCAG contrast between two opaque `#RRGGBB` colours. */
export const contrast = (foreground: string, background: string): number => {
  const high = Math.max(luminance(foreground), luminance(background));
  const low = Math.min(luminance(foreground), luminance(background));
  return (high + 0.05) / (low + 0.05);
};

/** A colour channel at a byte offset of the full `#RRGGBB…` string. */
const byteAt = (color: string, at: number): number =>
  Number.parseInt(color.slice(at, at + 2), 16);

/**
 * Blend an 8-digit `#RRGGBBAA` overlay onto an opaque `#RRGGBB` base. Only used
 * for translucent roles, which the suites assert are 8-digit first.
 */
export const composite = (overlay: string, base: string): string => {
  const opacity = byteAt(overlay, 7) / 255;
  const channels = [1, 3, 5].map((at) =>
    Math.round(byteAt(overlay, at) * opacity + byteAt(base, at) * (1 - opacity))
      .toString(16)
      .padStart(2, "0"),
  );
  return `#${channels.join("")}`.toUpperCase();
};
