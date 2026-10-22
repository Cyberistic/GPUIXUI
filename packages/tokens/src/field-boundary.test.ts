/**
 * Holds both documents and both field painters to one decision: a field is
 * carried by its edge, not its fill.
 *
 * The bug this guards: `docs/design-system.md` §7 claimed `borderStrong` is the
 * boundary "input and control boundaries" draw, while both shipped painters rest
 * on the decorative `border` role — so a reader was told a resting field had a
 * 3:1 edge it does not paint. The same pass found the inverse claim, still in
 * §8 and in `docs/tokens.md`, that the primitives' field recipe paints a
 * destructive *fill* behind the value: it stopped when `FIELD_INVALID` became
 * `aria-invalid:border-destructive` (commit `c193954e`), so the catalogue
 * described a defect the library no longer had.
 *
 * The pages therefore state the rule, print the measurements behind it, and name
 * the deviation; this suite reads the two painters as well, so the deviation
 * cannot outlive its code. Adopting `borderStrong` fails here until §7 and the
 * two other surfaces move, and repainting the destructive fill fails by name.
 *
 * `node:fs` is deliberate, as in `docs.test.ts`, `design-system-docs.test.ts`
 * and `inventory.test.ts`: this checks the repository's own Markdown and the two
 * consumer packages' source, and `@gpuixui/tokens` keeps no runtime or package
 * dependency on either. The reads are synchronous because they happen once, when
 * the suite loads, and the values are plain strings from then on.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { lightColors } from "./color.js";
import { contrastPairs, contrastRatio } from "./contrast.js";

const source = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

/** A document's prose with its line wrapping flattened, so a sentence is one string. */
const flattened = (text: string): string => text.replace(/\s+/g, " ");

const design = flattened(source("../../../docs/design-system.md"));
const catalogue = flattened(source("../../../docs/tokens.md"));
const recipe = source("../../primitives/src/recipe/index.ts");
const variants = source("../../primitives/src/core/variants.ts");
const field = source("../../components/src/field.tsx");

/** The ratio a page prints, to the two decimals the documents use. */
const ratio = (foreground: string, background: string): string => {
  const measured = contrastRatio(foreground, background);
  expect(
    measured,
    `${foreground} on ${background} is not measurable`,
  ).toBeDefined();
  return (measured ?? 0).toFixed(2);
};

/** The `fieldVariant` block, so the parse cannot wander into another variant. */
const fieldVariant = (): string => {
  const start = variants.indexOf("export const fieldVariant");
  const end = variants.indexOf("};", start);
  expect(start, "variants.ts has no fieldVariant").toBeGreaterThan(-1);
  expect(end, "fieldVariant is not a block").toBeGreaterThan(start);
  return variants.slice(start, end);
};

/** The role `fieldVariant` paints at rest. */
const variantEdge = (): string => {
  const match = /border:\s*\(theme\)\s*=>\s*theme\.colors\.(\w+)/.exec(
    fieldVariant(),
  );
  expect(match, "fieldVariant no longer resolves a border role").not.toBeNull();
  return match?.[1] ?? "";
};

/** The role the components package's `FieldInput` paints at rest. */
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
    // The premise, in both directions: the two strips a fill could sit between
    // are closer than the floor applied twice, so no fill separates from both.
    const gap = ratio(lightColors.background, lightColors.card);
    expect(Number(gap)).toBeLessThan(1.05 * 1.05);
    expect(design).toContain(`are only ${gap}:1 apart`);
    expect(catalogue).toContain(`are only ${gap}:1 apart`);

    // And the shipped light field is the card it sits on.
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

    // A reader has to be able to check the claim in the file it describes.
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

    // The reason the fill is wrong, measured rather than argued.
    const unreadable = ratio(
      lightColors.inputForeground,
      lightColors.destructive,
    );
    expect(unreadable).toBe("3.31");
    expect(design).toContain(`${unreadable}:1 in the light`);
    expect(catalogue).toContain(`${unreadable}:1 in the light theme`);
  });
});
