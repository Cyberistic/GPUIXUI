/**
 * Holds the module graph acyclic, from the one import order that broke it.
 *
 * The defect this closes: the type scale needed the platform table's two
 * families (`typography` → `platforms`), the platform table needed the syntax
 * palette (`platforms` → `syntax`), and the syntax palette read its two labels
 * from the theme module (`syntax` → `theme`) — which imports the type scale.
 * The cycle closed `typography → platforms → syntax → theme → typography`, so a
 * program that imported `typography` (or the platform table) **before** `theme`
 * built the shipped themes from an uninitialised binding: measured on
 * 2026-10-24 with `typography` imported first, `lightTheme.typography` was
 * `undefined` and `missingTokens(lightTheme)` answered
 * `[{ group: "typography", path: "", kind: "group" }]` — the library's own theme
 * refused by its own gate.
 *
 * The two label readers live in `mode.ts` now, which depends on the colour and
 * luminance seams only, and `theme.ts` re-exports them so the package surface is
 * unchanged. This file's import order is the measurement: it imports the scale
 * first, then the theme, so a future edge that closes the cycle again fails here
 * rather than in a consumer whose bundler picked a different entry point.
 * Directions measured: restoring `syntax.ts`'s `import … from "./theme.js"`
 * fails the first case with the group refusal above; acyclic, the file is green.
 */

// The order is the test: the type scale first, the theme second.
import { describe, expect, it } from "vitest";
import { typography } from "./typography.js";
import * as tokens from "./index.js";
import { missingTokens } from "./missing.js";
import { themeModeOf, themeModes } from "./mode.js";
import { themes } from "./theme.js";

describe("the module graph", () => {
  it("builds every shipped theme complete when the type scale is imported first", () => {
    // The group the cycle lost, and the gate's own sentence about it.
    expect(themes.light.typography).toBe(typography);
    expect(themes.light.typography.sans).toBe(typography.sans);
    expect(missingTokens(themes.light)).toEqual([]);
    expect(missingTokens(themes.dark)).toEqual([]);
    expect(themeModes.map((mode) => missingTokens(themes[mode]))).toEqual(
      themeModes.map(() => []),
    );
  });

  it("keeps the label readers on the public surface", () => {
    // `mode.ts` owns the readers; `theme.ts` re-exports them, so a consumer
    // importing either name from the package reads one function.
    expect(tokens.themeModeOf).toBe(themeModeOf);
    expect(tokens.themeModes).toBe(themeModes);
  });
});
