import { themeColors } from "./docs-theme";
import { absoluteUrl } from "./site";

/**
 * The site-wide `<head>` (plan 510).
 *
 * One module owns the identity every page inherits, so the brand assets and the
 * palette are named once instead of being retyped in the root route. The social
 * card is a committed 1200×630 PNG generated from `public/brand/og.svg`; no
 * social platform renders an SVG card. `src/lib/site-head.test.ts` proves each
 * path exists and that the card's pixels match the dimensions declared here,
 * and `scripts/smoke-build.ts` proves the built pages carry them.
 */
export const SITE_NAME = "GPUIXUI";

export const SITE_DESCRIPTION = "A native UI component library for GPUix.";

/** The committed brand assets, named once for the head and its guards. */
export const BRAND_ASSETS = {
  mark: "/brand/mark.svg",
  favicon: "/brand/favicon-32.png",
  touchIcon: "/brand/apple-touch-icon.png",
  icon192: "/brand/icon-192.png",
  icon512: "/brand/icon-512.png",
  socialCard: "/brand/og.png",
} as const;

/** The install metadata document; a route so its colours come from the theme. */
export const MANIFEST_PATH = "/site.webmanifest";

/** The social card's real pixel size and the text a screen reader announces. */
export const SOCIAL_CARD = {
  width: 1200,
  height: 630,
  alt: "GPUIXUI — a native UI component library for GPUix",
} as const;

/**
 * The browser-chrome colour per scheme.
 *
 * These cannot ride in the route `head`: TanStack keys a meta tag by its `name`
 * or `property` and keeps one per key, so a light and a dark `theme-color`
 * collapse into the last one (measured in the built site, plan 510). The root
 * component renders them as plain elements inside `<head>` instead.
 */
export const THEME_COLOR_META = [
  {
    media: "(prefers-color-scheme: light)",
    content: themeColors.light.background,
  },
  {
    media: "(prefers-color-scheme: dark)",
    content: themeColors.dark.background,
  },
] as const;

/** The `<head>` TanStack merges into every route. */
export const siteHead = (stylesheet: string) => ({
  meta: [
    { charSet: "utf-8" },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
    { title: SITE_NAME },
    { name: "description", content: SITE_DESCRIPTION },
    { name: "color-scheme", content: "light dark" },
    { name: "application-name", content: SITE_NAME },
    { name: "apple-mobile-web-app-title", content: SITE_NAME },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:image", content: absoluteUrl(BRAND_ASSETS.socialCard) },
    { property: "og:image:width", content: `${SOCIAL_CARD.width}` },
    { property: "og:image:height", content: `${SOCIAL_CARD.height}` },
    { property: "og:image:alt", content: SOCIAL_CARD.alt },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:image", content: absoluteUrl(BRAND_ASSETS.socialCard) },
    { name: "twitter:image:alt", content: SOCIAL_CARD.alt },
  ],
  links: [
    { rel: "stylesheet", href: stylesheet },
    {
      rel: "icon",
      type: "image/svg+xml",
      href: BRAND_ASSETS.mark,
      sizes: "any",
    },
    {
      rel: "icon",
      type: "image/png",
      href: BRAND_ASSETS.favicon,
      sizes: "32x32",
    },
    { rel: "apple-touch-icon", href: BRAND_ASSETS.touchIcon },
    { rel: "manifest", href: MANIFEST_PATH },
  ],
});
