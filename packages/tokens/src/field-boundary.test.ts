import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { lightColors } from "./color.js";
import { contrastPairs, contrastRatio } from "./contrast.js";

const source = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const flattened = (text: string): string => text.replace(/\s+/g, " ");

const design = flattened(source("../../../docs/design-system.md"));
const catalogue = flattened(source("../../../docs/tokens.md"));
const recipe = source("../../primitives/src/recipe/index.ts");
const variants = source("../../primitives/src/core/variants.ts");
const field = source("../../components/src/field.tsx");

const ratio = (foreground: string, background: string): string => {
  const measured = contrastRatio(foreground, background);
  expect(
    measured,
    `${foreground} on ${background} is not measurable`,
  ).toBeDefined();
  return (measured ?? 0).toFixed(2);
};

const fieldVariant = (): string => {
  const start = variants.indexOf("export const fieldVariant");
  const end = variants.indexOf("};", start);
  expect(start, "variants.ts has no fieldVariant").toBeGreaterThan(-1);
  expect(end, "fieldVariant is not a block").toBeGreaterThan(start);
  return variants.slice(start, end);
};

const variantEdge = (): string => {
  const match = /border:\s*\(theme\)\s*=>\s*colorRole\(theme,\s*"(\w+)"\)/.exec(
    fieldVariant(),
  );
  expect(match, "fieldVariant no longer resolves a border role").not.toBeNull();
  return match?.[1] ?? "";
};

const fieldInputEdge = (): string => {
  const match =
    /borderColor:\s*isInvalid && !isDisabled\s*\?\s*theme\.colors\.(\w+)\s*:\s*theme\.colors\.(\w+),/.exec(
      field,
    );
  expect(
    match,
    "FieldInput no longer paints an invalid edge over a resting edge",
  ).not.toBeNull();
  expect(match?.[1], "FieldInput's invalid edge is not destructive").toBe(
    "destructive",
  );
  return match?.[2] ?? "";
};

describe("a field's boundary", () => {
  it("is the edge, because no fill clears the page and a card", () => {
    const gap = ratio(lightColors.background, lightColors.card);
    expect(Number(gap)).toBeLessThan(1.05 * 1.05);
    expect(design).toContain(`are only ${gap}:1 apart`);
    expect(catalogue).toContain(`are only ${gap}:1 apart`);

    expect(lightColors.input).toBe(lightColors.card);
    expect(lightColors.input).toBe(lightColors.popover);
    [design, catalogue].forEach((page) =>
      expect(page).toContain(
        `the same value as \`card\` and \`popover\` (${ratio(
          lightColors.input,
          lightColors.card,
        )}:1)`,
      ),
    );
  });

  it("prints the resting edge it does ship, on the page and in a card", () => {
    const onPage = ratio(lightColors.border, lightColors.background);
    const inCard = ratio(lightColors.border, lightColors.card);

    expect(design).toContain(`\`border\` (${onPage}:1 on the light page)`);
    expect(catalogue).toContain(`(${onPage}:1 on the light page)`);
    expect(catalogue).toContain(`is an edge at ${inCard}:1`);
  });

  it("names the deviation only while the field ships it", () => {
    const edge = variantEdge();
    const inputEdge = fieldInputEdge();

    expect(edge).toMatch(/^(border|borderStrong)$/);
    expect(inputEdge, "the two painters disagree about a field's edge").toBe(
      edge,
    );

    const deviates = edge === "border";
    const message = deviates
      ? "docs/design-system.md no longer names the field's decorative resting edge"
      : "fieldVariant paints borderStrong now: move the design system's deviation sentence";
    expect(design.includes("still rests on the decorative role"), message).toBe(
      deviates,
    );

    [design, catalogue].forEach((page) => {
      expect(page).toContain("packages/primitives/src/core/variants.ts");
      expect(page).toContain("packages/components/src/field.tsx");
    });
  });

  it("keeps the fill the text surface the table measures", () => {
    const measuresFill = (foreground: string) =>
      contrastPairs.some(
        (pair) => pair.foreground === foreground && pair.background === "input",
      );

    expect(measuresFill("inputForeground")).toBe(true);
    expect(measuresFill("placeholder")).toBe(true);
    expect(recipe).toContain("bg-input");
    expect(recipe).toContain("text-input-foreground");
  });

  it("retracts the destructive fill and holds the recipe to the edge", () => {
    expect(recipe).toContain(
      'const FIELD_INVALID = "aria-invalid:border-destructive";',
    );
    expect(recipe).not.toContain("aria-invalid:bg-destructive");

    [design, catalogue].forEach((page) => {
      expect(page).not.toContain("aria-invalid:bg-destructive");
      expect(page).not.toContain("the primitives' field recipe still does");
      expect(page).toContain("aria-invalid:border-destructive");
    });

    const unreadable = ratio(
      lightColors.inputForeground,
      lightColors.destructive,
    );
    expect(unreadable).toBe("3.31");
    expect(design).toContain(`${unreadable}:1 in the light`);
    expect(catalogue).toContain(`${unreadable}:1 in the light theme`);
  });
});
