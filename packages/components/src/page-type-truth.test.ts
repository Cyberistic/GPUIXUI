/**
 * The type step a page teaches, held to the recipe that paints it.
 *
 * The bug these guard: this package compiles its resting appearance from
 * `@gpuixui/tw` against the registry's **fixed** shadcn scale (ADR 0006), while
 * five pages attributed their part's size to a theme role — `label` is 13/18,
 * and every one of those parts paints `text-sm` (14/20 at weight 500) or
 * `text-xs` (12/16). The Badge page went further and printed a height derived
 * from the role it named (22px for what its `md` pill really paints, 24px), and
 * told a reader a theme's type or spacing would move the pill, which is fixed on
 * both axes.
 *
 * The sibling guard for the same class of claim is `page-radius-truth.test.ts`;
 * `crumb-pages.test.ts` holds the two pages whose trail and pager type was
 * corrected first.
 *
 * The sweep closes the set: every page whose Theming section attributes a size
 * to a `label`/`caption` role must be declared here, so a new page cannot teach
 * one.
 *
 * `node:fs` is a test-time repository read, the boundary `docs.test.ts` and
 * `card-page.test.ts` already use.
 */

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  ACCORDION_TRIGGER,
  BADGE_BASE,
  BADGE_SIZES,
  COLLAPSIBLE_TRIGGER,
  FIELD_DESCRIPTION,
  FIELD_ERROR,
  FIELD_LABEL,
  MENU_ITEM,
  cn,
} from "@gpuixui/tw";
import * as Arr from "effect/Array";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";
import { recipeStyle } from "./internal/recipe.js";
import { darkTheme, lightTheme } from "./internal/theme.js";

const docsDirectory = fileURLToPath(new URL("../docs/", import.meta.url));
const read = (path: string): string =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

/** One part a recipe compiles, and the type step it paints. */
interface FixedPart {
  /** How the page names the part, for a failure message. */
  readonly part: string;
  readonly recipe: string;
  readonly fontSize: number;
  readonly lineHeight: number;
  /** The weight the recipe asks for, when it asks for one. */
  readonly weight?: number;
}

interface PageClaim {
  readonly page: string;
  readonly parts: ReadonlyArray<FixedPart>;
  /** The phrases that attribute a part's size to a theme role. */
  readonly retracted: ReadonlyArray<string>;
}

const claims: ReadonlyArray<PageClaim> = [
  {
    page: "badge.mdx",
    parts: [
      {
        part: "sm pill",
        recipe: cn(BADGE_BASE, BADGE_SIZES.sm),
        fontSize: 12,
        lineHeight: 16,
      },
      {
        part: "md pill",
        recipe: cn(BADGE_BASE, BADGE_SIZES.md),
        fontSize: 14,
        lineHeight: 20,
        weight: 500,
      },
    ],
    retracted: ["`caption` (12/16)", "`label` (13/18)"],
  },
  {
    page: "accordion.mdx",
    parts: [
      {
        part: "trigger",
        recipe: ACCORDION_TRIGGER,
        fontSize: 14,
        lineHeight: 20,
        weight: 500,
      },
    ],
    retracted: ["`label` type role"],
  },
  {
    page: "collapsible.mdx",
    parts: [
      {
        part: "trigger",
        recipe: COLLAPSIBLE_TRIGGER,
        fontSize: 14,
        lineHeight: 20,
        weight: 500,
      },
    ],
    retracted: ["`label` type role"],
  },
  {
    page: "dropdown-menu.mdx",
    parts: [
      {
        part: "row",
        recipe: MENU_ITEM,
        fontSize: 14,
        lineHeight: 20,
        weight: 500,
      },
    ],
    retracted: ["`label` type role"],
  },
  {
    page: "field.mdx",
    parts: [
      {
        part: "label",
        recipe: FIELD_LABEL,
        fontSize: 14,
        lineHeight: 20,
        weight: 500,
      },
      {
        part: "description",
        recipe: FIELD_DESCRIPTION,
        fontSize: 12,
        lineHeight: 16,
      },
      { part: "error", recipe: FIELD_ERROR, fontSize: 12, lineHeight: 16 },
    ],
    retracted: ["`label` type role", "`caption` role"],
  },
];

const pageText = (claim: PageClaim): string => read(`../docs/${claim.page}`);

/** A page's `## Theming` section, flattened for a prose assertion. */
const theming = (claim: PageClaim): string => {
  const text = pageText(claim);
  const start = text.indexOf("\n## Theming\n");
  expect(start, `${claim.page} has no Theming section`).toBeGreaterThanOrEqual(
    0,
  );
  const rest = text.slice(start + 1);
  const end = rest.indexOf("\n## ");
  return (end < 0 ? rest : rest.slice(0, end)).replace(/\s+/g, " ");
};

