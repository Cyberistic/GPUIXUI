/**
 * `ThemeProvider` — the two decisions it makes.
 *
 * The bug behind these: a provider that quietly invents a palette, or one whose
 * density override reaches a colour. The first is guarded by the error naming
 * the provider (there is no default theme by design — a silent one is how two
 * design systems end up in one app). The second is guarded by the override
 * returning the theme *itself* when there is nothing to change, so a re-render
 * can never silently clone or re-tint a palette.
 */

import { describe, expect, it } from "vitest";
import type { Density } from "../core/theme.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import { MissingThemeProviderError } from "./ThemeProvider.js";
import { withDensity } from "./internal.js";

const compact: Density = {
  name: "compact",
  controlHeight: { sm: 24, md: 28, lg: 32 },
  controlPaddingX: { sm: 6, md: 8, lg: 10 },
  rowHeight: 28,
};

describe("withDensity", () => {
  it("hands the theme through untouched when there is no override", () => {
    expect(withDensity(testTheme, undefined)).toBe(testTheme);
  });

  it("replaces only the density group, so the palette is shared not copied", () => {
    const dense = withDensity(testTheme, compact);
    expect(dense.density).toBe(compact);
    expect(dense.colors).toBe(testTheme.colors);
    expect(dense.typography).toBe(testTheme.typography);
  });
});

describe("a primitive without a provider", () => {
  it("fails with an error that names the provider to add", () => {
    const error = new MissingThemeProviderError();
    expect(error.name).toBe("MissingThemeProviderError");
    expect(error.message).toContain("<ThemeProvider>");
  });
});
