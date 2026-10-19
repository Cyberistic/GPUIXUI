/**
 * Guards the defect plan 591 fixes: the pinned runtime paints a changed native
 * diff line on a **5.5% tint of its status role**
 * (`references/gpuix/packages/native/src/custom_elements/diff.rs:742-745`,
 * painted at `:830-832`), and every child — the gutter, the line number, the
 * marker, the 3px accent bar and the syntax runs — sits on that tint (`:857-901`;
 * the runs come from `theme.syntax.color` at `:789-792`). The contract measured
 * those paints only on the plain document tone, so five shipped pairs missed the
 * body floor while every check returned `[]`:
 *
 * | Set | Role | Row tint | Ratio |
 * | --- | ---- | -------- | ----- |
 * | Light · macOS | `warningText` | `successText` | 6.950:1 |
 * | Light · macOS | `warningText` | `destructiveText` | 6.963:1 |
 * | Light · Windows | `warningText` | `successText` | 6.990:1 |
 * | Light · Windows | `warningText` | `destructiveText` | 6.958:1 |
 * | Light · Windows XP | `successText` | `destructiveText` | 6.989:1 |
 *
 * `nativeSyntaxTints` owns the two tints and the six new
 * `nativeTextOverFades` entries own the changed row's chrome. The four inks take
 * one designed step. Without the check arm the pre-fix themes return no tinted
 * failure; without the steps every shipped set fails it.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { alpha } from "./color.js";
import {
  compositeOver,
  contrastRatio,
  extendTheme,
  getPlatformRecipeTheme,
  getPlatformTheme,
  getTheme,
  nativeSyntaxRoles,
  nativeSyntaxTints,
  nativeTextRoles,
  nativeTextSurfaces,
  themeFailures,
  themeNativeTextFailures,
  type Theme,
  type ThemeColors,
} from "./index.js";
import { shippedThemes } from "./shipped-themes.js";

/** The two light inks the shipped palettes carried before plan 591. */
const preFix = {
  macos: extendTheme(getPlatformTheme("darwin", "light"), {
    colors: { warningText: "#6B4500" },
  }),
  win32: extendTheme(getPlatformTheme("win32", "light"), {
    colors: { warningText: "#6B4500" },
  }),
  xp: extendTheme(getPlatformRecipeTheme("xp", "light"), {
    colors: { successText: "#0E5135" },
  }),
  aero: extendTheme(getPlatformRecipeTheme("aero", "light"), {
    colors: { successText: "#0E5135" },
  }),
};

/** A syntax paint on a row tint: the role is whole, the wash is the tint. */
const tintedFailures = (theme: Theme) =>
  themeNativeTextFailures(theme).filter(
    (failure) => failure.opacity === 1 && failure.washOpacity === 0.055,
  );

const rowPaintFailures = (theme: Theme) =>
  themeNativeTextFailures(theme).filter(
    (failure) =>
      failure.wash !== undefined &&
      failure.washOpacity === 0.055 &&
      failure.opacity !== 1,
  );

const tinted = (
  theme: Theme,
  surface: keyof ThemeColors,
  wash: keyof ThemeColors,
): string =>
  compositeOver(alpha(theme.colors[wash], 0.055), theme.colors[surface]);

describe("the native diff row tint", () => {
  it("reports the five shipped pairs the plain-tone contract missed", () => {
    const expected = [
      [preFix.macos, "warningText", "successText", 6.95],
      [preFix.macos, "warningText", "destructiveText", 6.963],
      [preFix.win32, "warningText", "successText", 6.99],
      [preFix.win32, "warningText", "destructiveText", 6.958],
      [preFix.xp, "successText", "destructiveText", 6.989],
    ] as const;

    for (const [theme, role, wash, ratio] of expected) {
      expect(
        themeFailures(theme).filter((failure) => failure.kind !== "nativeText"),
        theme.name,
      ).toEqual([]);
      const failure = tintedFailures(theme).find(
        (candidate) => candidate.role === role && candidate.wash === wash,
      );
      expect(failure?.surface, theme.name).toBe("background");
      expect(failure?.pairClass, theme.name).toBe("body");
      expect(failure?.opacity, theme.name).toBe(1);
      expect(failure?.ratio, theme.name).toBeCloseTo(ratio, 2);
    }
  });

  it("passes every shipped set after the designed steps", () => {
    shippedThemes.forEach(({ theme }) => {
      expect(themeFailures(theme), theme.name).toEqual([]);
    });
  });

  it("reports a row paint the tint swallows", () => {
    const light = getTheme("light");
    const planted = extendTheme(light, {
      colors: {
        placeholder: tinted(light, "background", "successText"),
      },
    });
    const failure = rowPaintFailures(planted).find(
      (candidate) =>
        candidate.field === "textFaint" &&
        candidate.opacity === 0.8 &&
        candidate.wash === "successText",
    );
    expect(failure?.pairClass).toBe("surface");
    expect(failure?.surface).toBe("background");
    expect(failure?.washOpacity).toBe(0.055);
  });

  it("holds every syntax role on both tints and every surface", () => {
    const light = getTheme("light");
    const roles = [...new Set(Object.values(nativeSyntaxRoles))];
    const flat = roles.reduce<Record<string, string>>(
      (colors, role) => ({ ...colors, [role]: "#808080" }),
      {},
    );
    const planted = extendTheme(light, { colors: flat });

    const failures = tintedFailures(planted);
    expect(failures).toHaveLength(
      roles.length * nativeTextSurfaces.length * nativeSyntaxTints.length,
    );
    const surfaces = new Set(
      failures.map((failure) => `${failure.wash}/${failure.surface}`),
    );
    expect(surfaces.size).toBe(
      nativeTextSurfaces.length * nativeSyntaxTints.length,
    );
  });

  it("pins the tightest tinted figure the reference quotes", () => {
    const roles = [...new Set(Object.values(nativeSyntaxRoles))];
    const measured = shippedThemes.flatMap(({ theme }) =>
      nativeTextSurfaces.flatMap((surface) =>
        (["diffAdd", "diffDel"] as const).flatMap((wash) =>
          roles.map((role) => ({
            name: theme.name,
            ratio: contrastRatio(
              theme.colors[role],
              tinted(theme, surface, nativeTextRoles[wash]),
            ),
          })),
        ),
      ),
    );
    const tightest = measured.reduce((min, entry) =>
      entry.ratio < min.ratio ? entry : min,
    );
    const docs = readFileSync(
      new URL("../../../docs/tokens.md", import.meta.url),
      "utf8",
    );
    expect(docs).toContain(`**${tightest.ratio.toFixed(3)}:1**`);
    expect(docs).toContain(`\`${tightest.name}\``);
  });
});
