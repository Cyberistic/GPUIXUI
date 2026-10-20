/**
 * Guards the three figures the executed brand example publishes.
 *
 * The example is the extension story: a consumer copies
 * `src/brand-theme.example.ts`, edits it and ships it. Four documents quote its
 * figures in the present tense — the catalogue's *Theme API* section, the design
 * system's §3, the package README and the example's own header — and nothing
 * derived any of them. Falsifying two in the catalogue was enough to prove it:
 * rewriting the inherited-foreground figure as `4.99:1` and the selected-check
 * figure as `3.199:1` left `nub run --filter @gpuixui/tokens test` green at
 * **7045 passed**.
 *
 * `docs.test.ts` pins the **1.157** catalogue sentence only, and
 * `theme.test.ts` pins **3.146** numerically without reading a sentence; the
 * README's two copies, the design system's one and the header's three had no
 * owner at all. A later palette step could therefore move a figure and leave
 * three documents quoting the old number — the failure mode plans `536`, `544`
 * and `760` closed for shipped-theme figures.
 *
 * This suite is deliberately not `documentedFigures`: that table names a
 * **shipped theme** as its provenance, and the brand is an executed example
 * whose primary family is not in `shippedThemes`. The inherited-foreground
 * figure is historical on top of that — plan `098` moved the example's fill —
 * so its fill is written out and only the role follows the theme.
 *
 * `node:fs` is deliberate: this is a documentation test over the tree's own
 * files, and the tokens package ships zero runtime dependencies by design.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { brandTheme } from "./brand-theme.example.js";
import { compositeOver, contrastRatio } from "./contrast.js";
import { getTheme } from "./theme.js";

const document_ = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const catalogue = document_("../../../docs/tokens.md");
const designSystem = document_("../../../docs/design-system.md");
const readme = document_("../README.md");
const example = document_("./brand-theme.example.ts");

/**
 * The pre-098 brand fill. Plan `098` moved the example to `#9579FF`, so the
 * composition the rule warns about can only be measured against the retired
 * fill — written out, while the foreground follows the dark theme's own role.
 */
const retiredBrandFill = "#7C5CFF";

/** The dark `primaryForeground` the example used to inherit, on that fill. */
const inheritedForeground = contrastRatio(
  getTheme("dark").colors.primaryForeground,
  retiredBrandFill,
);

/** `primary` as the selected option's check on the `selected` fill it marks. */
const selectedOptionCheck = contrastRatio(
  brandTheme.colors.primary,
  brandTheme.colors.selected,
);

/** A dialog's face over the identity scrim composited with the brand action. */
const dialogFace = contrastRatio(
  brandTheme.colors.popover,
  compositeOver(brandTheme.colors.overlay, brandTheme.colors.primary),
);

describe("the brand example's quoted figures", () => {
  it("derives the three figures the documents quote", () => {
    expect(inheritedForeground).toBeCloseTo(4.243, 3);
    expect(selectedOptionCheck).toBeCloseTo(3.146, 3);
    expect(dialogFace).toBeCloseTo(1.157, 3);
  });

  it("measures the face over the scrim the example keeps", () => {
    // The sentence says "the example takes the base scrim": if the brand
    // overrode `overlay`, the derived face would measure a scrim it no longer
    // uses and the claim would be false while the figure still matched.
    expect(brandTheme.colors.overlay).toBe(getTheme("dark").colors.overlay);
  });

  it("quotes them in the catalogue", () => {
    expect(catalogue).toContain(
      `measured ${inheritedForeground.toFixed(2)}:1 on its original brand fill`,
    );
    expect(catalogue).toContain(
      `this family clears it at **${selectedOptionCheck.toFixed(3)}:1** without repainting the selection`,
    );
    expect(catalogue).toContain(
      `measures **${dialogFace.toFixed(3)}:1** over the base 65% scrim`,
    );
  });

  it("quotes the inherited foreground in the design system", () => {
    expect(designSystem).toContain(
      `measured ${inheritedForeground.toFixed(2)}:1 on its brand`,
    );
  });

  it("quotes the two current figures in the package README", () => {
    // The README wraps after the figure, so the claim is matched up to it.
    expect(readme).toContain(
      `clears it at ${selectedOptionCheck.toFixed(3)}:1`,
    );
    expect(readme).toContain(
      `the face measures ${dialogFace.toFixed(3)}:1 over the identity 65% scrim`,
    );
  });

  it("quotes all three in the example's own header", () => {
    expect(example).toContain(
      `measured ${inheritedForeground.toFixed(3)}:1 on the original fill`,
    );
    expect(example).toContain(
      `clears it at ${selectedOptionCheck.toFixed(3)}:1 without repainting`,
    );
    expect(example).toContain(
      `a dialog's face measures ${dialogFace.toFixed(3)}:1 over`,
    );
  });

  it("rejects the figures the falsification probe used", () => {
    // The sentences discriminate on the digit: a falsified value cannot pass as
    // a substring of a correct one, which is what makes the cases above guards
    // rather than presence checks. `4.99:1` is a shipped native-highlight
    // figure elsewhere on the page, so the claim is matched with its phrase.
    expect(catalogue).not.toContain(
      "measured 4.99:1 on its original brand fill",
    );
    expect(catalogue).not.toContain("clears it at **3.199:1**");
    expect(example).not.toContain("4.999:1");
  });
});
