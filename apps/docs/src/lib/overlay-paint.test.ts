import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Themed lift on the overlay pages.
 *
 * A floating surface's recipe names a `shadow-*` lift and a `ring-*` edge, and
 * `@gpuixui/tw` writes both through the one `boxShadow` slot after applying the
 * ring, so the recipe on its own paints the hairline and **no** lift. The
 * overlay seam composes the theme's level beside the ring the recipe kept;
 * Dialog, Popover and the shared menu surface all name `lg`, so a brand's own
 * `elevation.lg` is what a reader sees. The curated pages had no theming note
 * at all, and the earlier rewrite left the surface's fixed corner (32px for the
 * dialog, 24px for the popover and the menus) invisible beside a preview whose
 * corner follows the platform's radius.
 */

const repo = new URL("../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, repo), "utf8");

const recipes = read("packages/tw/src/recipes.ts");
const utilities = read("packages/tw/src/utilities.ts");

/** One overlay page and the painter its surface comes from. */
interface Overlay {
  readonly page: string;
  readonly painter: string;
  /** The `@gpuixui/tw` recipe the painter compiles. */
  readonly recipe: string;
  /** The radius step the recipe names, e.g. `4xl` for `rounded-4xl`. */
  readonly step: string;
}

const overlays: ReadonlyArray<Overlay> = [
  {
    page: "dialog.mdx",
    painter: "packages/components/src/dialog.tsx",
    recipe: "DIALOG_CONTENT",
    step: "4xl",
  },
  {
    page: "popover.mdx",
    painter: "packages/components/src/popover.tsx",
    recipe: "POPOVER_CONTENT",
    step: "3xl",
  },
  {
    page: "dropdown-menu.mdx",
    painter: "packages/components/src/menu/surface.tsx",
    recipe: "MENU_CONTENT",
    step: "3xl",
  },
  {
    page: "context-menu.mdx",
    painter: "packages/components/src/menu/surface.tsx",
    recipe: "MENU_CONTENT",
    step: "3xl",
  },
];

const page = (name: string): string =>
  read(`apps/docs/content/docs/components/${name}`);

/** The class string a recipe constant holds. */
const recipeOf = (name: string): string => {
  const match = new RegExp(`export const ${name} =\\s*"([^"]+)"`).exec(recipes);
  return match?.[1] ?? "";
};

/** The pixels `rounded-<step>` compiles to, from the compiler's own table. */
const radiusPx = (step: string): number | undefined => {
  const table = /const RADIUS[^{]*\{([\s\S]*?)\}/.exec(utilities)?.[1] ?? "";
  const entry = new RegExp(`"?${step}"?:\\s*(\\d+)`).exec(table);
  return entry === null ? undefined : Number(entry[1]);
};

/** The elevation level the painter hands the overlay seam. */
const levelOf = (source: string, recipe: string): string | undefined =>
  new RegExp(
    `overlaySurfaceStyle\\(\\s*${recipe},\\s*className,\\s*theme,\\s*"([a-z]+)"\\s*\\)`,
  ).exec(source)?.[1];

describe("the overlay pages' theming notes", () => {
  it("paints the theme's lift beside the ring, and says so", () => {
    // The seam is what makes the note true: the recipe's ring consumed the one
    // shadow slot, so the level is composed beside it rather than replacing it.
    const seam = read("packages/components/src/internal/overlay.ts");
    expect(seam).toContain("elevationShadow(theme, level)");
    expect(seam).toContain("boxShadow: [shadow, ...painted]");

    expect(
      overlays.flatMap((overlay) => {
        const source = read(overlay.painter);
        const level = levelOf(source, overlay.recipe);
        const text = page(overlay.page).toLowerCase();

        return level === "lg" && text.includes("elevation.lg")
          ? []
          : [`${overlay.page}: level ${String(level)}`];
      }),
    ).toEqual([]);
  });

  it("names the fixed corner its own recipe carries, not the platform's", () => {
    // The preview's corner follows the platform switch; the shipped one is the
    // recipe's fixed step. A page that prints the platform's corner teaches the
    // drawing instead of the component.
    expect(
      overlays.flatMap((overlay) => {
        const classes = recipeOf(overlay.recipe);
        const px = radiusPx(overlay.step);
        const text = page(overlay.page);

        const painted = classes.includes(`rounded-${overlay.step}`);
        const printed = px !== undefined && text.includes(`**${px}px**`);

        return painted && printed ? [] : [`${overlay.page}: ${overlay.step}`];
      }),
    ).toEqual([]);

    // The dialog and the menus are deliberately different sizes, so the claim
    // cannot pass by every page printing one number.
    expect(new Set(overlays.map((overlay) => overlay.step)).size).toBe(2);
  });

  it("keeps the preview the approximation and the box the shipped fact", () => {
    expect(
      overlays.flatMap((overlay) => {
        const text = page(overlay.page).toLowerCase();
        const says =
          text.includes("preview") &&
          text.includes("approximation") &&
          text.includes("ring");
        return says ? [] : [overlay.page];
      }),
    ).toEqual([]);
  });

  it("refuses the retracted claim that the surface has no lift", () => {
    const retracted = ["no lift", "no elevation", "no shadow"];

    expect(
      overlays.flatMap((overlay) => {
        const text = page(overlay.page).toLowerCase();
        return retracted.filter((phrase) => text.includes(phrase));
      }),
    ).toEqual([]);
  });
});
