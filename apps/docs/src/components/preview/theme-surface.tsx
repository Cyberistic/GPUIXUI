import { useSyncExternalStore, type CSSProperties } from "react";
import {
  elevationShadow,
  platformTheme,
  themes,
  type PlatformName,
  type Theme,
  type TextStyle,
  type ThemeMode,
} from "@gpuixui/tokens";
import { isPlatformName } from "@/platform/platform";

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

/** What the page chrome is showing: the active platform and colour mode. */
export interface PreviewState {
  readonly platform: PlatformName;
  readonly mode: ThemeMode;
}

/** The state the server sent; a preview hydrates from this, not from a guess. */
const SERVER_STATE = "default|light";
const SEPARATOR = "|";

/**
 * The providers publish their resolved state on `<html>`: `data-platform` and
 * the next-themes `dark` class. Reading them is what keeps a preview from
 * disagreeing with the chrome around it — the MDX subtree's first render loses
 * the providers' mount-time updates (plans 444, 445).
 */
const documentState = (): string =>
  `${document.documentElement.dataset.platform ?? "default"}${SEPARATOR}${
    document.documentElement.classList.contains("dark") ? "dark" : "light"
  }`;

/** Decode the published state; a corrupt attribute is the shipped default. */
export const parsePreviewState = (snapshot: string): PreviewState => {
  const [platform = "", mode = ""] = snapshot.split(SEPARATOR);
  return {
    platform: isPlatformName(platform) ? platform : "default",
    mode: mode === "dark" ? "dark" : "light",
  };
};

const subscribeToDocument = (onChange: () => void): (() => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "data-platform"],
  });
  return () => observer.disconnect();
};

/** The live preview state; the server snapshot is the HTML the server sent. */
export function usePreviewState(): PreviewState {
  return parsePreviewState(
    useSyncExternalStore(
      subscribeToDocument,
      documentState,
      () => SERVER_STATE,
    ),
  );
}

/** The active theme: the published mode resolved through the platform. */
export function usePreviewTheme(): Theme {
  const { platform, mode } = usePreviewState();
  return platformTheme(themes[mode], platform);
}

/**
 * The token surface every preview paints on; it reads no doc-site colour.
 *
 * `locked` marks the theme editor's surfaces: they follow the editor's base
 * theme, not the docs chrome, so the site-wide preview gates (which require
 * every `data-preview-surface` to paint the docs mode) must not read them.
 */
export function PreviewSurface({
  theme,
  locked = false,
  children,
}: {
  readonly theme?: Theme;
  readonly locked?: boolean;
  readonly children: React.ReactNode;
}) {
  const active = usePreviewTheme();
  return (
    <div
      data-preview-surface={locked ? undefined : ""}
      data-theme-editor-surface={locked ? "" : undefined}
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
