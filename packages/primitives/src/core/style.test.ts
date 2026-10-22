import { describe, expect, it } from "vitest";
import {
  darkTheme,
  disabledAction,
  elevationShadow,
  lightTheme,
} from "@gpuixui/tokens";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  clampLines,
  controlFocusStyle,
  controlStyle,
  fieldTextStyle,
  progressFillStyle,
  progressPercent,
  progressTrackStyle,
  PROGRESS_TONES,
  ruleStyle,
  scrollStyle,
  sliderFillStyle,
  sliderInset,
  sliderRailStyle,
  sliderThumbStyle,
  sliderTrackStyle,
  surfaceStyle,
  textStyle,
  TEXT_TONES,
  type ControlSpec,
} from "./style.js";
import { buttonVariants, BUTTON_VARIANTS, fieldVariant } from "./variants.js";
import { testTheme } from "./testing/theme.fixture.js";
import type { PrimitiveTheme } from "./theme.js";

/**
 * Guards the theme-role → GPUix `StyleDesc` boundary.
 *
 * GPUix has no CSS, so this function is the entire design system's runtime. A
 * bug here is invisible in review and obvious on screen: the wrong role, a
 * colour that ignores the theme, hover feedback that never appears, a progress
 * fill that paints past its track.
 *
 * The "reads the theme it is given" test is the anti-tautology guard for the
 * rest: it changes the fixture and requires the resolved value to change, so a
 * resolver that quietly hard-codes a colour cannot pass.
 *
 * The `@gpuixui/tokens` block guards PLAN.md D17: the ring geometry and the
 * elevation rule come from the tokens package, not from a local copy. The
 * widened-border test fails if a local ring constant returns.
 */

const spec = (over: Partial<ControlSpec> = {}): ControlSpec => ({
  variant: buttonVariants.primary,
  size: "md",
  ...over,
});

/** The outline width a control declares, if it declares one. */
const outlineWidthOf = (style: ReturnType<typeof controlFocusStyle>): number =>
  style.focusVisible?.outlineWidth ?? 0;

/**
 * The paint a variant declares for an interaction: a change of fill, of border
 * or of decoration. Flattening those fields makes "no feedback at all" visible
 * without inventing a sentinel colour.
 */
const feedbackOf = (style: ReturnType<typeof controlStyle>): string =>
  Arr.join(
    Arr.getSomes(
      Arr.map(
        [style.backgroundColor, style.borderColor, style.textDecoration],
        Option.fromNullishOr,
      ),
    ),
    "|",
  );

