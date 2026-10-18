/**
 * Tailwind utility → GPUix `StyleDesc`.
 *
 * This is the only place a class name becomes a native style. Values are the
 * Tailwind defaults the shadcn recipes are written against (`h-9` = 36,
 * `px-3` = 12, `rounded-md` = 6); colours resolve through semantic theme roles,
 * so the same recipe works in light, dark and high-contrast themes.
 */

import type { StyleDesc } from "@gpuix/react";
import {
  alpha,
  elevationShadow,
  type Theme,
  type ThemeColors,
} from "@gpuixui/tokens";

/** A resolved utility, or a function that needs the theme. */
export type Utility = StyleDesc | ((theme: Theme) => StyleDesc);

/** The shadcn/Tailwind colour name → token role. */
const ROLE: Readonly<Record<string, keyof ThemeColors>> = {
  background: "background",
  foreground: "foreground",
  card: "card",
  "card-foreground": "cardForeground",
  popover: "popover",
  "popover-foreground": "popoverForeground",
  primary: "primary",
  "primary-foreground": "primaryForeground",
  secondary: "secondary",
  "secondary-foreground": "secondaryForeground",
  muted: "muted",
  "muted-foreground": "mutedForeground",
  accent: "accent",
  "accent-foreground": "accentForeground",
  destructive: "destructive",
  "destructive-foreground": "destructiveForeground",
  success: "success",
  "success-foreground": "successForeground",
  warning: "warning",
  "warning-foreground": "warningForeground",
  info: "info",
  "info-foreground": "infoForeground",
  border: "border",
  "border-strong": "borderStrong",
  input: "input",
  "input-foreground": "inputForeground",
  ring: "ring",
  overlay: "overlay",
  hover: "hover",
  active: "active",
  selected: "selected",
  "selected-foreground": "selectedForeground",
  disabled: "disabled",
  "disabled-foreground": "disabledForeground",
  skeleton: "skeleton",
  selection: "selection",
  placeholder: "placeholder",
};

/** The literal colours Tailwind writes by name. */
const LITERAL: Readonly<Record<string, string>> = {
  white: "#FFFFFF",
  black: "#000000",
  transparent: "transparent",
};

const SPACING = (value: number): number => value * 4;

const RADIUS: Readonly<Record<string, number>> = {
  none: 0,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  "2xl": 16,
  "3xl": 24,
  "4xl": 32,
  full: 9999,
};

const TEXT_SIZE: Readonly<Record<string, readonly [number, number]>> = {
  xs: [12, 16],
  sm: [14, 20],
  base: [16, 24],
  lg: [18, 28],
  xl: [20, 28],
  "2xl": [24, 32],
  "3xl": [30, 36],
};

const FONT_WEIGHT: Readonly<Record<string, number>> = {
  thin: 100,
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
};

/** The semantic colour for `name`, or nothing when the name is not a role. */
export const colorRole = (theme: Theme, name: string): string | undefined => {
  const role = ROLE[name];
  return role === undefined ? undefined : theme.colors[role];
};

const literal = (name: string): string | undefined => LITERAL[name];

/** A colour, with an optional Tailwind `/alpha` suffix. */
const paint = (theme: Theme, value: string): string | undefined => {
  const slash = value.indexOf("/");
  const name = slash === -1 ? value : value.slice(0, slash);
  const rawAlpha = slash === -1 ? undefined : value.slice(slash + 1);
  const color = literal(name) ?? colorRole(theme, name);
  if (color === undefined) return undefined;
  if (rawAlpha === undefined) return color;
  const percent = Number(rawAlpha);
  return Number.isFinite(percent) ? alpha(color, percent / 100) : undefined;
};

/** Parses a Tailwind spacing value (`3`, `1.5`, `[12px]`) to pixels. */
const spacingValue = (value: string): number | undefined => {
  if (value.startsWith("[") && value.endsWith("px]")) {
    const px = Number(value.slice(1, -3));
    return Number.isFinite(px) ? px : undefined;
  }
  const n = Number(value);
  return Number.isFinite(n) ? SPACING(n) : undefined;
};

