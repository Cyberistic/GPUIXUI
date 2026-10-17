import { describe, expect, it } from "vitest";
import { darkTheme, elevationShadow, lightTheme } from "@gpuixui/tokens";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  controlFocusStyle,
  controlStyle,
  progressFillStyle,
  progressPercent,
  progressTrackStyle,
  PROGRESS_TONES,
  ruleStyle,
  scrollStyle,
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

/** The spread of a focused control's ring, if it has one. */
const spreadOf = (style: ReturnType<typeof controlFocusStyle>): number =>
  Option.getOrElse(
    Option.map(
      Option.fromNullishOr(style.boxShadow),
      (shadow) => shadow.spreadRadius,
    ),
    () => 0,
  );

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

  it("leaves an outline control unpainted but bordered", () => {
    const style = controlStyle(
      spec({ variant: buttonVariants.outline }),
      testTheme,
    );
    expect(style.backgroundColor).toBeUndefined();
    expect(style.borderWidth).toBe(testTheme.borderWidth.thin);
    expect(style.borderColor).toBe(testTheme.colors.border);
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

  it("removes pointer feedback while disabled, and dims", () => {
    const style = controlStyle(spec({ disabled: true }), testTheme);
    expect(style.cursor).toBe("not-allowed");
    expect(style.opacity).toBeLessThan(1);
    // The press, or the hover, must not look like it did anything.
    expect(style.hover?.backgroundColor).toBe(style.backgroundColor);
    expect(style.active?.backgroundColor).toBe(style.backgroundColor);
  });

  it("switches the border and the ring to the destructive role when invalid", () => {
    expect(controlStyle(spec({ invalid: true }), testTheme).borderColor).toBe(
      testTheme.colors.destructive,
    );
    expect(
      controlFocusStyle(spec({ invalid: true }), testTheme).boxShadow,
    ).toMatchObject({ color: testTheme.colors.destructive });
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

  it("rings a focused control, without moving anything", () => {
    const focused = controlFocusStyle(spec(), testTheme);
    expect(focused.boxShadow).toMatchObject({
      color: testTheme.colors.ring,
      offsetX: 0,
      offsetY: 0,
      blurRadius: 0,
    });
    expect(spreadOf(focused)).toBeGreaterThan(0);
  });

  it("warns the eye at rest for a field, and rings it when focused", () => {
    expect(
      controlStyle(spec({ variant: fieldVariant }), testTheme).borderColor,
    ).toBe(testTheme.colors.border);
    expect(
      controlFocusStyle(spec({ variant: fieldVariant }), testTheme).boxShadow,
    ).toMatchObject({ color: testTheme.colors.ring });
  });
});

describe("the tokens package owns the theme", () => {
  /** The fixture with one number changed: the ring must follow it. */
  const widened: PrimitiveTheme = {
    ...testTheme,
    borderWidth: { thin: testTheme.borderWidth.thin, strong: 5 },
  };

  it("takes the ring's spread from borderWidth.strong, not a local constant", () => {
    const focused = controlFocusStyle(spec(), widened);
    expect(spreadOf(focused)).toBe(widened.borderWidth.strong);
    expect(spreadOf(focused)).not.toBe(testTheme.borderWidth.strong);
  });

  it("recolours an invalid ring without changing its geometry", () => {
    const invalid = controlFocusStyle(spec({ invalid: true }), widened);
    expect(invalid.boxShadow).toMatchObject({
      spreadRadius: widened.borderWidth.strong,
      color: widened.colors.destructive,
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
    const clamped = text({ role: "body", tone: "default", clamp: 2 });
    expect(clamped.lineClamp).toBe(2);
    expect(clamped.whiteSpace).toBe("normal");
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

  it("draws a border only when asked, and never a border style the runtime lacks", () => {
    const bordered = surfaceStyle({ tone: "card", border: true }, testTheme);
    expect(
      surfaceStyle({ tone: "card" }, testTheme).borderWidth,
    ).toBeUndefined();
    expect(bordered.borderWidth).toBe(testTheme.borderWidth.thin);
    expect(bordered.borderColor).toBe(testTheme.colors.border);
    // GPUix 0.10.0 `StyleDesc` has no `borderStyle`; setting one would be a
    // silent no-op.
    expect(Object.keys(bordered)).not.toContain("borderStyle");
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

  it("scrolls both axes when asked, and tints nothing it cannot", () => {
    const both = scrollStyle({ axis: "both" });
    expect(both.overflowY).toBe("scroll");
    expect(both.overflowX).toBe("scroll");
    // The published runtime paints the thumb from the platform theme and has no
    // `scrollbarColor`; the resolver must not pretend otherwise.
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
