import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";
import { themeColors } from "./docs-theme";
import { isPng, pngSize } from "./png.testing";
import { MANIFEST_ICONS, renderManifest } from "./site-manifest";
import {
  BRAND_ASSETS,
  MANIFEST_PATH,
  SITE_DESCRIPTION,
  SITE_NAME,
  siteHead,
} from "./site-head";

/**
 * Guards the install metadata (plan 516).
 *
 * The head shipped an SVG-only icon and no manifest, so a Safari tab had no
 * identity and no phone home screen had a name. These tests read the document
 * the route emits and the pixels it names: a manifest that stops decoding, an
 * icon whose real size disagrees with its declared `sizes`, a colour that drifts
 * from the palette, or a head that loses the manifest link each fail by name.
 * `scripts/smoke-build.ts` then proves the route and the assets answer in the
 * built site.
 */

class ManifestIcon extends Schema.Class<ManifestIcon>("ManifestIcon")({
  src: Schema.String,
  sizes: Schema.String,
  type: Schema.Literal("image/png"),
  purpose: Schema.Literal("any"),
}) {}

class Manifest extends Schema.Class<Manifest>("Manifest")({
  name: Schema.String,
  short_name: Schema.String,
  description: Schema.String,
  start_url: Schema.String,
  display: Schema.Literal("browser"),
  background_color: Schema.String,
  theme_color: Schema.String,
  icons: Schema.Array(ManifestIcon),
}) {}

const decodeManifest = Schema.decodeUnknownSync(
  Schema.fromJsonString(Manifest),
);

const publicDirectory = fileURLToPath(
  new URL("../../public/", import.meta.url),
);

const assetFile = (url: string): string =>
  join(publicDirectory, url.replace(/^\//, ""));

const sizeOf = (sizes: string): { width: number; height: number } => {
  const [width, height] = sizes.split("x").map(Number);
  return { width: width ?? 0, height: height ?? 0 };
};

describe("site manifest", () => {
  it("emits a document a browser can read", () => {
    const manifest = decodeManifest(renderManifest());

    expect(manifest.name).toBe(SITE_NAME);
    expect(manifest.short_name).toBe(SITE_NAME);
    expect(manifest.description).toBe(SITE_DESCRIPTION);
    expect(manifest.start_url).toBe("/");
    // No service worker ships, so a standalone display would be a false claim.
    expect(manifest.display).toBe("browser");
  });

  it("ships every icon it names at the size it declares", () => {
    expect(MANIFEST_ICONS.length).toBeGreaterThanOrEqual(2);

    for (const icon of MANIFEST_ICONS) {
      const path = assetFile(icon.src);
      expect(existsSync(path), icon.src).toBe(true);
      expect(isPng(path), `${icon.src} is not a PNG`).toBe(true);
      expect(pngSize(path), icon.src).toEqual(sizeOf(icon.sizes));
    }
  });

  it("takes both colours from the light palette the shortcut opens in", () => {
    const manifest = decodeManifest(renderManifest());

    expect(manifest.background_color).toBe(themeColors.light.background);
    expect(manifest.theme_color).toBe(themeColors.light.background);
    expect(manifest.background_color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("links the manifest and a raster fallback from every page", () => {
    const head = siteHead("/assets/app.css");
    const icons = head.links.filter((link) => link.rel === "icon");

    expect(icons.map((link) => [link.type, link.href, link.sizes])).toEqual([
      ["image/svg+xml", BRAND_ASSETS.mark, "any"],
      ["image/png", BRAND_ASSETS.favicon, "32x32"],
    ]);
    expect(
      head.links.filter((link) => link.rel === "manifest").map((l) => l.href),
    ).toEqual([MANIFEST_PATH]);
  });

  it("names the application for the browser and the iOS home screen", () => {
    const metas = siteHead("/assets/app.css").meta.flatMap((entry) =>
      "name" in entry ? [[entry.name, entry.content] as const] : [],
    );

    expect(metas).toContainEqual(["application-name", SITE_NAME]);
    expect(metas).toContainEqual(["apple-mobile-web-app-title", SITE_NAME]);
  });
});
