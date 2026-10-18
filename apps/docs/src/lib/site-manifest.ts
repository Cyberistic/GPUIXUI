import { themeColors } from "./docs-theme";
import { BRAND_ASSETS, SITE_DESCRIPTION, SITE_NAME } from "./site-head";

/**
 * The install metadata document (plan 516).
 *
 * It is a route, not a file in `public/`, for the same reason `/sitemap.xml` is:
 * every value derives from a module that already owns it, so the palette colour
 * cannot drift from the theme and the name cannot drift from the head. The
 * manifest has no scheme axis, so it carries the light canvas — the scheme a
 * home-screen shortcut opens in. `display: "browser"` is deliberate: the site
 * has no service worker and must not claim an offline standalone app.
 *
 * The shape is plain data, not an Effect schema, because this app's architecture
 * guard keeps the Effect runtime out of every non-test module. `site-manifest.test.ts`
 * decodes the rendered document with a `Schema.Class` contract, so a malformed
 * manifest fails the suite rather than a browser.
 */
export interface SiteManifestIcon {
  readonly src: string;
  readonly sizes: string;
  readonly type: "image/png";
  readonly purpose: "any";
}

export interface SiteManifest {
  readonly name: string;
  readonly short_name: string;
  readonly description: string;
  readonly start_url: string;
  readonly display: "browser";
  readonly background_color: string;
  readonly theme_color: string;
  readonly icons: ReadonlyArray<SiteManifestIcon>;
}

/**
 * Both icons are `purpose: "any"`. The mark is full-bleed, so an Android
 * maskable crop would cut the pane grid; a padded variant would be a new
 * drawing, not a metadata change.
 */
export const MANIFEST_ICONS: ReadonlyArray<SiteManifestIcon> = [
  {
    src: BRAND_ASSETS.icon192,
    sizes: "192x192",
    type: "image/png",
    purpose: "any",
  },
  {
    src: BRAND_ASSETS.icon512,
    sizes: "512x512",
    type: "image/png",
    purpose: "any",
  },
];

export const manifest = (): SiteManifest => ({
  name: SITE_NAME,
  short_name: SITE_NAME,
  description: SITE_DESCRIPTION,
  start_url: "/",
  display: "browser",
  background_color: themeColors.light.background,
  theme_color: themeColors.light.background,
  icons: MANIFEST_ICONS,
});

/** The document body a handler returns; a trailing newline keeps diffs clean. */
export const renderManifest = (): string =>
  `${JSON.stringify(manifest(), null, 2)}\n`;
