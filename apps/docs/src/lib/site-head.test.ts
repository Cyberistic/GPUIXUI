import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { themeColors } from "./docs-theme";
import { isPng, pngSize } from "./png.testing";
import {
  BRAND_ASSETS,
  MANIFEST_PATH,
  siteHead,
  SOCIAL_CARD,
  THEME_COLOR_META,
} from "./site-head";

/**
 * Guards the document head and the brand assets it names (plan 510).
 *
 * The built-site crawl proves the tags reach a production page, but it cannot
 * see the pixels behind them or tell a hand-copied colour from the palette. The
 * failures this catches are the ones the crawl passes: a social card that is
 * 64×64 while the head declares 1200×630, a `theme-color` that repeats the
 * light background for both schemes, a mark that quietly becomes a third-party
 * asset or a font-dependent wordmark, and a renamed file the head still names.
 */

const publicDirectory = fileURLToPath(
  new URL("../../public/", import.meta.url),
);

const assetFile = (url: string): string =>
  join(publicDirectory, url.replace(/^\//, ""));

interface FlatMeta {
  readonly name?: string | undefined;
  readonly property?: string | undefined;
  readonly content?: string | undefined;
}

/** The head's meta entries as one shape; entries without `content` stay blank. */
const flatMeta = (head: ReturnType<typeof siteHead>): ReadonlyArray<FlatMeta> =>
  head.meta.flatMap((entry) => [
    {
      name: "name" in entry ? entry.name : undefined,
      property: "property" in entry ? entry.property : undefined,
      content: "content" in entry ? entry.content : undefined,
    },
  ]);

describe("site head", () => {
  it("names brand assets that exist in public/", () => {
    for (const [name, url] of Object.entries(BRAND_ASSETS)) {
      expect(existsSync(assetFile(url)), `${name} → ${url}`).toBe(true);
    }
  });

  it("draws the mark from geometry, not a font or a borrowed image", () => {
    const mark = readFileSync(assetFile(BRAND_ASSETS.mark), "utf8");
    expect(mark.startsWith("<svg")).toBe(true);
    expect(mark).toContain('viewBox="0 0 64 64"');
    expect(mark.includes("<image")).toBe(false);
    expect(mark.includes("<text")).toBe(false);
    expect(/href="https?:/.test(mark)).toBe(false);
  });

  it("ships a social card with the pixel size the head declares", () => {
    expect(isPng(assetFile(BRAND_ASSETS.socialCard))).toBe(true);
    expect(pngSize(assetFile(BRAND_ASSETS.socialCard))).toEqual({
      width: SOCIAL_CARD.width,
      height: SOCIAL_CARD.height,
    });
  });

  it("ships an apple-touch icon at the size iOS masks", () => {
    expect(isPng(assetFile(BRAND_ASSETS.touchIcon))).toBe(true);
    expect(pngSize(assetFile(BRAND_ASSETS.touchIcon))).toEqual({
      width: 180,
      height: 180,
    });
  });

  it("declares the description, social card and icon once each", () => {
    const head = siteHead("/assets/app.css");
    const meta = flatMeta(head);
    const named = (key: string) => meta.filter((entry) => entry.name === key);
    const property = (key: string) =>
      meta.filter((entry) => entry.property === key);

    expect(named("description")[0]?.content?.trim()).not.toBe("");
    expect(property("og:site_name")[0]?.content).toBe("GPUIXUI");
    expect(named("color-scheme")[0]?.content).toBe("light dark");

    const images = property("og:image");
    expect(images).toHaveLength(1);
    const image = images[0]?.content ?? "";
    expect(new URL(image).pathname).toBe(BRAND_ASSETS.socialCard);
    expect(property("og:image:width")[0]?.content).toBe(`${SOCIAL_CARD.width}`);
    expect(property("og:image:height")[0]?.content).toBe(
      `${SOCIAL_CARD.height}`,
    );
    expect(property("og:image:alt")[0]?.content).toBe(SOCIAL_CARD.alt);

    expect(named("twitter:card")[0]?.content).toBe("summary_large_image");
    expect(new URL(named("twitter:image")[0]?.content ?? "").pathname).toBe(
      BRAND_ASSETS.socialCard,
    );

    const icons = head.links.filter((link) => link.rel === "icon");
    expect(icons.map((icon) => [icon.type, icon.href, icon.sizes])).toEqual([
      ["image/svg+xml", BRAND_ASSETS.mark, "any"],
      ["image/png", BRAND_ASSETS.favicon, "32x32"],
    ]);
    expect(head.links.filter((link) => link.rel === "stylesheet")).toHaveLength(
      1,
    );
    expect(
      head.links.find((link) => link.rel === "apple-touch-icon")?.href,
    ).toBe(BRAND_ASSETS.touchIcon);
    expect(head.links.find((link) => link.rel === "manifest")?.href).toBe(
      MANIFEST_PATH,
    );
  });

  it("ships a raster tab icon for browsers that ignore an SVG favicon", () => {
    expect(isPng(assetFile(BRAND_ASSETS.favicon))).toBe(true);
    expect(pngSize(assetFile(BRAND_ASSETS.favicon))).toEqual({
      width: 32,
      height: 32,
    });
  });

  it("paints the browser chrome with the theme each scheme shows", () => {
    expect(THEME_COLOR_META.map((entry) => entry.media)).toEqual([
      "(prefers-color-scheme: light)",
      "(prefers-color-scheme: dark)",
    ]);
    expect(THEME_COLOR_META.map((entry) => entry.content)).toEqual([
      themeColors.light.background,
      themeColors.dark.background,
    ]);

    // TanStack keeps one meta per `name`, so these two must stay out of the
    // route head; putting them back would silently drop the light one.
    expect(
      flatMeta(siteHead("/assets/app.css")).filter(
        (entry) => entry.name === "theme-color",
      ),
    ).toEqual([]);
  });
});
