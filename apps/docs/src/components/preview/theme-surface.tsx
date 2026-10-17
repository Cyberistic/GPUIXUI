import type { CSSProperties } from "react";
import {
  elevationShadow,
  platformTheme,
  themes,
  type Theme,
  type TextStyle,
  type ThemeMode,
} from "@gpuixui/tokens";
import { useTheme } from "fumadocs-ui/provider/base";
import { usePlatform } from "@/platform/platform-provider";

/**
 * The CSS custom properties a labelled preview may read. `previewVars` maps the
 * whole active `Theme` — every colour, type, spacing, radius, border, density,
 * icon and elevation value — so a preview is a mirror of the library's tokens,
 * not a second palette (plan 412 tier A, plan 434). A preview must never use a
 * literal colour: the approximations test rejects one.
 */
export interface PreviewStyle extends CSSProperties {
  [key: `--preview-${string}`]: string | number;
}

const px = (value: number): string => `${value}px`;

const scaleVars = (prefix: string, values: object, unit = ""): PreviewStyle =>
  Object.fromEntries(
    Object.entries(values).map(([name, value]) => [
      `--preview-${prefix}-${name}`,
      `${String(value)}${unit}`,
    ]),
  );

const isTextStyle = (value: string | TextStyle): value is TextStyle =>
  typeof value !== "string";

const textVars = (typography: Theme["typography"]): PreviewStyle =>
  Object.fromEntries(
    Object.entries(typography).flatMap(([role, value]) =>
      isTextStyle(value)
        ? [
            [`--preview-text-${role}-size`, px(value.fontSize)],
            [`--preview-text-${role}-leading`, px(value.lineHeight)],
            [`--preview-text-${role}-weight`, value.fontWeight],
          ]
        : [],
    ),
  );

const shadowVars = (theme: Theme): PreviewStyle =>
  Object.fromEntries(
    (["sm", "md", "lg", "overlay"] as const).map((level) => {
      const shadow = elevationShadow(theme, level);
      return [
        `--preview-shadow-${level}`,
        shadow === undefined
          ? "none"
          : `${px(shadow.offsetX)} ${px(shadow.offsetY)} ${px(shadow.blurRadius)} ${px(shadow.spreadRadius)} ${shadow.color}`,
      ];
    }),
  );

/** Every value a preview may use, derived from one resolved theme. */
export const previewVars = (theme: Theme): PreviewStyle => ({
  ...scaleVars("color", theme.colors),
  "--preview-font-sans": theme.typography.sans,
  "--preview-font-mono": theme.typography.mono,
  ...textVars(theme.typography),
  ...scaleVars("space", theme.spacing, "px"),
  ...scaleVars("radius", theme.radius, "px"),
  ...scaleVars("border", theme.borderWidth, "px"),
  ...scaleVars("icon", theme.iconSize, "px"),
  "--preview-control-height-sm": px(theme.density.controlHeight.sm),
  "--preview-control-height-md": px(theme.density.controlHeight.md),
  "--preview-control-height-lg": px(theme.density.controlHeight.lg),
  "--preview-control-padding-x-sm": px(theme.density.controlPaddingX.sm),
  "--preview-control-padding-x-md": px(theme.density.controlPaddingX.md),
  "--preview-control-padding-x-lg": px(theme.density.controlPaddingX.lg),
  "--preview-row-height": px(theme.density.rowHeight),
  ...shadowVars(theme),
});

/**
 * The docs' current mode. `next-themes` reports `resolvedTheme` only after the
 * client mounts; SSR and a stale read fall back to light, which is the same
 * default the site ships. The `undefined` is the library boundary, not a domain
 * value, so it is handled once here.
 */
const docsMode = (resolved: string | undefined): ThemeMode =>
  resolved === "dark" ? "dark" : "light";

/** The active theme: the docs' mode resolved through the chosen platform. */
export function usePreviewTheme(): Theme {
  const { resolvedTheme } = useTheme();
  const { platform } = usePlatform();
  return platformTheme(themes[docsMode(resolvedTheme)], platform);
}

/** The token surface every preview paints on; it reads no doc-site colour. */
export function PreviewSurface({
  theme,
  children,
}: {
  readonly theme?: Theme;
  readonly children: React.ReactNode;
}) {
  const active = usePreviewTheme();
  return (
    <div
      data-preview-surface=""
      style={{
        ...previewVars(theme ?? active),
        background: "var(--preview-color-background)",
        color: "var(--preview-color-foreground)",
        fontFamily: "var(--preview-font-sans)",
        padding: "var(--preview-space-xl)",
        borderRadius: "var(--preview-radius-lg)",
        border: "var(--preview-border-thin) solid var(--preview-color-border)",
      }}
    >
      {children}
    </div>
  );
}
