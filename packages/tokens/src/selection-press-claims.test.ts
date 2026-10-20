/**
 * Guards the claim plan 789 fixes: six current-state passages describe
 * `selectedActive` as "a 24% veil of the canvas colour over `selected`", but the
 * value the library ships is a 24% veil of the **mode's extreme** — white in
 * light, black in dark.
 *
 * The composition is already executed: `selectionPressVeils` spells the two
 * bytes and every shipped set follows them. The prose did not. Identity light's
 * canvas (`#F6F8FA`) veiled at 24% over `#E0E3FF` is `#E5E8FE`, while the
 * shipped `#E7EAFF` is white's veil; identity dark's canvas veil is `#352977`
 * against the shipped `#312471`. The phrase survived because both
 * high-contrast sets have a pure-white / pure-black canvas, where the two
 * readings agree — so a reader copying the derivation from `background` in a
 * default theme ships a different fill, and the step, direction and text pairs
 * all still pass.
 *
 * The cases derive the fraction into the two veils, hold all 24 shipped sets to
 * them, show the canvas composition is a different colour, and read every
 * present-tense passage so the canvas claim cannot return.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { alpha } from "./color.js";
import { compositeOver } from "./contrast.js";
import {
  selectionPressVeilAmount,
  selectionPressVeils,
} from "./selection-press.example.js";
import { shippedThemes } from "./shipped-themes.js";
import { getTheme } from "./theme.js";

/**
 * Collapse whitespace and JSDoc/markdown asterisks, so a phrase that wraps in a
 * comment or a code span is still one string. The patterns below contain no
 * asterisk of their own.
 */
const flat = (text: string): string =>
  text.replace(/\*/g, " ").replace(/\s+/g, " ");

const read = (path: string): string =>
  flat(readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8"));

/** The wording this plan refutes: the canvas value, rather than the extreme. */
const refuted = (text: string): boolean =>
  /canvas veil|veil of the canvas|canvas-tinted/.test(flat(text));

const canvasVeil = (theme: ReturnType<typeof getTheme>): string =>
  compositeOver(
    alpha(theme.colors.background, selectionPressVeilAmount),
    theme.colors.selected,
  );

describe("the pressed selected row's veil", () => {
  it("derives the veil from the fraction the passages quote", () => {
    expect(selectionPressVeils).toEqual({
      light: alpha("#FFFFFF", selectionPressVeilAmount),
      dark: alpha("#000000", selectionPressVeilAmount),
    });
    expect(selectionPressVeils).toEqual({
      light: "#FFFFFF3D",
      dark: "#0000003D",
    });
    // The fraction is owned: any other share writes another byte.
    expect(alpha("#FFFFFF", 0.25)).not.toBe(selectionPressVeils.light);
  });

  it("ships the mode's veil over every palette's selection", () => {
    const drifted = shippedThemes.flatMap(({ theme }) => {
      const derived = compositeOver(
        selectionPressVeils[theme.mode],
        theme.colors.selected,
      );
      return theme.colors.selectedActive === derived
        ? []
        : [`${theme.name}: ${theme.colors.selectedActive} !== ${derived}`];
    });
    expect(drifted).toEqual([]);
  });

  it("is not the canvas colour's veil", () => {
    // The two default-contrast identities disagree, which is the defect.
    expect(canvasVeil(getTheme("light"))).not.toBe(
      getTheme("light").colors.selectedActive,
    );
    expect(canvasVeil(getTheme("dark"))).not.toBe(
      getTheme("dark").colors.selectedActive,
    );

    // The high-contrast canvases *are* the extreme, so the two readings agree
    // there — the reason the old wording looked true.
    expect(canvasVeil(getTheme("light", "high"))).toBe(
      getTheme("light", "high").colors.selectedActive,
    );
    expect(canvasVeil(getTheme("dark", "high"))).toBe(
      getTheme("dark", "high").colors.selectedActive,
    );
  });

  it("names the mode's veil in every current passage", () => {
    const passages = [
      "docs/tokens.md",
      "docs/design-system.md",
      "COMPONENTS.md",
      "TODO.md",
      "packages/tokens/src/color.ts",
      "packages/tokens/src/selection-press.example.ts",
      "packages/tokens/src/selection-press.test.ts",
    ];

    passages.forEach((path) => {
      const text = read(path);
      expect(text, path).toContain(
        "24% veil of white in light and black in dark",
      );
      expect(refuted(text), path).toBe(false);
    });
  });

  it("detects the wording it refutes", () => {
    expect(
      refuted("`selectedActive` is a 24% canvas veil over `selected`"),
    ).toBe(true);
    expect(refuted("a 24% veil of the canvas colour over `selected`")).toBe(
      true,
    );
    expect(
      refuted("a 24% veil of white in light and black in dark over `selected`"),
    ).toBe(false);
  });
});