describe("controlStyle", () => {
  it("paints the variant's roles, from the theme and not from a literal", () => {
    const { backgroundColor, color } = controlStyle(spec(), testTheme);
    expect(backgroundColor).toBe(testTheme.colors.primary);
    expect(color).toBe(testTheme.colors.primaryForeground);
  });

  it("reads the theme it is given", () => {
    const repainted: PrimitiveTheme = {
      ...testTheme,
      colors: { ...testTheme.colors, primary: "#FF00FF" },
    };
    expect(controlStyle(spec(), repainted).backgroundColor).toBe("#FF00FF");
  });

  it("leaves an outline control unpainted but keeps its measured edge", () => {
    const style = controlStyle(
      spec({ variant: buttonVariants.outline }),
      testTheme,
    );
    expect(style.backgroundColor).toBeUndefined();
    expect(style.borderWidth).toBe(testTheme.borderWidth.thin);
    // A control's shape is functional: `borderStrong` is the role the boundary
    // pairs measure, not the decorative `border` a divider paints.
    expect(style.borderColor).toBe(testTheme.colors.borderStrong);
  });

  it("sizes the control from the theme's density, not from a literal", () => {
    expect(controlStyle(spec(), testTheme).height).toBe(
      testTheme.density.controlHeight.md,
    );
    const compact = controlStyle(spec({ size: "sm" }), testTheme);
    expect(compact.height).toBe(testTheme.density.controlHeight.sm);
    expect(compact.paddingLeft).toBe(testTheme.density.controlPaddingX.sm);
  });

  it("takes its label type from the theme's typography", () => {
    const style = controlStyle(spec(), testTheme);
    expect(style.fontSize).toBe(testTheme.typography.label.fontSize);
    expect(style.fontWeight).toBe(testTheme.typography.label.fontWeight);
  });

  it("squares an icon-only control and drops its padding", () => {
    const style = controlStyle(spec({ square: true }), testTheme);
    expect(style.width).toBe(style.height);
    expect(style.paddingLeft).toBe(0);
    expect(style.paddingRight).toBe(0);
  });

  it("stretches to the container when asked", () => {
    expect(controlStyle(spec({ fullWidth: true }), testTheme).width).toBe(
      "100%",
    );
  });

  it("replaces a disabled filled action's fade with the measured neutral pair", () => {
    // The bug: a disabled filled action faded itself to 50%, which composites
    // the label into whatever is behind the control — 1.47:1–1.49:1 on the
    // card of four light styles (`disabled.test.ts` in `@gpuixui/tokens`). The
    // neutral pair is the one `contrastPairs` measures on every surface a
    // control sits on.
    const style = controlStyle(spec({ disabled: true }), testTheme);
    expect(style.cursor).toBe("not-allowed");
    const pair = disabledAction(testTheme);
    expect(style.backgroundColor).toBe(pair.backgroundColor);
    expect(style.color).toBe(pair.color);
    expect(style.opacity).toBeUndefined();
    // The press, or the hover, must not look like it did anything.
    expect(style.hover?.backgroundColor).toBe(style.backgroundColor);
    expect(style.active?.backgroundColor).toBe(style.backgroundColor);
  });

  it("keeps the fade where there is no filled action to collapse", () => {
    // A field is measured on every content surface it sits on and clears the
    // floor there; an unfilled control has no fill to swap for the pair.
    Arr.forEach([fieldVariant, buttonVariants.ghost] as const, (variant) => {
      const style = controlStyle(spec({ variant, disabled: true }), testTheme);
      expect(style.opacity).toBe(0.5);
      // The label is not swapped for the disabled role: the fade is the state.
      expect(style.color).not.toBe(testTheme.colors.disabledForeground);
      expect(style.hover?.backgroundColor).toBe(style.backgroundColor);
      expect(style.active?.backgroundColor).toBe(style.backgroundColor);
    });
  });

  it("switches the border and the ring to the destructive role when invalid", () => {
    expect(controlStyle(spec({ invalid: true }), testTheme).borderColor).toBe(
      testTheme.colors.destructive,
    );
    expect(
      controlFocusStyle(spec({ invalid: true }), testTheme).focusVisible,
    ).toMatchObject({ outlineColor: testTheme.colors.destructive });
  });

  it("gives every variant a distinct resting appearance", () => {
    const appearances = Arr.map(BUTTON_VARIANTS, (variant) => {
      const style = controlStyle(
        spec({ variant: buttonVariants[variant] }),
        testTheme,
      );
      return `${style.backgroundColor}/${style.color}/${style.borderWidth}/${style.borderColor}`;
    });
    expect(new Set(appearances).size).toBe(BUTTON_VARIANTS.length);
  });

  it("gives every variant pointer feedback on hover and on press", () => {
    const silent = Arr.filter(
      BUTTON_VARIANTS,
      (variant) =>
        feedbackOf(buttonVariants[variant].hover(testTheme)) === "" ||
        feedbackOf(buttonVariants[variant].active(testTheme)) === "",
    );
    expect(silent).toEqual([]);
  });

  it("declares the keyboard ring at rest, without moving anything", () => {
    const ring = controlFocusStyle(spec(), testTheme);
    expect(ring.focusVisible).toEqual({
      outlineWidth: testTheme.borderWidth.strong,
      outlineColor: testTheme.colors.ring,
      outlineOffset: 0,
    });
    // An outline takes no layout space; a shadow ring would have had to be
    // merged on focus, which is what this removes.
    expect(ring.boxShadow).toBeUndefined();
  });

  it("declares no ring for a disabled control", () => {
    // A control disabled while focused keeps the runtime's focus; the ring must
    // not stay painted on an element that can no longer act.
    expect(
      controlFocusStyle(spec({ disabled: true }), testTheme),
    ).toStrictEqual({});
    expect(
      controlFocusStyle(spec({ disabled: true, invalid: true }), testTheme),
    ).toStrictEqual({});
  });

  it("warns the eye at rest for a field, and declares the keyboard ring", () => {
    expect(
      controlStyle(spec({ variant: fieldVariant }), testTheme).borderColor,
    ).toBe(testTheme.colors.border);
    expect(
      controlFocusStyle(spec({ variant: fieldVariant }), testTheme)
        .focusVisible,
    ).toMatchObject({ outlineColor: testTheme.colors.ring });
  });
});

