/**
 * Guards the defect plan 638 fixes: `dimensions.fieldAdornmentSize` names the
 * square clear control inside a field — SearchInput, the TimePicker, the
 * HotkeyRecorder and the TagInput chip's remove control all paint the `caption`
 * role's `✕` inside it — but the metric contract held it only to a positive
 * size and to fitting inside the smallest control. A copied theme that grew the
 * caption leading to 20px while keeping the 16px adornment returned `[]` from
 * every check while the glyph overflowed the square it is centred in.
 */

import { describe, expect, it } from "vitest";
import { themeMetricFailures } from "./metrics.js";
import { shippedThemes } from "./shipped-themes.js";
import { extendTheme, getTheme, type Theme } from "./theme.js";
import { themeFailures } from "./theme-check.js";

const adornmentFailures = (theme: Theme) =>
  themeMetricFailures(theme).filter(
    (failure) =>
      failure.group === "dimensions" && failure.member === "fieldAdornmentSize",
  );

const base = getTheme("light");

describe("field adornment fit", () => {
  it("holds every shipped set's adornment to the caption line it paints", () => {
    shippedThemes.forEach(({ theme }) => {
      expect(
        theme.dimensions.fieldAdornmentSize,
        theme.name,
      ).toBeGreaterThanOrEqual(theme.typography.caption.lineHeight);
    });
  });

  it("reports an adornment shorter than the caption line it paints", () => {
    const clipped = extendTheme(base, {
      typography: { caption: { lineHeight: 20 } },
      // Keep plan 517's keycap rule coherent so one defect has one diagnostic.
      dimensions: { keycapSize: 22 },
    });

    expect(adornmentFailures(clipped)).toEqual([
      {
        group: "dimensions",
        member: "fieldAdornmentSize",
        rule: "at-least",
        actual: 16,
        bound: 20,
      },
    ]);
  });

  it("passes the same theme once the adornment grows with the line", () => {
    const fitted = extendTheme(base, {
      typography: { caption: { lineHeight: 20 } },
      dimensions: { keycapSize: 22, fieldAdornmentSize: 20 },
    });

    expect(themeMetricFailures(fitted)).toEqual([]);
  });

  it("reads the theme's own leading, not a shipped literal", () => {
    const tighter = extendTheme(base, {
      typography: { caption: { lineHeight: 18 } },
      dimensions: { fieldAdornmentSize: 17 },
    });

    expect(adornmentFailures(tighter)).toEqual([
      {
        group: "dimensions",
        member: "fieldAdornmentSize",
        rule: "at-least",
        actual: 17,
        bound: 18,
      },
    ]);
  });

  it("carries the clipped adornment through the total check", () => {
    const clipped = extendTheme(base, {
      typography: { caption: { lineHeight: 20 } },
      dimensions: { keycapSize: 22 },
    });

    expect(themeFailures(clipped)).toContainEqual({
      kind: "metric",
      group: "dimensions",
      member: "fieldAdornmentSize",
      rule: "at-least",
      actual: 16,
      bound: 20,
    });
  });

  it("keeps one diagnostic for a non-finite caption line", () => {
    const broken = extendTheme(base, {
      typography: { caption: { lineHeight: Number.NaN } },
    });

    expect(adornmentFailures(broken)).toEqual([]);
    expect(
      themeMetricFailures(broken).filter(
        (failure) =>
          failure.group === "typography" &&
          failure.member === "caption.lineHeight",
      ),
    ).toEqual([
      {
        group: "typography",
        member: "caption.lineHeight",
        rule: "finite",
        actual: Number.NaN,
        bound: 0,
      },
    ]);
  });
});
