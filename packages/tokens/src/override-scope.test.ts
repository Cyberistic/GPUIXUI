/**
 * What a theme override actually reaches.
 *
 * A role resolves through the theme in both packages — a recipe's `bg-card` and
 * `text-foreground` are `theme.colors` lookups — but the **numbers** are split:
 * the primitives' recipes resolve height, side, padding, gap and type from the
 * theme, while the components package compiles shadcn's fixed metrics for its
 * resting recipe (ADR 0006) and reads the theme only for the geometry it
 * measures in `style`. A brand that retuned `radius.md` therefore found its
 * primitives rounded differently and every `Card` still at 12px, and neither
 * page said so: `docs/tokens.md` §Theme API and `docs/design-system.md` §11 now
 * record the scope and this suite reads both halves.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const pages = {
  "docs/tokens.md": read("../../../docs/tokens.md").replace(/\s+/g, " "),
  "docs/design-system.md": read("../../../docs/design-system.md").replace(
    /\s+/g,
    " ",
  ),
} as const;

describe("the scope of an override", () => {
  it("resolves a colour through the theme in the shared registry", () => {
    // The half that does reach every component: a utility names a role, and the
    // role is read off the theme the caller passes.
    const utilities = read("../../tw/src/utilities.ts");
    expect(utilities).toContain("const ROLE");
    expect(utilities).toContain("theme.colors[role]");
  });

  it("compiles the components' resting recipe from fixed metrics", () => {
    // The half that does not: shadcn's numbers are the recipe string, so a
    // radius, padding or type step in the theme cannot move it.
    const recipes = read("../../tw/src/recipes.ts");
    const card = recipes.slice(
      recipes.indexOf("export const CARD_BASE"),
      recipes.indexOf("export const CARD_TITLE"),
    );
    // The card's own corner: `rounded-lg` is 8px in the registry, so a theme
    // that retunes `radius.lg` leaves this recipe where it is.
    expect(card).toContain("rounded-lg");
    expect(card).toContain("px-");
    expect(read("../../components/src/internal/recipe.ts")).toContain(
      "classesToStyle",
    );
  });

  it("reads the theme for the geometry a component measures", () => {
    // The exception that makes the split visible rather than absolute: a circle
    // is drawn at `radius.full`, a control's box at `controlHeight`, a row at
    // `rowHeight`, and the drawer's offsets on the spacing scale.
    expect(read("../../components/src/avatar.tsx")).toContain(
      "theme.radius.full",
    );
    expect(read("../../components/src/tabs.tsx")).toContain("controlHeight(");
    expect(read("../../components/src/list.tsx")).toContain(
      "theme.density.rowHeight",
    );
    expect(read("../../components/src/drawer.tsx")).toContain("theme.spacing.");
  });

  it("states the scope on both pages", () => {
    const tokens = pages["docs/tokens.md"];
    expect(tokens).toContain("What an override reaches");
    expect(tokens).toContain("fixed metrics");
    expect(tokens).toContain("`radius.full`");
    expect(tokens).toContain("ADR 0006");

    const design = pages["docs/design-system.md"];
    expect(design).toContain(
      "An override reaches colour everywhere and geometry where a component reads it.",
    );
    expect(design).toContain("fixed metrics");
    expect(design).toContain("`radius.full`");
    expect(design).toContain("ADR 0006");
  });
});
