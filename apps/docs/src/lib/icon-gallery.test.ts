import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ICON_NAMES, icons } from "@gpuixui/icons";
import {
  filterIcons,
  galleryIcons,
  galleryMarkup,
  reservedPaint,
} from "./icon-gallery";

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
    const moved = galleryIcons.filter(
      ({ name, markup }) =>
        markup.replace('stroke="currentColor"', reservedPaint) !== icons[name],
    );

    expect(moved).toEqual([]);
    expect(galleryMarkup(icons.warning)).not.toBe(icons.warning);
  });

  it("reserves exactly one paint per icon, so no glyph stays black", () => {
    const doubled = ICON_NAMES.filter(
      (name) => icons[name].split(reservedPaint).length - 1 !== 1,
    );

    expect(doubled).toEqual([]);
    expect(
      galleryIcons.filter(({ markup }) => markup.includes(reservedPaint)),
    ).toEqual([]);
  });

  it("reads the set from the package's public entry, not its internals", () => {
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
