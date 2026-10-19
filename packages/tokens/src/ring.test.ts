/**
 * Guards the defect plan 611 fixes: a selection ring painted with one role
 * vanishes on content of the same colour, and no single palette role can ring
 * an arbitrary swatch. `color-picker.tsx` paints its selected-swatch ring in
 * `foreground`, so the `foreground` swatch measured **1.000:1** in every theme
 * while the other five swatches measured 1.56–2.98:1 in most sets.
 *
 * A two-tone ring fixes it, but its guarantee is not implied by the body floor:
 * the worst case over an arbitrary colour is the square root of the two tones'
 * ratio, so a theme with a 7:1 ink/canvas pair — enough for every documented
 * text pair — guarantees only 2.65:1 for the ring. `themeRingFailures` measures
 * the derived bound, and `themeFailures` composes it as the `ring` kind.
 */
import { describe, expect, it } from "vitest";
import {
  contrastFloors,
  contrastPairs,
  contrastRatio,
  contrastRing,
  extendTheme,
  getTheme,
  shippedThemes,
  themeFailures,
  themeRingFailures,
} from "./index.js";
import { contrastRingStyle } from "./contrast-ring.example.js";

/** The worst-case guarantee of a two-tone ring: the geometric mean. */
const bound = (inner: string, outer: string): number =>
  Math.sqrt(contrastRatio(outer, inner));

const grey = (step: number): string =>
  `#${step.toString(16).padStart(2, "0").repeat(3)}`;

describe("contrast ring", () => {
  it("resolves the theme's two extreme tones and the designed thickness", () => {
    [
      getTheme("light"),
      getTheme("dark"),
      getTheme("light", "high"),
      getTheme("dark", "high"),
    ].forEach((theme) => {
      const ring = contrastRing(theme);
      expect(ring.inner, theme.name).toBe(theme.colors.background);
      expect(ring.outer, theme.name).toBe(theme.colors.foreground);
      expect(ring.width, theme.name).toBe(theme.borderWidth.strong);
    });
  });

  it("guarantees the mark floor against any colour in every shipped set", () => {
    let tightest = Number.POSITIVE_INFINITY;
    shippedThemes.forEach(({ theme }) => {
      const ring = contrastRing(theme);
      const ratio = bound(ring.inner, ring.outer);
      expect(ratio, theme.name).toBeGreaterThanOrEqual(
        contrastFloors[theme.contrast].mark,
      );
      tightest = Math.min(tightest, ratio);
    });
    // The shipped tightest is `Dark · Linux` at 3.702:1; state the headroom
    // without pinning a per-set table.
    expect(tightest).toBeGreaterThan(3.7);
  });

  it("is the worst case over every luminance, not a loose bound", () => {
    shippedThemes.forEach(({ theme }) => {
      const ring = contrastRing(theme);
      const worst = bound(ring.inner, ring.outer);
      const measured = Array.from({ length: 0x100 }, (_, step) =>
        Math.max(
          contrastRatio(grey(step), ring.inner),
          contrastRatio(grey(step), ring.outer),
        ),
      ).reduce(
        (lowest, ratio) => Math.min(lowest, ratio),
        Number.POSITIVE_INFINITY,
      );
      expect(measured, theme.name).toBeGreaterThanOrEqual(worst - 1e-9);
      // The 8-bit grid straddles the exact crossing, so it reaches the bound
      // within a fraction of a percent; a loose lower bound would not.
      expect(measured - worst, theme.name).toBeLessThan(0.05);
    });
  });

  it("reports a collapsed ring through the total check", () => {
    const theme = extendTheme(getTheme("light"), {
      colors: { foreground: "#777777" },
    });
    const failures = themeRingFailures(theme);

    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({
      inner: "background",
      outer: "foreground",
      pairClass: "mark",
      floor: contrastFloors.default.mark,
    });
    expect(failures[0]?.ratio).toBeCloseTo(
      Math.sqrt(contrastRatio("#777777", theme.colors.background)),
      12,
    );
    expect(themeFailures(theme)).toContainEqual({
      kind: "ring",
      ...failures[0],
    });
  });

  it("is already measured on the surfaces a swatch sits on", () => {
    ["background", "card", "popover", "muted"].forEach((surface) => {
      expect(contrastPairs, surface).toContainEqual([
        "foreground",
        surface,
        "body",
      ]);
    });
  });

  it("documents the composition the runtime paints", () => {
    const theme = getTheme("dark");
    const ring = contrastRing(theme);
    const style = contrastRingStyle(theme);

    expect(style.borderColor).toBe(ring.inner);
    expect(style.borderWidth).toBe(ring.width);
    expect(style.boxShadow).toEqual({
      offsetX: 0,
      offsetY: 0,
      blurRadius: 0,
      spreadRadius: ring.width,
      color: ring.outer,
    });
  });
});