/** Resolves one unprefixed utility name. */
export const resolveUtility = (
  name: string,
  theme: Theme,
): StyleDesc | undefined => {
  if (name === "border") return { borderWidth: 1 };
  // shadcn's `--input` is a border role; our tokens' `input` is the field fill.
  if (name === "border-input") return { borderColor: theme.colors.border };
  if (name === "outline-none") return {};
  if (name === "bg-transparent") return { backgroundColor: "transparent" };
  if (name === "flex" || name === "inline-flex") return { display: "flex" };
  if (name === "grid") return { display: "grid" };
  if (name === "flex-col") return { flexDirection: "column" };
  if (name === "items-center") return { alignItems: "center" };
  if (name === "items-start") return { alignItems: "flex-start" };
  if (name === "justify-center") return { justifyContent: "center" };
  if (name === "justify-between") return { justifyContent: "space-between" };
  if (name === "shrink-0") return { flexShrink: 0 };
  if (name === "w-full") return { width: "100%" };
  if (name === "min-w-0") return { minWidth: 0 };
  if (name === "max-w-full") return { maxWidth: "100%" };
  if (name === "whitespace-nowrap") return { whiteSpace: "nowrap" };
  if (name === "select-none") return { userSelect: "none" };
  if (name === "pointer-events-none") return { pointerEvents: "none" };
  if (name === "cursor-pointer") return { cursor: "pointer" };
  if (name === "cursor-not-allowed") return { cursor: "not-allowed" };
  if (name === "absolute") return { position: "absolute" };
  if (name === "relative") return { position: "relative" };
  if (name === "fixed") return { position: "absolute" };
  if (name === "inset-0") return { top: 0, right: 0, bottom: 0, left: 0 };
  if (name === "text-left") return { textAlign: "left" };
  if (name === "text-center") return { textAlign: "center" };
  if (name === "text-right") return { textAlign: "right" };
  if (name === "underline") return { textDecoration: "underline" };

  if (name.startsWith("h-")) {
    const value = spacingValue(name.slice(2));
    return value === undefined ? undefined : { height: value };
  }
  if (name.startsWith("w-")) {
    const value = spacingValue(name.slice(2));
    return value === undefined ? undefined : { width: value };
  }
  if (name.startsWith("min-h-")) {
    const value = spacingValue(name.slice(6));
    return value === undefined ? undefined : { minHeight: value };
  }
  if (name.startsWith("min-w-")) {
    const value = spacingValue(name.slice(6));
    return value === undefined ? undefined : { minWidth: value };
  }
  if (name.startsWith("max-w-")) {
    const value = spacingValue(name.slice(6));
    return value === undefined ? undefined : { maxWidth: value };
  }
  if (name.startsWith("size-")) {
    const value = spacingValue(name.slice(5));
    return value === undefined ? undefined : { width: value, height: value };
  }
  if (name.startsWith("p-")) {
    const value = spacingValue(name.slice(2));
    return value === undefined ? undefined : { padding: value };
  }
  if (name.startsWith("px-")) {
    const value = spacingValue(name.slice(3));
    return value === undefined
      ? undefined
      : { paddingLeft: value, paddingRight: value };
  }
  if (name.startsWith("py-")) {
    const value = spacingValue(name.slice(3));
    return value === undefined
      ? undefined
      : { paddingTop: value, paddingBottom: value };
  }
  if (name.startsWith("gap-x-")) {
    const value = spacingValue(name.slice(6));
    return value === undefined ? undefined : { columnGap: value };
  }
  if (name.startsWith("gap-y-")) {
    const value = spacingValue(name.slice(6));
    return value === undefined ? undefined : { rowGap: value };
  }
  if (name.startsWith("gap-")) {
    const value = spacingValue(name.slice(4));
    return value === undefined ? undefined : { gap: value };
  }
  if (name.startsWith("rounded-")) {
    const radius = RADIUS[name.slice(8)];
    return radius === undefined ? undefined : { borderRadius: radius };
  }
  if (name.startsWith("text-")) {
    const size = TEXT_SIZE[name.slice(5)];
    if (size !== undefined) {
      return { fontSize: size[0], lineHeight: size[1] };
    }
    const color = paint(theme, name.slice(5));
    return color === undefined ? undefined : { color };
  }
  if (name.startsWith("font-")) {
    const weight = FONT_WEIGHT[name.slice(5)];
    return weight === undefined ? undefined : { fontWeight: weight };
  }
  if (name.startsWith("opacity-")) {
    const value = Number(name.slice(8));
    return Number.isFinite(value) ? { opacity: value / 100 } : undefined;
  }
  if (name.startsWith("border-")) {
    const width = Number(name.slice(7));
    if (Number.isFinite(width)) return { borderWidth: width };
    const color = paint(theme, name.slice(7));
    return color === undefined ? undefined : { borderColor: color };
  }
  if (name.startsWith("bg-")) {
    const color = paint(theme, name.slice(3));
    return color === undefined ? undefined : { backgroundColor: color };
  }
  if (name.startsWith("shadow-")) {
    const level = name.slice(7);
    if (level === "xs") return elevationShadow(theme, "sm");
    if (level === "sm") return elevationShadow(theme, "sm");
    if (level === "md") return elevationShadow(theme, "md");
    if (level === "lg" || level === "xl") return elevationShadow(theme, "lg");
    return undefined;
  }
  if (name === "rounded") return { borderRadius: RADIUS.sm };

  return undefined;
};

/** Whether a utility is a ring declaration, resolved separately. */
export const isRing = (name: string): boolean => name.startsWith("ring-");

/** The width of `ring-1` / `ring-[3px]`; undefined for a colour-only ring. */
export const ringWidth = (name: string): number | undefined => {
  if (!name.startsWith("ring-")) return undefined;
  return spacingValue(name.slice(5));
};

/** The colour of `ring-ring/50` / `ring-destructive/20`. */
export const ringColor = (theme: Theme, name: string): string | undefined =>
  paint(theme, name.slice(5));

/** A ring as the one native shape GPUix can draw: a zero-blur box shadow. */
export const ringShadow = (
  theme: Theme,
  width: number,
  color?: string,
): StyleDesc => ({
  boxShadow: {
    offsetX: 0,
    offsetY: 0,
    blurRadius: 0,
    spreadRadius: width,
    color: color ?? theme.colors.ring,
  },
});
