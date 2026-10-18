/**
 * Guards the defect plan 386 fixes: the numeric contract held `controlHeight.sm`
 * to one `label` line plus its two borders, but a field does not paint the label
 * role. `fieldTextStyle` and `otpCellStyle` in `primitives` set the body size,
 * leading and weight inside the same box, and `controlStyle` fixes that box at
 * `controlHeight[size]` with its borders painted inside. A theme with
 * `body.lineHeight` 30 returned `[]` from every check while the shipped 28px
 * `sm` control leaves a 26px content box — a clipped line on every small field —
 * because the row rule only reads the row, and 32 clears 30.
 */
import { describe, expect, it } from "vitest";
import { shippedThemes } from "./shipped-themes.js";
import { themeColorFailures, themeContrastFailures } from "./contrast.js";
import { crampedField, crampedFieldFailures } from "./metrics.example.js";
import { themeMetricFailures } from "./metrics.js";
import { themeFailures } from "./theme-check.js";
import { extendTheme, getTheme, type Theme } from "./theme.js";
import { themeTypefaceFailures } from "./typeface.js";

/** Every shipped set: identity, platform variant and recipe, in both modes. */
const shipped: ReadonlyArray<readonly [string, Theme]> = shippedThemes.map(
  ({ theme }) => [theme.name, theme] as const,
);

const cramped = (lineHeight: number): Theme =>
  extendTheme(getTheme("light"), {
    typography: { body: { fontSize: 14, lineHeight } },
  });

describe("body-line fit", () => {
  it("reports a body line taller than the smallest field", () => {
    // The shipped `sm` control is 28px with two 1px borders, so its content box
    // is 26px; a 30px line needs a 32px control.
    expect(themeMetricFailures(cramped(30))).toEqual([
      {
        group: "density",
        member: "controlHeight.sm",
        rule: "at-least",
        actual: 28,
        bound: 32,
      },
    ]);
  });

  it("fits a body line exactly in the content box", () => {
    expect(themeMetricFailures(cramped(26))).toEqual([]);
    expect(themeMetricFailures(cramped(27))).toEqual([
      {
        group: "density",
        member: "controlHeight.sm",
        rule: "at-least",
        actual: 28,
        bound: 29,
      },
    ]);
  });

  it("holds the box to the taller of the label and body lines", () => {
    const tallLabel = extendTheme(getTheme("light"), {
      typography: { label: { lineHeight: 30 } },
    });
    expect(themeMetricFailures(tallLabel)).toEqual([
      {
        group: "density",
        member: "controlHeight.sm",
        rule: "at-least",
        actual: 28,
        bound: 32,
      },
    ]);
    // Either line can set the bound; both raised to 30 ask for the same box.
    expect(themeMetricFailures(cramped(30))).toEqual(
      themeMetricFailures(tallLabel),
    );
    expect(themeMetricFailures(getTheme("light"))).toEqual([]);
  });

  it("is invisible to the other three checks", () => {
    expect(themeColorFailures(crampedField)).toEqual([]);
    expect(themeTypefaceFailures(crampedField)).toEqual([]);
    expect(themeContrastFailures(crampedField)).toEqual([]);
    expect(themeFailures(crampedField).map(({ kind }) => kind)).toEqual([
      "metric",
    ]);
  });

  it("passes every shipped set", () => {
    expect(shipped).toHaveLength(shippedThemes.length);
    shipped.forEach(([label, theme]) => {
      expect(themeMetricFailures(theme), label).toEqual([]);
    });
  });

  it("runs the executed example", () => {
    expect(crampedFieldFailures).toEqual([
      {
        group: "density",
        member: "controlHeight.sm",
        rule: "at-least",
        actual: 28,
        bound: 32,
      },
    ]);
  });
});
