/**
 * Holds `docs/tokens.md` §Layering to the model it promises and to the package.
 *
 * The bug this guards: layering is the one part of the design system that is
 * *not* a token — the runtime has no `zIndex`, so paint order is tree order and
 * the contract lives in prose. Nothing read that prose, so the section could
 * disappear, a numeric `z` scale could be added to the package (a token the
 * renderer would ignore), a layer could name a surface the inventory no longer
 * ships, or the reserved empty `overlay` elevation level could be confused with
 * the `overlay` scrim role again, and every test stayed green.
 *
 * `node:fs` is deliberate, as in `docs.test.ts`, `inventory.test.ts` and
 * `design-system-docs.test.ts`: this checks the repository's own Markdown, and
 * the package keeps zero runtime dependencies (no `effect`, so no `FileSystem`
 * service to inject).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as tokens from "./index.js";
import { darkElevation, lightElevation } from "./elevation.js";
import { darkTheme, highContrastThemes, lightTheme, themes } from "./theme.js";

const doc = readFileSync(
  new URL("../../../docs/tokens.md", import.meta.url),
  "utf8",
);

const inventory = readFileSync(
  new URL("../../../COMPONENTS.md", import.meta.url),
  "utf8",
);

/**
 * The `## Layering` section, from its heading to the next one. A missing
 * heading yields an empty string, so every statement check fails by name rather
 * than by a thrown index.
 */
const section = ((): string => {
  const start = doc.indexOf("\n## Layering\n");
  if (start < 0) {
    return "";
  }
  const next = doc.indexOf("\n## ", start + 1);
  return next < 0 ? doc.slice(start) : doc.slice(start, next);
})();

/** The five layers in mounting order, as the page must name them. */
const layerOrder = [
  "**inline**",
  "**anchored**",
  "**tip**",
  "**modal**",
  "**notice**",
] as const;

/** The surface each layer names, and the `COMPONENTS.md` row it belongs to. */
const surfaces = [
  { named: "DropdownMenu", row: "Dropdown menus" },
  { named: "Popover", row: "Popovers" },
  { named: "Tooltip", row: "Tooltips" },
  { named: "Dialog", row: "Dialogs" },
  { named: "ToastViewport", row: "Toasts / notifications" },
] as const;

/** The statements from `wanted` the page no longer carries, whitespace-normalised. */
const missing = (wanted: ReadonlyArray<string>): ReadonlyArray<string> => {
  const text = section.replaceAll(/\s+/g, " ");
  return wanted.filter((statement) => !text.includes(statement));
};

describe("docs/tokens.md §Layering", () => {
  it("names the five layers in mounting order", () => {
    const positions = layerOrder.map((layer) => section.indexOf(layer));
    const ordered = positions.every(
      (at, index) =>
        at > -1 && (index === 0 || at > (positions[index - 1] ?? -1)),
    );
    expect(
      ordered,
      `§Layering names its layers out of order: ${layerOrder.join(" → ")}`,
    ).toBe(true);
  });

  it("names surfaces the inventory ships", () => {
    surfaces.forEach(({ named, row }) => {
      expect(
        inventory,
        `COMPONENTS.md has no "${row}" row for §Layering to name`,
      ).toContain(`| ${row} |`);
      expect(section, `§Layering no longer names ${named}`).toContain(named);
    });
  });

  it("records the runtime's one stacking rule and the absence of a z scale", () => {
    expect(
      missing([
        "paint order is tree order",
        "no `z` scale and no stacking token",
        "has no `zIndex` field",
        "library code never writes against it",
      ]),
      "docs/tokens.md §Layering no longer states these",
    ).toEqual([]);
  });

  it("records the topmost-layer dismissal rule", () => {
    expect(
      missing([
        "packages/components/src/internal/dismiss-layer.ts",
        "**topmost** layer only",
        "one keystroke cannot close two surfaces",
      ]),
      "docs/tokens.md §Layering no longer states these",
    ).toEqual([]);
  });

  it("separates the scrim role from the reserved elevation level", () => {
    expect(
      missing([
        "`overlay` is the **modal scrim colour**",
        "`elevation.overlay` is a **reserved, empty elevation level**",
        '`elevationShadow(theme, "overlay")` returns `undefined`',
      ]),
      "docs/tokens.md §Layering no longer states these",
    ).toEqual([]);
  });

  it("keeps the reserved level empty in every shipped theme", () => {
    // The page's claim is only true while the level paints nothing; a theme
    // that filled it without the section moving would be a silent shadow.
    expect(lightElevation.overlay).toEqual([]);
    expect(darkElevation.overlay).toEqual([]);
    [
      lightTheme,
      darkTheme,
      highContrastThemes.light,
      highContrastThemes.dark,
    ].forEach((theme) => {
      expect(
        theme.elevation.overlay,
        `${theme.name} now lifts with the reserved overlay level; §Layering and the elevation table must say so`,
      ).toEqual([]);
    });
    expect(themes.light.elevation.overlay).toEqual([]);
  });
});

describe("the package ships no stacking token", () => {
  it("exports nothing that looks like a z scale", () => {
    const names = Object.keys(tokens);
    expect(names.length).toBeGreaterThan(20);
    const stacking = names.filter((name) =>
      /^(z|zIndex|zScale|layer)/i.test(name),
    );
    expect(
      stacking,
      "layering is paint order; a numeric z token would be a token the runtime ignores",
    ).toEqual([]);
  });

  it("carries no stacking key on a theme", () => {
    [lightTheme, darkTheme].forEach((theme) => {
      const keys = Object.keys(theme);
      expect(keys.filter((key) => /^z/i.test(key))).toEqual([]);
      // The scrim is a colour role, not a weight.
      expect(theme.colors.overlay).toMatch(/^#[0-9A-F]{6}[0-9A-F]{2}$/i);
    });
  });
});
