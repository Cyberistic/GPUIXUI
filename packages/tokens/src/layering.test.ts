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
import { decorativeSurfaces } from "./decorative.js";
import * as tokens from "./index.js";
import { darkElevation, lightElevation } from "./elevation.js";
import { darkTheme, highContrastThemes, lightTheme, themes } from "./theme.js";

const doc = readFileSync(
  new URL("../../../docs/tokens.md", import.meta.url),
  "utf8",
);

const designSystem = readFileSync(
  new URL("../../../docs/design-system.md", import.meta.url),
  "utf8",
);

const inventory = readFileSync(
  new URL("../../../COMPONENTS.md", import.meta.url),
  "utf8",
);

/** A source file from `packages/components`, the package that paints overlays. */
const components = (path: string): string =>
  readFileSync(
    new URL(`../../components/src/${path}`, import.meta.url),
    "utf8",
  );

const twRecipes = readFileSync(
  new URL("../../tw/src/recipes.ts", import.meta.url),
  "utf8",
);

const twUtilities = readFileSync(
  new URL("../../tw/src/utilities.ts", import.meta.url),
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

  it("records the decision to keep the reserved level, with its reason", () => {
    expect(
      missing([
        "The slot is kept rather than filled or removed",
        "the key would be a breaking type change",
        "no consumer",
      ]),
      "docs/tokens.md §Layering no longer records why `elevation.overlay` stays reserved",
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

describe("the lift each floating surface paints", () => {
  /**
   * The surface, the recipe it compiles, and the painter that raises it.
   *
   * The bug this guards: `docs/tokens.md` said floating surfaces take
   * `elevation.md` (menus and popovers) or `elevation.lg` (dialogs and command
   * palettes) while `popover.tsx`, `menu/surface.tsx` and `dialog.tsx` all
   * passed `"lg"`, and the three surfaces that really paint `md` — the toast
   * card, the preview card and the navigation-menu panel, whose recipes name
   * `shadow-md` and pass no level — were named nowhere. The page's table was
   * the opposite of the paint in both directions, and nothing read it.
   */
  const floatingSurfaces = [
    {
      surface: "dialog",
      named: "the dialog",
      painter: "dialog.tsx",
      recipe: "DIALOG_CONTENT",
      level: "lg",
    },
    {
      surface: "popover",
      named: "the popover",
      painter: "popover.tsx",
      recipe: "POPOVER_CONTENT",
      level: "lg",
    },
    {
      surface: "menu",
      named: "the menu",
      painter: "menu/surface.tsx",
      recipe: "MENU_CONTENT",
      level: "lg",
    },
    {
      surface: "drawer",
      named: "the drawer",
      painter: "drawer.tsx",
      recipe: "DRAWER_CONTENT",
      level: "lg",
    },
    {
      surface: "toast card",
      named: "the toast card",
      painter: "toast/viewport.tsx",
      recipe: "TOAST_CARD",
      level: "md",
    },
    {
      surface: "preview card",
      named: "the preview card",
      painter: "preview-card.tsx",
      recipe: "PREVIEW_CARD_CONTENT",
      level: "md",
    },
    {
      surface: "navigation-menu panel",
      named: "the navigation-menu panel",
      painter: "navigation-menu.tsx",
      recipe: "NAVIGATION_MENU_CONTENT",
      level: "md",
    },
  ] as const;

  /** The class string `packages/tw/src/recipes.ts` exports under `name`. */
  const recipe = (name: string): string =>
    new RegExp(`export const ${name} =\\s*\\n?\\s*"([^"]*)"`).exec(
      twRecipes,
    )?.[1] ?? "";

  /** The level a Tailwind shadow utility compiles to, read from its compiler. */
  const elevationOf = (utility: string | undefined): string | undefined => {
    const block =
      /const ELEVATION[^=]*= \{([\s\S]*?)\};/.exec(twUtilities)?.[1] ?? "";
    return [...block.matchAll(/(\w+): "(\w+)"/g)].find(
      ([, name]) => name === utility,
    )?.[2];
  };

  /** The level a painter passes to `overlaySurfaceStyle`, if it passes one. */
  const explicitLevel = (
    painter: string,
    recipeName: string,
  ): string | undefined => {
    const source = components(painter);
    const at = source.indexOf(`overlaySurfaceStyle(${recipeName}`);
    if (at < 0) {
      return undefined;
    }
    const call = source.slice(at, source.indexOf(")", at));
    return /"(sm|md|lg|overlay)"/.exec(call)?.[1];
  };

  /** What the surface paints: the level it passes, else its recipe's own lift. */
  const paintedLevel = (surface: (typeof floatingSurfaces)[number]) =>
    explicitLevel(surface.painter, surface.recipe) ??
    elevationOf(/\bshadow-(\w+)/.exec(recipe(surface.recipe))?.[1]);

  it("reads a level from every surface's painter and recipe", () => {
    expect(
      floatingSurfaces.map((surface) => [
        surface.surface,
        paintedLevel(surface),
      ]),
      "a floating surface paints a level its painter or recipe no longer names",
    ).toEqual(
      floatingSurfaces.map((surface) => [surface.surface, surface.level]),
    );
  });

  it("names every floating surface and the level it paints", () => {
    const text = section.replaceAll(/\s+/g, " ");
    const unnamed = floatingSurfaces
      .filter((surface) => !text.includes(surface.named))
      .map((surface) => surface.surface);
    expect(
      unnamed,
      "§Layering no longer names these surfaces, so their lift is undocumented",
    ).toEqual([]);
    expect(
      missing([
        "Floating surfaces take `elevation.lg`",
        "`elevation.md` is the lift a surface keeps from its own recipe",
        "name `shadow-md` and pass no level",
      ]),
      "docs/tokens.md §Layering no longer states the lift a floating surface paints",
    ).toEqual([]);
  });

  it("does not repeat the retracted level table", () => {
    expect(section.replaceAll(/\s+/g, " ")).not.toContain(
      "`elevation.md` (menus and popovers)",
    );
    expect(designSystem.replaceAll(/\s+/g, " ")).not.toContain(
      "`md` for menus and popovers",
    );
  });

  it("draws the same lift table on the design-system page", () => {
    const text = designSystem.replaceAll(/\s+/g, " ");
    expect(
      text,
      "§7 of the design system no longer gives `sm` a named painter",
    ).toContain('`sm` for a card raised with `variant="elevated"`');
    expect(
      text,
      "§7 of the design system no longer names the surfaces that keep `md`",
    ).toContain("the toast card, the preview card, the navigation-menu panel");
    expect(
      text,
      "§7 of the design system no longer names the surfaces that take `lg`",
    ).toContain(
      "`lg` for dialogs (and the command palette, which is one), popovers, menus and the drawer",
    );
  });

  it("names every strip the veil is measured on", () => {
    const strips = [
      ...new Set(
        decorativeSurfaces
          .filter((surface) => surface.surface === "scrim")
          .map((surface) => surface.over),
      ),
    ];
    // The narrower claim the page shipped: the veil was measured on the page's
    // own content strips only, so a modal over an undimmed sidebar passed.
    expect(strips.length).toBeGreaterThan(2);
    expect(
      strips.filter((strip) => !section.includes(`\`${strip}\``)),
      "§Layering prints a veil strip set `decorativeSurfaces` no longer measures",
    ).toEqual([]);
    expect(
      section,
      "§Layering names only two veil strips, the set it shipped before a modal over a sidebar was measured",
    ).not.toContain("`card` and `popover` (`decorative.ts`)");
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
