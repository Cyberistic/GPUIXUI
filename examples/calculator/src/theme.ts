/**
 * The calculator's own physical colours.
 *
 * Every application surface reads a semantic role from `@gpuixui/tokens`. The
 * LCD is the exception a real device forces: a calculator's display is dark in
 * both themes, with a fixed ink. These are the only literals in the app, and
 * they are named here once.
 */

import type { Theme } from "@gpuixui/tokens";

export interface LcdPalette {
  readonly panel: string;
  readonly ink: string;
  readonly dim: string;
  readonly edge: string;
  readonly glow: string;
}

export const lcdPalette = (dark: boolean): LcdPalette =>
  dark
    ? {
        panel: "#0A1711",
        ink: "#B8F7CF",
        dim: "#5C8C6F",
        edge: "#1E3A2B",
        glow: "#0F2419",
      }
    : {
        panel: "#0D1C15",
        ink: "#D6FFE6",
        dim: "#6B9B7D",
        edge: "#234233",
        glow: "#12271C",
      };

export type KeyTone =
  | "number"
  | "operator"
  | "function"
  | "control"
  | "equals"
  | "accent";

export interface KeyPaint {
  readonly background: string;
  readonly foreground: string;
  readonly border: string;
  readonly hover: string;
}

/** The keycaps, derived from semantic roles rather than invented shades. */
export const keyPaint = (
  theme: Theme,
  tone: KeyTone,
  active: boolean,
): KeyPaint => {
  if (tone === "equals") {
    return {
      background: theme.colors.primary,
      foreground: theme.colors.primaryForeground,
      border: theme.colors.primary,
      hover: theme.colors.primary,
    };
  }
  if (tone === "accent" || active) {
    return {
      background: theme.colors.accent,
      foreground: theme.colors.accentForeground,
      border: theme.colors.primary,
      hover: theme.colors.primary,
    };
  }
  if (tone === "operator") {
    return {
      background: theme.colors.secondary,
      foreground: theme.colors.secondaryForeground,
      border: theme.colors.border,
      hover: theme.colors.accent,
    };
  }
  if (tone === "control") {
    return {
      background: theme.colors.muted,
      foreground: theme.colors.mutedForeground,
      border: theme.colors.border,
      hover: theme.colors.accent,
    };
  }
  if (tone === "function") {
    return {
      background: theme.colors.card,
      foreground: theme.colors.cardForeground,
      border: theme.colors.border,
      hover: theme.colors.accent,
    };
  }
  return {
    background: theme.colors.background,
    foreground: theme.colors.foreground,
    border: theme.colors.border,
    hover: theme.colors.accent,
  };
};

/** The calculator body's surface, which is not a window pane. */
export const bodyPaint = (theme: Theme) => ({
  background: theme.colors.card,
  border: theme.colors.border,
  shadow: theme.elevation.md,
});