describe("the tokens package owns the theme", () => {
  /** The fixture with one number changed: the ring must follow it. */
  const widened: PrimitiveTheme = {
    ...testTheme,
    borderWidth: { thin: testTheme.borderWidth.thin, strong: 5 },
  };

  it("takes the outline's width from borderWidth.strong, not a local constant", () => {
    const ring = controlFocusStyle(spec(), widened);
    expect(outlineWidthOf(ring)).toBe(widened.borderWidth.strong);
    expect(outlineWidthOf(ring)).not.toBe(testTheme.borderWidth.strong);
  });

  it("recolours an invalid ring without changing its geometry", () => {
    const invalid = controlFocusStyle(spec({ invalid: true }), widened);
    expect(invalid.focusVisible).toMatchObject({
      outlineWidth: widened.borderWidth.strong,
      outlineColor: widened.colors.destructive,
    });
  });

  it("resolves an elevation level with the tokens helper, and reserved levels paint nothing", () => {
    expect(
      surfaceStyle({ tone: "card", elevation: "md" }, testTheme).boxShadow,
    ).toEqual(elevationShadow(testTheme, "md"));
    expect(
      surfaceStyle({ tone: "card", elevation: "overlay" }, testTheme).boxShadow,
    ).toBeUndefined();
  });

  it("renders the shipped light and dark themes without an adapter", () => {
    expect(controlStyle(spec(), lightTheme).backgroundColor).toBe(
      lightTheme.colors.primary,
    );
    expect(controlStyle(spec(), darkTheme).backgroundColor).toBe(
      darkTheme.colors.primary,
    );
    expect(lightTheme.colors.primary).not.toBe(darkTheme.colors.primary);
  });
});

describe("textStyle", () => {
  const text = (over: Parameters<typeof textStyle>[0]) =>
    textStyle(over, testTheme);

  it("takes its size, weight and family from the theme's type role", () => {
    const style = text({ role: "h2", tone: "default" });
    expect(style.fontSize).toBe(testTheme.typography.h2.fontSize);
    expect(style.fontWeight).toBe(testTheme.typography.h2.fontWeight);
    expect(style.fontFamily).toBe(testTheme.typography.sans);
  });

  it("maps a muted tone to the muted foreground, not to the foreground", () => {
    const muted = text({ role: "body", tone: "muted" });
    expect(muted.color).toBe(testTheme.colors.mutedForeground);
    expect(muted.color).not.toBe(testTheme.colors.foreground);
  });

  it("resolves every declared tone", () => {
    const painted = Arr.map(
      TEXT_TONES,
      (tone) => text({ role: "body", tone }).color,
    );
    expect(new Set(painted).size).toBe(TEXT_TONES.length);
  });

  it("inherits the surrounding colour when asked to", () => {
    expect(text({ role: "body", tone: "inherit" }).color).toBeUndefined();
  });

  it("truncates on one line, and clamps on several", () => {
    const truncated = text({ role: "body", tone: "default", truncate: true });
    expect(truncated.whiteSpace).toBe("nowrap");
    expect(truncated.textOverflow).toBe("ellipsis");
    // `lineClamp` paints every line in 0.11.0 (measured by the playground's
    // `text-truncation` probe), so a clamp is a definite box instead: the role's
    // leading times the line count, with the overflow hidden.
    const clamped = text({ role: "body", tone: "default", clamp: 2 });
    expect(clamped.height).toBe(2 * testTheme.typography.body.lineHeight);
    expect(clamped.overflow).toBe("hidden");
    expect(clamped.lineClamp).toBeUndefined();
    expect(clamped.whiteSpace).toBe("normal");
  });

  it("reads a clamp it cannot lay out as one line", () => {
    // A count from a measurement that never arrived is not a zero-height box.
    expect(
      text({ role: "body", tone: "default", clamp: Number.NaN }).height,
    ).toBe(testTheme.typography.body.lineHeight);
    expect(text({ role: "body", tone: "default", clamp: 0 }).height).toBe(
      testTheme.typography.body.lineHeight,
    );
    expect(clampLines(2.9)).toBe(2);
  });

  it("switches font family for code roles", () => {
    expect(text({ role: "code", tone: "default" }).fontFamily).toBe(
      testTheme.typography.mono,
    );
  });

  it("leaves chrome unselectable and content selectable", () => {
    expect(text({ role: "body", tone: "default" }).userSelect).toBe("none");
    expect(
      text({ role: "body", tone: "default", selectable: true }).userSelect,
    ).toBe("text");
  });

  it("paints the design system's selection wash behind a selectable run", () => {
    // GPUix defaults `selectionColor` to the theme accent at 35%, which no
    // contrast pair measures; the `selection` role is the one the token
    // contract composites and holds to both floors.
    const selectable = text({
      role: "body",
      tone: "default",
      selectable: true,
    });
    expect(selectable.selectionColor).toBe(testTheme.colors.selection);
    expect(
      text({ role: "body", tone: "default" }).selectionColor,
    ).toBeUndefined();
    expect(fieldTextStyle(testTheme).selectionColor).toBe(
      testTheme.colors.selection,
    );
  });
});

