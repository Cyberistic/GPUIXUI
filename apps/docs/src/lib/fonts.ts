import type { PlatformName, Theme } from "@gpuixui/tokens";

/**
 * The browser font bridge.
 *
 * GPUI resolves the `.SystemUIFont` sentinel to the operating system's own UI
 * font; a browser cannot. The preview maps the sentinel to the *selected
 * platform's* family so the switch has a typographic axis on every host, and
 * leaves every other family alone.
 */

/** The CSS stack that stands in for GPUI's system UI font. */
export const SYSTEM_FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

/** The CSS font stack for a theme's UI family. */
export const cssFontStack = (sans: string): string =>
  sans === ".SystemUIFont" ? SYSTEM_FONT_STACK : sans;

/**
 * The UI stack a platform's own release paints, for the browser preview.
 *
 * The runtime resolves `.SystemUIFont` to the host's font — a Windows-styled
 * app running on a Mac paints San Francisco — so `cssFontStack` maps the
 * sentinel to one stack and every platform looks the same on one machine. The
 * docs choose deliberately otherwise: the switch is a reading test ("a reader
 * toggles macOS → Windows and every preview changes"), and on a Mac the
 * typography axis is otherwise invisible. The preview therefore starts the
 * stack with the platform's own family, which is what that platform's users
 * see. It is a docs-only stand-in, not a runtime claim.
 */
export const platformFontStack = (platform: PlatformName): string =>
  PLATFORM_FONT_STACKS[platform];

const PLATFORM_FONT_STACKS: Readonly<Record<PlatformName, string>> = {
  darwin:
    '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
  linux: 'Ubuntu, Cantarell, "DejaVu Sans", "Noto Sans", system-ui, sans-serif',
  win32:
    '"Segoe UI", system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif',
  default: SYSTEM_FONT_STACK,
};

/** The family a preview paints: the theme's own, or the platform's stand-in. */
export const previewFontStack = (
  theme: Pick<Theme, "typography">,
  platform: PlatformName,
): string =>
  theme.typography.sans === ".SystemUIFont"
    ? platformFontStack(platform)
    : theme.typography.sans;
