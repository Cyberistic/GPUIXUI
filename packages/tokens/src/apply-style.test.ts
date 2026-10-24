/**
 * Guards the style seam a stored platform file reaches.
 *
 * The defect this closes: a platform style is documented as copyable, editable
 * and shippable — "take one platform theme file, edit it, and ship your own
 * look" — so the value a consumer applies is often a file its boundary decoded.
 * `applyStyle` read only the authored `PlatformStyle`: every group was a direct
 * read, the label was interpolated unconditionally, and the style's contrast
 * label was compared word for word with the base's. Measured on 2026-10-24
 * against a JSON round-trip of `platformStyles.darwin`, three ways at once —
 *
 *   - a style that lost its `contrast` label kept its radii, families and
 *     density and **silently dropped its palette** (a stored red `primary`
 *     resolved to the base dark theme's `#A7A9FF`), because an absent variant
 *     was compared instead of read;
 *   - a style that lost its `colors` group threw
 *     `TypeError: Cannot read properties of null (reading 'dark')` from the
 *     first style a window applied;
 *   - a style that lost its `label` named the theme `Dark · null`, which a
 *     preview header printed.
 *
 * Reading only the authored shape also meant the stored route could not be
 * written without the assertion `AGENTS.md` §2 forbids: `colors` is required and
 * `label`/`contrast` are unions, so a decoded file reached `applyStyle` only by
 * casting. The seam takes `PlatformStyleSource` now — the authored table is a
 * member — a group the style lost keeps the base's, a family is read as a name,
 * and a style that states no variant is read as `default`, the variant every
 * shipped style declares, while a high-contrast base still keeps its own palette.
 *
 * `node:fs` is deliberate, as in `docs.test.ts`: this reads the repository's own
 * Markdown, and the package keeps zero runtime dependencies.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyStyle, highContrastThemes, themes, type Theme } from "./theme.js";
import {
  platformStyles,
  systemUiFont,
  type PlatformStyle,
  type PlatformStyleSource,
} from "./platforms.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

/** A page's prose with its line wrapping removed, so a sentence reads whole. */
const flat = (text: string): string => text.replace(/\s+/g, " ");

const catalogue = flat(read("../../../docs/tokens.md"));
const designSystem = flat(read("../../../docs/design-system.md"));
const readme = flat(read("../README.md"));
const seam = flat(read("./theme.ts"));

/** The macOS table as the authored `PlatformStyle` it ships as. */
const darwin: PlatformStyle = platformStyles.darwin;

/**
 * A copy of the table as a store hands it back: the authored style with the
 * groups and names a decoder wrote over.
 */
const stored = (overrides: PlatformStyleSource): PlatformStyleSource => ({
  ...darwin,
  ...overrides,
});

/** The colour a themed role paints, read through the seam a control uses. */
const paintedOn = (
  theme: Theme,
  role: "primary" | "background",
): string | undefined => theme.colors[role];