describe("surfaceStyle", () => {
  it("takes padding and radius from the theme's scales", () => {
    const style = surfaceStyle(
      { tone: "card", padding: "lg", radius: "lg" },
      testTheme,
    );
    expect(style.padding).toBe(testTheme.spacing.lg);
    expect(style.borderRadius).toBe(testTheme.radius.lg);
    expect(style.backgroundColor).toBe(testTheme.colors.card);
  });

  it("paints no fill for a transparent surface", () => {
    expect(
      surfaceStyle({ tone: "none" }, testTheme).backgroundColor,
    ).toBeUndefined();
  });

  it("draws a border only when asked, and a dashed edge only when named", () => {
    const bordered = surfaceStyle({ tone: "card", border: true }, testTheme);
    expect(
      surfaceStyle({ tone: "card" }, testTheme).borderWidth,
    ).toBeUndefined();
    expect(bordered.borderWidth).toBe(testTheme.borderWidth.thin);
    expect(bordered.borderColor).toBe(testTheme.colors.border);
    // The default edge is the runtime's solid one; only an explicit dashed
    // border declares a style, and a style without a border is not a rule.
    expect(bordered.borderStyle).toBeUndefined();
    expect(
      surfaceStyle(
        { tone: "card", border: true, borderStyle: "solid" },
        testTheme,
      ).borderStyle,
    ).toBeUndefined();
    expect(
      surfaceStyle(
        { tone: "card", border: true, borderStyle: "dashed" },
        testTheme,
      ).borderStyle,
    ).toBe("dashed");
    expect(
      surfaceStyle({ tone: "card", borderStyle: "dashed" }, testTheme)
        .borderStyle,
    ).toBeUndefined();
  });

  it("lets an axis override the padding without losing the other sides", () => {
    const both = surfaceStyle(
      { tone: "card", padding: "lg", paddingX: "sm" },
      testTheme,
    );
    expect(both.padding).toBeUndefined();
    expect(both.paddingTop).toBe(testTheme.spacing.lg);
    expect(both.paddingBottom).toBe(testTheme.spacing.lg);
    expect(both.paddingLeft).toBe(testTheme.spacing.sm);
    expect(both.paddingRight).toBe(testTheme.spacing.sm);

    const axisOnly = surfaceStyle({ tone: "card", paddingY: "md" }, testTheme);
    expect(axisOnly.padding).toBeUndefined();
    expect(axisOnly.paddingTop).toBe(testTheme.spacing.md);
    expect(axisOnly.paddingBottom).toBe(testTheme.spacing.md);
    expect(axisOnly.paddingLeft).toBeUndefined();
    expect(axisOnly.paddingRight).toBeUndefined();
  });

  it("paints a ratio only when the renderer can divide by it", () => {
    expect(
      surfaceStyle({ tone: "card", aspectRatio: 16 / 9 }, testTheme)
        .aspectRatio,
    ).toBeCloseTo(16 / 9);
    Arr.forEach([0, -2, Number.NaN, Number.POSITIVE_INFINITY], (ratio) => {
      expect(
        surfaceStyle({ tone: "card", aspectRatio: ratio }, testTheme)
          .aspectRatio,
      ).toBeUndefined();
    });
  });

  it("raises a surface with the theme's shadow colour", () => {
    const flat = surfaceStyle({ tone: "card" }, testTheme);
    const raised = surfaceStyle({ tone: "card", elevation: "md" }, testTheme);
    expect(flat.boxShadow).toBeUndefined();
    expect(raised.boxShadow).toMatchObject({
      color: testTheme.elevation.md[0]?.color,
    });
  });
});

