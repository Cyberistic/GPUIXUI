import type { PlatformName, Theme } from "@gpuixui/tokens";

export const SYSTEM_FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export const cssFontStack = (sans: string): string =>
  sans === ".SystemUIFont" ? SYSTEM_FONT_STACK : sans;

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

export const previewFontStack = (
  theme: Pick<Theme, "typography">,
  platform: PlatformName,
): string =>
  theme.typography.sans === ".SystemUIFont"
    ? platformFontStack(platform)
    : theme.typography.sans;
