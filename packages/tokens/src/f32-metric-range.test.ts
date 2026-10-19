/**
 * Guards the defect plan 646 fixes: the numeric contract checked
 * `Number.isFinite`, which is true for a JavaScript number beyond `f32`'s
 * range. The renderer casts every metric with `value as f32`
 * (`references/gpuix/packages/native/src/renderer.rs`), so `1e39` became an
 * infinity Taffy rejects and the element painted nothing while every check
 * returned `[]`; `1e-50` became zero, so a positive surface size painted
 * nothing while `positive` passed. A huge `density.rowHeight` also cascaded
 * into four dependent bounds that blamed the rows and surfaces. Every case
 * below returns `[]` on the pre-fix tree and the named failure after it.
 */
import { describe, expect, it } from "vitest";
import { themeMetricFailures } from "./metrics.js";
import { shippedThemes } from "./shipped-themes.js";
import { themeFailures } from "./theme-check.js";
import { extendTheme, getTheme, type ThemeOverrides } from "./theme.js";

/** The largest finite `f32`; the next representable value is infinity. */
const f32Max = 3.4028234663852886e38;

/** Above `f32Max`, so the renderer's cast produces an infinity. */
const overflow = 3.4028236e38;

/** Below the smallest `f32` subnormal, so the cast produces zero. */
const underflow = 1e-50;

const light = getTheme("light");

const themed = (overrides: ThemeOverrides) => extendTheme(light, overrides);

describe("a metric the renderer can paint", () => {
  it("clears every shipped theme, platform variant and recipe", () => {
    shippedThemes.forEach(({ theme }) => {
      expect(themeMetricFailures(theme), theme.name).toEqual([]);
    });
  });

  it("accepts the largest finite f32", () => {
    expect(themeMetricFailures(themed({ radius: { full: f32Max } }))).toEqual(
      [],
    );
  });

  it("reports the first value past it", () => {
    expect(themeMetricFailures(themed({ radius: { full: overflow } }))).toEqual(
      [
        {
          group: "radius",
          member: "full",
          rule: "finite",
          actual: overflow,
          bound: 0,
        },
      ],
    );
  });

  it("reports an overflow in every group as one finite failure", () => {
    const cases: ReadonlyArray<{
      readonly group: string;
      readonly member: string;
      readonly overrides: ThemeOverrides;
    }> = [
      {
        group: "spacing",
        member: "5xl",
        overrides: { spacing: { "5xl": overflow } },
      },
      {
        group: "borderWidth",
        member: "strong",
        overrides: { borderWidth: { strong: overflow } },
      },
      {
        group: "iconSize",
        member: "xl",
        overrides: { iconSize: { xl: overflow } },
      },
      {
        group: "avatarSize",
        member: "lg",
        overrides: { avatarSize: { lg: overflow } },
      },
      {
        group: "dimensions",
        member: "toastWidth",
        overrides: { dimensions: { toastWidth: overflow } },
      },
      {
        group: "typography",
        member: "display.fontSize",
        overrides: { typography: { display: { fontSize: overflow } } },
      },
      {
        group: "elevation",
        member: "md[0].offsetY",
        overrides: {
          elevation: {
            md: [
              {
                offsetX: 0,
                offsetY: overflow,
                blurRadius: 12,
                spreadRadius: -2,
                alpha: 0.12,
              },
            ],
          },
        },
      },
      {
        group: "motion",
        member: "slow",
        overrides: { motion: { slow: overflow } },
      },
    ];

    cases.forEach(({ group, member, overrides }) => {
      expect(themeMetricFailures(themed(overrides)), member).toEqual([
        {
          group,
          member,
          rule: "finite",
          actual: overflow,
          bound: 0,
        },
      ]);
    });
  });

  it("does not blame the rows a huge row height would fail to contain", () => {
    const failures = themeMetricFailures(
      themed({ density: { rowHeight: overflow } }),
    );

    expect(failures).toEqual([
      {
        group: "density",
        member: "rowHeight",
        rule: "finite",
        actual: overflow,
        bound: 0,
      },
    ]);
  });

  it("does not invert a ladder around a huge type size", () => {
    const failures = themeMetricFailures(
      themed({
        typography: {
          body: { fontSize: overflow, lineHeight: overflow },
        },
      }),
    );

    expect(failures.map(({ member, rule }) => [member, rule])).toEqual([
      ["body.fontSize", "finite"],
      ["body.lineHeight", "finite"],
    ]);
  });

  it("does not invent a corner bound from a huge avatar", () => {
    const failures = themeMetricFailures(
      themed({ avatarSize: { lg: overflow } }),
    );

    expect(failures).toEqual([
      {
        group: "avatarSize",
        member: "lg",
        rule: "finite",
        actual: overflow,
        bound: 0,
      },
    ]);
  });

  it("reports a positive surface size that rounds to zero", () => {
    expect(
      themeMetricFailures(themed({ dimensions: { toastWidth: underflow } })),
    ).toEqual([
      {
        group: "dimensions",
        member: "toastWidth",
        rule: "positive",
        actual: underflow,
        bound: 0,
      },
    ]);
  });

  it("tags the overflow in the total check", () => {
    const failures = themeFailures(
      themed({ borderWidth: { strong: overflow } }),
    );

    expect(failures.map(({ kind }) => kind)).toEqual(["metric"]);
  });
});