describe("ruleStyle", () => {
  it("draws a horizontal rule one border wide, inset by a spacing step", () => {
    const style = ruleStyle(
      { orientation: "horizontal", inset: "md" },
      testTheme,
    );
    expect(style.height).toBe(testTheme.borderWidth.thin);
    expect(style.width).toBeUndefined();
    expect(style.marginLeft).toBe(testTheme.spacing.md);
    expect(style.marginRight).toBe(testTheme.spacing.md);
  });

  it("draws a vertical rule one border wide and does not shrink", () => {
    const style = ruleStyle({ orientation: "vertical" }, testTheme);
    expect(style.width).toBe(testTheme.borderWidth.thin);
    expect(style.height).toBeUndefined();
    expect(style.flexShrink).toBe(0);
    expect(style.backgroundColor).toBe(testTheme.colors.border);
  });
});

describe("scrollStyle", () => {
  it("scrolls only the asked-for axis", () => {
    const vertical = scrollStyle({ axis: "vertical" });
    expect(vertical.overflowY).toBe("scroll");
    expect(vertical.overflowX).toBe("hidden");
    const horizontal = scrollStyle({ axis: "horizontal" });
    expect(horizontal.overflowX).toBe("scroll");
    expect(horizontal.overflowY).toBe("hidden");
  });

  it("scrolls both axes and leaves the theme's thumb paint to the viewport", () => {
    const both = scrollStyle({ axis: "both" });
    expect(both.overflowY).toBe("scroll");
    expect(both.overflowX).toBe("scroll");
    // This resolver is theme-free on purpose; `ScrollAreaViewport` is where the
    // `scrollbar` role becomes the runtime's `scrollbarColor` (proven in
    // `presentational.test.tsx` and `layout.runtime.test.tsx`).
    expect(Object.keys(both)).not.toContain("scrollbarColor");
  });
});

describe("progress", () => {
  it("clamps a value to the track instead of painting outside it", () => {
    expect(progressPercent(-25)).toBe(0);
    expect(progressPercent(250)).toBe(100);
    expect(progressPercent(42.5)).toBe(42.5);
  });

  it("treats a non-finite value as empty rather than full", () => {
    expect(progressPercent(Number.NaN)).toBe(0);
    expect(progressPercent(Number.POSITIVE_INFINITY)).toBe(100);
  });

  it("paints the fill at the clamped percentage", () => {
    const over = progressFillStyle(
      { value: 250, tone: "primary", size: "md" },
      testTheme,
    );
    expect(over.width).toBe("100%");
    expect(over.backgroundColor).toBe(testTheme.colors.primary);
  });

  it("gives each tone its own role", () => {
    const painted = Arr.map(
      PROGRESS_TONES,
      (tone) =>
        progressFillStyle({ value: 50, tone, size: "md" }, testTheme)
          .backgroundColor,
    );
    expect(new Set(painted).size).toBe(PROGRESS_TONES.length);
  });

  it("gives the track a fixed height from its size, not from the value", () => {
    const small = progressTrackStyle(
      { tone: "primary", size: "sm" },
      testTheme,
    );
    const medium = progressTrackStyle(
      { tone: "primary", size: "md" },
      testTheme,
    );
    expect(Number(small.height)).toBeLessThan(Number(medium.height));
    expect(small.backgroundColor).toBe(testTheme.colors.muted);
  });
});