/** The type numbers a recipe compiles in one theme. */
const compiled = (recipe: string) => {
  const style = recipeStyle(cn(recipe), lightTheme);
  return {
    fontSize: style.fontSize,
    lineHeight: style.lineHeight,
    fontWeight: style.fontWeight,
  };
};

/** One page's Theming section, or `undefined` when the page has none. */
const sectionOf = (file: string): string | undefined => {
  const source = readFileSync(`${docsDirectory}${file}`, "utf8");
  const start = source.indexOf("\n## Theming\n");
  if (start < 0) return undefined;
  const rest = source.slice(start + 1);
  const end = rest.indexOf("\n## ");
  return end < 0 ? rest : rest.slice(0, end);
};

/** The phrases that attribute a size to a theme role. */
const attributions = [
  "`label` type role",
  "`caption` type role",
  "the `label` role",
  "the `caption` role",
];

describe("the type step each page teaches", () => {
  it("paints the step the page prints, in both shipped themes", () => {
    const wrong = Arr.flatMap(claims, (claim) =>
      Arr.flatMap(claim.parts, (part) => {
        const light = compiled(part.recipe);
        const dark = recipeStyle(cn(part.recipe), darkTheme);
        return light.fontSize === part.fontSize &&
          light.lineHeight === part.lineHeight &&
          light.fontWeight === part.weight &&
          dark.fontSize === part.fontSize &&
          dark.lineHeight === part.lineHeight
          ? []
          : [
              `${claim.page}: ${part.part} paints ${String(light.fontSize)}/${String(light.lineHeight)} at ${String(light.fontWeight)}, not ${part.fontSize}/${part.lineHeight} at ${String(part.weight)}`,
            ];
      }),
    );

    expect(wrong).toEqual([]);
  });

  it("holds the theme's own roles apart from the fixed step", () => {
    // The premise: `label` is 13/18 and the steps above are 14/20 or 12/16, so
    // a page that names the role sends a reader to a size nothing paints.
    expect(lightTheme.typography.label.fontSize).toBe(13);
    expect(lightTheme.typography.label.lineHeight).toBe(18);
    Arr.forEach(claims, (claim) =>
      Arr.forEach(claim.parts, (part) => {
        expect(
          part.fontSize === lightTheme.typography.label.fontSize &&
            part.lineHeight === lightTheme.typography.label.lineHeight,
          `${claim.page}: ${part.part} is the label role`,
        ).toBe(false);
      }),
    );
  });

  it("names the fixed step and not the role it replaced", () => {
    const wrong = Arr.flatMap(claims, (claim) => {
      const text = theming(claim);
      const printed = Arr.flatMap(claim.parts, (part) =>
        Str.includes(`${part.fontSize}/${part.lineHeight}`)(pageText(claim))
          ? []
          : [
              `${claim.page}: never prints ${part.part}'s ${part.fontSize}/${part.lineHeight} step`,
            ],
      );
      const stale = Arr.filter(claim.retracted, (phrase) =>
        Str.includes(phrase)(text),
      );
      return [
        ...printed,
        ...Arr.map(stale, (phrase) => `${claim.page}: teaches ${phrase}`),
      ];
    });

    expect(wrong).toEqual([]);
  });

  it("derives the badge's height from the step, not from a role", () => {
    // The pill's box is its leading plus `py-0.5` in both sizes; the page
    // printed 22px for the `md` pill, which no step plus that padding reaches.
    const badge = claims[0];
    expect(badge).toBeDefined();
    if (badge === undefined) return;
    const text = pageText(badge);
    const padding = lightTheme.spacing["2xs"] * 2;
    const wrong = Arr.flatMap(badge.parts, (part) => {
      const height = part.lineHeight + padding;
      return Str.includes(`${height}px`)(text)
        ? []
        : [`badge.mdx: never prints ${part.part}'s ${height}px height`];
    });

    expect(wrong).toEqual([]);
  });

  it("declares every page whose Theming names a type role", () => {
    const pages = Arr.filter(
      Arr.fromIterable(readdirSync(docsDirectory)),
      (file) => Str.endsWith(".mdx")(file),
    );
    const undeclared = Arr.filter(pages, (file) => {
      if (Arr.some(claims, (entry) => entry.page === file)) return false;
      const section = sectionOf(file);
      return (
        section !== undefined &&
        Arr.some(attributions, (phrase) => Str.includes(phrase)(section))
      );
    });

    expect(undeclared).toEqual([]);
  });
});