describe("a platform style a store hands back", () => {
  it("applies the authored table exactly as it ships", () => {
    // The positive control: `PlatformStyle` is a member of the stored shape, so
    // a style written as a TypeScript literal reads exactly as it always did.
    const resolved = applyStyle(themes.dark, darwin);

    expect(paintedOn(resolved, "primary")).toBe(darwin.colors.dark?.primary);
    expect(paintedOn(resolved, "background")).toBe(
      darwin.colors.dark?.background,
    );
    expect(resolved.radius.lg).toBe(darwin.radius.lg);
    expect(resolved.density.name).toBe(darwin.density);
    expect(resolved.name).toBe(`${themes.dark.name} · ${darwin.label}`);
    expect(resolved.switch).toEqual(darwin.switch?.dark);
    expect(resolved.switchMetrics).toEqual(darwin.switchMetrics);
  });

  it("keeps the palette of a style that lost its contrast label", () => {
    // The stored label is the absence JSON writes, and the palette the style
    // still carries must land: an absent variant is the default one.
    const lostLabel = stored({
      contrast: null,
      colors: {
        ...darwin.colors,
        dark: { ...darwin.colors.dark, primary: "#FF0000" },
      },
    });
    const resolved = applyStyle(themes.dark, lostLabel);

    expect(paintedOn(resolved, "primary")).toBe("#FF0000");
    // The base's own labels are kept — a style never moves a theme's variant.
    expect(resolved.contrast).toBe(themes.dark.contrast);
    // A label this release does not ship names no variant either, so it is the
    // same absence rather than the strict one.
    expect(
      paintedOn(
        applyStyle(themes.dark, stored({ contrast: "HIGH" })),
        "primary",
      ),
    ).toBe(darwin.colors.dark?.primary);
    // Accessibility still outranks the look: a high-contrast base keeps its own
    // palette, whether or not the style states a variant.
    const high = applyStyle(
      highContrastThemes.dark,
      stored({ colors: { ...darwin.colors, dark: { primary: "#FF0000" } } }),
    );

    expect(paintedOn(high, "primary")).toBe(
      highContrastThemes.dark.colors.primary,
    );
  });

  it("keeps the base's groups when the style lost them, instead of throwing", () => {
    // `colors: null` is a store's "carried no colour edits". Reading the group
    // directly threw `TypeError: Cannot read properties of null (reading 'dark')`
    // out of the first style a window applied.
    const lostGroups = stored({
      colors: null,
      radius: null,
      density: null,
      switchMetrics: null,
      switch: null,
    });
    const resolved = applyStyle(themes.dark, lostGroups);

    expect(paintedOn(resolved, "background")).toBe(
      themes.dark.colors.background,
    );
    expect(resolved.radius.lg).toBe(themes.dark.radius.lg);
    expect(resolved.density).toEqual(themes.dark.density);
    // An authored look that declares no switch clears the base's, and a group
    // the store lost is that same "declares none".
    expect(resolved.switch).toBeUndefined();
    expect(resolved.switchMetrics).toBeUndefined();
    // A group the store dropped (JSON's `undefined`) is the same absence.
    expect(
      paintedOn(
        applyStyle(themes.dark, { ...darwin, colors: undefined }),
        "background",
      ),
    ).toBe(themes.dark.colors.background);
  });

  it("keeps the steps a stored style carries when it lost the rest of a scale", () => {
    // A copy that edits one corner keeps the base's other steps rather than
    // erasing the scale a control reads by name.
    const resolved = applyStyle(themes.dark, stored({ radius: { lg: 20 } }));

    expect(resolved.radius).toEqual({ ...themes.dark.radius, lg: 20 });
  });

  it("names the theme after the base when the style's label is not a name", () => {
    // The name a preview prints: an absent, blank or non-string label leaves the
    // base's name whole instead of printing `Dark · null`.
    const unnamed: ReadonlyArray<unknown> = [null, undefined, "", "  ", 42];
    const names = unnamed.map(
      (label) => applyStyle(themes.dark, stored({ label })).name,
    );

    expect(names).toEqual(unnamed.map(() => themes.dark.name));
    expect(applyStyle(themes.dark, stored({ label: "House" })).name).toBe(
      `${themes.dark.name} · House`,
    );
  });

  it("reads a base whose name is not a name, instead of throwing", () => {
    // A style is applied to a theme a store restored, so the base's own name is
    // a value a decoder wrote. `styleName` trimmed it unguarded, so a numeric
    // name — a design-tool export, an old release's file — threw
    // `TypeError: base.name.trim is not a function` on the first style a window
    // applied, and the window never painted. A value that names nothing is the
    // library's own name.
    //
    // The assertion is the storage boundary, as in the density case below: a
    // theme assembled from a decoded file is unknown input no Theme type can
    // describe, and `applyStyle` is the seat a window hands it to.
    const built = (name: unknown): Theme => ({ ...themes.dark, name }) as Theme;
    const unnamed: ReadonlyArray<unknown> = [JSON.parse("42"), "", "   ", true];
    const names = unnamed.map((name) => applyStyle(built(name), darwin).name);

    expect(names).toEqual(unnamed.map(() => `Theme · ${darwin.label}`));
    // The authored case is unchanged: a theme that names itself keeps its name.
    expect(applyStyle(themes.dark, darwin).name).toBe(
      `${themes.dark.name} · ${darwin.label}`,
    );
  });

  it("keeps the base's face when the style's family is not a name", () => {
    // A family is a name: a decoder that wrote a number or a blank string has
    // named no face. The resolved theme claimed the value — `missingTokens`
    // refuses it as a blank family, so the gate would not pass the theme — while
    // the paint fell back to the library's face: the data and the paint
    // disagreed.
    const baseFace = systemUiFont;
    const resolved = [null, undefined, "", "  ", 42].map((sans) =>
      applyStyle(themes.dark, stored({ sans })),
    );

    expect(themes.dark.typography.sans).toBe(baseFace);
    expect(resolved.map(({ typography }) => typography.sans)).toEqual(
      resolved.map(() => baseFace),
    );
    expect(
      applyStyle(themes.dark, stored({ sans: "Inter" })).typography.sans,
    ).toBe("Inter");
  });

  it("still refuses a density preset this release does not ship", () => {
    // The one value the seam refuses rather than inherits: a name it cannot
    // resolve names no box, so the message names the index and the guard. The
    // cast is the storage boundary — a saved settings row is unknown input.
    const stale = JSON.parse('{"density":"tiny"}') as PlatformStyleSource;

    expect(() => applyStyle(themes.dark, stale)).toThrow(
      "is not a density preset",
    );
  });

  it("teaches the stored style where the platform styles are documented", () => {
    // The claim a consumer acts on: the seam takes the shape a store hands back.
    expect(seam).toContain("style: PlatformStyleSource");
    expect(seam).toContain(
      "const applies = contrast === styleContrastOf(style)",
    );
    const pages: ReadonlyArray<readonly [string, string]> = [
      ["docs/tokens.md", catalogue],
      ["the package README", readme],
    ];
    const missing = pages.flatMap(([page, text]) => [
      ...(text.includes("PlatformStyleSource")
        ? []
        : [`${page} does not name PlatformStyleSource`]),
      ...(text.includes("states no variant")
        ? []
        : [`${page} does not teach the absent variant`]),
    ]);

    expect(missing).toEqual([]);
    expect(
      designSystem.includes("PlatformStyleSource"),
      "docs/design-system.md does not name PlatformStyleSource",
    ).toBe(true);
  });
});
