import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const repo = new URL("../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, repo), "utf8");

const recipes = read("packages/tw/src/recipes.ts");

interface Overlay {
  readonly page: string;
  readonly painter: string;

  readonly recipe: string;

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

const recipeOf = (name: string): string => {
  const match = new RegExp(`export const ${name} =\\s*"([^"]+)"`).exec(recipes);
  return match?.[1] ?? "";
};

describe("the overlay pages' theming notes", () => {
  it("paints the theme's lift beside the ring", () => {
    const seam = read("packages/components/src/internal/overlay.ts");
    expect(seam).toContain("elevationShadow(theme, level)");
    expect(seam).toContain("boxShadow: [shadow, ...painted]");
  });

  it("names the fixed corner its own recipe carries", () => {
    expect(
      overlays.filter(
        (overlay) =>
          !recipeOf(overlay.recipe).includes(`rounded-${overlay.step}`),
      ),
    ).toEqual([]);

    expect(new Set(overlays.map((overlay) => overlay.step)).size).toBe(2);
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
