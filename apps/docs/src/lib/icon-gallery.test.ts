import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ICON_NAMES, icons } from "@gpuixui/icons";
import {
  filterIcons,
  galleryIcons,
  galleryMarkup,
  reservedPaint,
} from "./icon-gallery";

/**
 * The icon gallery's model.
 *
 * The gallery is only honest if it draws the package's own geometry: a glyph
 * redrawn by hand looks right and ships the wrong shape. These cases hold the
 * entries to `@gpuixui/icons`, both ways — an icon added to the set without a
 * tile fails, and a tile whose markup is not the shipped string fails — and to
 * the one edit the browser needs, the paint.
 */

describe("the gallery's entries", () => {
  it("carries every icon the set publishes, once each", () => {
    expect(galleryIcons.map(({ name }) => name)).toEqual([...ICON_NAMES]);
    expect(new Set(galleryIcons.map(({ name }) => name)).size).toBe(
      ICON_NAMES.length,
    );
  });

  it("draws the geometry the package ships", () => {
    const wrong = galleryIcons.filter(
      ({ name, markup }) =>
        markup !== icons[name].replace(reservedPaint, 'stroke="currentColor"'),
    );

    expect(wrong).toEqual([]);
  });

  it("changes the paint and nothing else", () => {
    // Restoring the reserved stroke has to give back the shipped string byte for
    // byte: a transform that also moved a `d` attribute would still render.
    const moved = galleryIcons.filter(
      ({ name, markup }) =>
        markup.replace('stroke="currentColor"', reservedPaint) !== icons[name],
    );

    expect(moved).toEqual([]);
    expect(galleryMarkup(icons.warning)).not.toBe(icons.warning);
  });

  it("reserves exactly one paint per icon, so no glyph stays black", () => {
    // `replace` swaps the first match. An icon whose geometry carried its own
    // `stroke="#000"` would keep it and paint black on a dark page.
    const doubled = ICON_NAMES.filter(
      (name) => icons[name].split(reservedPaint).length - 1 !== 1,
    );

    expect(doubled).toEqual([]);
    expect(
      galleryIcons.filter(({ markup }) => markup.includes(reservedPaint)),
    ).toEqual([]);
  });

  it("reads the set from the package's public entry, not its internals", () => {
    // The gallery is a consumer: it imports `@gpuixui/icons`, the entry a product
    // imports, so a renamed export breaks the site at type-check instead of a
    // hand-kept path reading a module the package no longer publishes. The
    // published `.tsx` files pin the GPUix JSX runtime, which is what lets the
    // root (`Icon` included) type-check in this React program.
    //
    // The check reads the **name inside the export list**, not the list's exact
    // text: the index adds a sibling to a module's `export { … }` whenever the
    // package grows, and a string match for the previous list failed the gallery
    // while both names were still published.
    const gallery = readFileSync(
      new URL("./icon-gallery.ts", import.meta.url),
      "utf8",
    );

    expect(gallery).toContain('from "@gpuixui/icons"');
    expect(gallery).not.toMatch(
      /packages\/icons\/src|"\.\/names\.js"|"\.\/registry\.js"/,
    );

    const index = readFileSync(
      new URL("../../../../packages/icons/src/index.ts", import.meta.url),
      "utf8",
    );
    const publishes = (name: string, module: string): boolean =>
      new RegExp(
        `export\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*"${module}"`,
      ).test(index);

    expect(publishes("ICON_NAMES", "./names.js")).toBe(true);
    expect(publishes("icons", "./registry.js")).toBe(true);
    expect(publishes("IconName", "./names.js")).toBe(false);
    expect(index).toMatch(
      /export\s+type\s*\{[^}]*\bIconName\b[^}]*\}\s*from\s*"\.\/names\.js"/,
    );
  });
});

describe("the gallery's filter", () => {
  it("keeps the whole set for an empty query", () => {
    expect(filterIcons(galleryIcons, "")).toEqual(galleryIcons);
    expect(filterIcons(galleryIcons, "   ")).toEqual(galleryIcons);
  });

  it("matches a name, in any case, with the surrounding space ignored", () => {
    expect(
      filterIcons(galleryIcons, " PANEL ").map(({ name }) => name),
    ).toEqual(["panel-bottom", "panel-left", "panel-right"]);
    expect(filterIcons(galleryIcons, "arrow").map(({ name }) => name)).toEqual([
      "arrow-down",
      "arrow-left",
      "arrow-right",
      "arrow-up",
    ]);
  });

  it("answers no icon for a name the set does not carry", () => {
    expect(filterIcons(galleryIcons, "not-an-icon")).toEqual([]);
  });
});
