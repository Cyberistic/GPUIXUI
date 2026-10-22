/**
 * The Card page's paint claims, held to the recipe it documents.
 *
 * The bug these guard: `docs/card.mdx` said `elevated` painted the `md`
 * elevation and that colour, spacing, radius and type all came from the theme.
 * The compiled recipe says otherwise — the lift is `elevation.sm`, and the
 * metrics are the default registry's fixed shadcn steps, so a theme's `radius`
 * and `density` never reshape a card. It also had to be settled which role the
 * outline edge paints: the recipe reads `border-input`, but `@gpuixui/tw`
 * resolves that class to the **`border` role** — shadcn's `--input` names a
 * border, while this library's `input` role is the field fill — so a page that
 * read the class name literally taught a surface the renderer never paints.
 *
 * The footer's missing bottom padding is held too: `CARD_FOOTER` is `px-3 pt-3`,
 * so a control in a default footer sits on the card's bottom edge and the page
 * has to name the override a caller needs.
 *
 * `node:fs` is a test-time repository read, the boundary `docs.test.ts` and
 * `inventory.test.ts` already use.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { platformTheme } from "@gpuixui/tokens";
import {
  CARD_BASE,
  CARD_DESCRIPTION,
  CARD_FOOTER,
  CARD_TITLE,
  CARD_VARIANTS,
  classesToStyle,
  cn,
} from "@gpuixui/tw";
import { describe, expect, it } from "vitest";
import { recipeStyle } from "./internal/recipe.js";
import { darkTheme, elevationShadow, lightTheme } from "./internal/theme.js";

const page = readFileSync(
  fileURLToPath(new URL("../docs/card.mdx", import.meta.url)),
  "utf8",
);

/** The compiled surface of one card recipe. */
const surface = (recipe: string, theme = lightTheme) =>
  recipeStyle(cn(CARD_BASE, recipe), theme);

/** One page section, without the heading that follows it. */
const section = (heading: string): string => {
  const start = page.indexOf(`\n${heading}\n`);
  expect(start).toBeGreaterThanOrEqual(0);
  const rest = page.slice(start + heading.length + 1);
  const end = rest.indexOf("\n## ");
  return end < 0 ? rest : rest.slice(0, end);
};

describe("the Card page", () => {
  it("paints the outline edge in the border role the compiler resolves", () => {
    const style = surface(CARD_VARIANTS.outline);

    // The premise: the two roles are different colours, and the compiler maps
    // the recipe's `border-input` to `border` — our `input` role is the field
    // fill, which is the card's own white.
    expect(lightTheme.colors.input).not.toBe(lightTheme.colors.border);
    expect(style.borderColor).toBe(lightTheme.colors.border);
    expect(style.borderWidth).toBe(lightTheme.borderWidth.thin);

    const table = section("## Variants");
    expect(table).toContain("border-input");
    expect(table).toContain("`border` role");
    expect(table).not.toContain("in the `input` role");
  });

  it("lifts the elevated variant at elevation.sm, not md", () => {
    const style = surface(CARD_VARIANTS.elevated);

    // The premise: the two levels paint different shadows, so the old `md`
    // named a lift this surface does not have.
    expect(elevationShadow(lightTheme, "sm")).not.toEqual(
      elevationShadow(lightTheme, "md"),
    );
    expect(style.boxShadow).toEqual(elevationShadow(lightTheme, "sm"));

    const table = section("## Variants");
    expect(table).toContain("shadow-sm");
    expect(table).toContain("elevation.sm");
    expect(table).not.toContain("elevation.md");
  });

  it("keeps the recipe's fixed metrics on every platform", () => {
    const mac = platformTheme(lightTheme, "darwin");
    const style = surface(CARD_VARIANTS.outline, mac);

    // The premise: macOS ships a 10px `lg`, so a card that read `radius.lg`
    // would round to 10 there. It stays on the registry's 8px step.
    expect(mac.radius.lg).not.toBe(8);
    expect(style.borderRadius).toBe(8);

    const text = section("## Theming");
    expect(text).toContain("ADR 0006");
    expect(text).toContain("8px");
    expect(text).not.toContain("radius.lg");
  });

  it("states the fixed type steps the title and description paint", () => {
    const title = recipeStyle(CARD_TITLE, lightTheme);
    const description = recipeStyle(CARD_DESCRIPTION, lightTheme);

    expect(title.fontSize).toBe(16);
    expect(title.lineHeight).toBe(24);
    expect(title.fontWeight).toBe(600);
    expect(title.color).toBe(lightTheme.colors.foreground);
    expect(description.fontSize).toBe(14);
    expect(description.lineHeight).toBe(20);
    expect(description.color).toBe(lightTheme.colors.mutedForeground);

    // The page teaches the step, not the theme role it happens to equal in the
    // base theme: `textStyle("h3")` is the base palette's 16/24/600, not what a
    // card reads, so a brand's type scale would never reach it.
    const text = section("## Theming");
    expect(text).toContain("16/24, weight 600");
    expect(text).toContain("14/20");
    expect(text).toContain("`foreground`");
    expect(text).toContain("`mutedForeground`");
    expect(text).not.toContain('textStyle("h3")');
  });

  it("names the footer's missing bottom padding and the override", () => {
    const footer = recipeStyle(CARD_FOOTER, lightTheme);

    // The premise: the recipe gives the footer no bottom edge padding.
    expect(footer.paddingTop).toBe(12);
    expect(footer.paddingBottom).toBeUndefined();

    expect(page).toContain("no bottom padding");
    expect(page).toContain('className="pb-3"');
  });

  it("holds the elevated lift to the shadow role the theme tints", () => {
    const light = surface(CARD_VARIANTS.elevated, lightTheme);
    const dark = surface(CARD_VARIANTS.elevated, darkTheme);

    // The theme owns the tint: the same geometry in two palettes is two colours.
    expect(light.boxShadow).not.toEqual(dark.boxShadow);
    expect(surface(CARD_VARIANTS.plain).boxShadow).toBeUndefined();
  });

  it("reads both themes' card fill", () => {
    expect(surface(CARD_VARIANTS.outline).backgroundColor).toBe(
      lightTheme.colors.card,
    );
    expect(surface(CARD_VARIANTS.outline, darkTheme).backgroundColor).toBe(
      darkTheme.colors.card,
    );
  });

  it("quotes the recipes the package compiles", () => {
    // A guard on the guard: the page cannot pass by naming a treatment the
    // package does not compile, and `border-input`'s remap is asserted on the
    // compiler rather than on the package's cached seam.
    expect(CARD_VARIANTS.outline).toBe("border border-input");
    expect(CARD_VARIANTS.elevated).toBe("shadow-sm");
    expect(
      classesToStyle(CARD_VARIANTS.outline, lightTheme).style.borderColor,
    ).toBe(lightTheme.colors.border);
  });
});