describe("value controls", () => {
  const spec = { size: "md" } as const;

  it("insets the track by half a thumb and pulls the thumb back by the same amount", () => {
    // The bug guarded: without the negative margins every thumb paints half a
    // thumb to the right of the value it represents (plan 053 §6).
    const inset = sliderInset(spec.size, testTheme);
    const track = sliderTrackStyle(spec, testTheme);
    const thumb = sliderThumbStyle(spec, testTheme);
    expect(track.paddingLeft).toBe(inset);
    expect(track.paddingRight).toBe(inset);
    expect(thumb.marginLeft).toBe(-inset);
    expect(thumb.marginRight).toBe(-inset);
    expect(thumb.width).toBe(testTheme.iconSize[spec.size]);
  });

  it("paints no fill of its own, so the rail is the only visible chrome", () => {
    const track = sliderTrackStyle(spec, testTheme);
    expect(track.backgroundColor).toBeUndefined();
    expect(track.height).toBe(testTheme.density.controlHeight[spec.size]);
  });

  it("keeps the rail, the fill and the thumb out of the hit test", () => {
    // The deepest hit target wins in GPUix and events do not bubble, so a
    // painted child would swallow the press that maps to a value.
    const rail = sliderRailStyle(spec, testTheme);
    const fill = sliderFillStyle(0.5, spec, testTheme);
    const thumb = sliderThumbStyle(spec, testTheme);
    expect(rail.pointerEvents).toBe("none");
    expect(fill.pointerEvents).toBe("none");
    expect(thumb.pointerEvents).toBe("none");
  });

  it("paints the fill to its fraction and never outside the rail", () => {
    expect(sliderFillStyle(0.25, spec, testTheme).width).toBe("25%");
    expect(sliderFillStyle(2, spec, testTheme).width).toBe("100%");
    expect(sliderFillStyle(Number.NaN, spec, testTheme).width).toBe("0%");
    expect(sliderFillStyle(0.25, spec, testTheme).backgroundColor).toBe(
      testTheme.colors.primary,
    );
  });

  it("turns the track, rail, fill and thumb onto the vertical axis", () => {
    // The bug guarded: a value on a vertical track was still painted by the
    // horizontal recipe, so the fill grew sideways out of a bar one spacing
    // step wide and the thumb's half-side pull moved it off its own centre.
    const vertical = { size: "md", orientation: "vertical" } as const;
    const inset = sliderInset(vertical.size, testTheme);
    const track = sliderTrackStyle(vertical, testTheme);
    const rail = sliderRailStyle(vertical, testTheme);
    const fill = sliderFillStyle(0.25, vertical, testTheme);
    const thumb = sliderThumbStyle(vertical, testTheme);

    expect(track.flexDirection).toBe("column");
    expect(track.width).toBe(testTheme.density.controlHeight[vertical.size]);
    expect(track.height).toBe("100%");
    expect(track.paddingTop).toBe(inset);
    expect(track.paddingBottom).toBe(inset);
    expect(track.paddingLeft).toBeUndefined();

    expect(rail.flexDirection).toBe("column");
    expect(rail.justifyContent).toBe("flex-end");
    expect(rail.width).toBe(testTheme.spacing.xs);
    expect(rail.height).toBe("100%");

    expect(fill.height).toBe("25%");
    expect(fill.width).toBe("100%");

    expect(thumb.marginTop).toBe(-inset);
    expect(thumb.marginBottom).toBe(-inset);
    expect(thumb.marginLeft).toBeUndefined();
    expect(thumb.marginRight).toBeUndefined();
  });

  it("leaves the ring to the track, which is the slider's focus target", () => {
    // A thumb is not focusable, so a ring declared on it would never paint; the
    // single slider rings its track and the range slider rings each thumb.
    expect(sliderThumbStyle(spec, testTheme).focusVisible).toBeUndefined();
    expect(sliderThumbStyle(spec, testTheme).boxShadow).toBeUndefined();
  });
});
