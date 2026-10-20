import { describe, expect, it } from "vitest";
import {
  darkTheme,
  elevationShadow,
  focusRing,
  lightTheme,
} from "@gpuixui/tokens";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  clippedFocusRingStyle,
  controlFocusStyle,
  controlStyle,
  progressFillStyle,
  progressPercent,
  progressTrackStyle,
  progressValueText,
  PROGRESS_TONES,
  ratingStarStyle,
  ruleStyle,
  scrollStyle,
  sliderFillStyle,
  sliderInset,
  sliderRailStyle,
  sliderThumbStyle,
  sliderTrackStyle,
  splitCallerStyle,
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

  it("keeps the label out of a text selection, enabled or disabled", () => {
    // Plan 386: the runtime's root is selectable and only an explicit `none`
    // opts out, so a drag across a toggle used to select its label.
    expect(controlStyle(spec(), testTheme).userSelect).toBe("none");
    expect(controlStyle(spec({ disabled: true }), testTheme).userSelect).toBe(
      "none",
    );
  });

  it("switches the border and the ring to the destructive role when invalid", () => {
    expect(controlStyle(spec({ invalid: true }), testTheme).borderColor).toBe(
      testTheme.colors.destructive,
    );
    expect(
      controlFocusStyle(spec({ invalid: true }), testTheme).boxShadow,
    ).toMatchObject({ color: testTheme.colors.destructive });
  });

  it("keeps a field's surface when invalid and moves only its border", () => {
    // The bug guarded (plan 091): `invalid` filled the whole field with the
    // destructive role, so a failed validation painted a red input.
    const style = controlStyle(
      spec({ variant: fieldVariant, invalid: true }),
      testTheme,
    );
    expect(style.backgroundColor).toBe(testTheme.colors.input);
    expect(style.borderColor).toBe(testTheme.colors.destructive);
  });

  it("keeps the invalid border through hover and press", () => {
    const style = controlStyle(
      spec({ variant: fieldVariant, invalid: true }),
      testTheme,
    );
    expect(style.hover?.borderColor).toBe(testTheme.colors.destructive);
    expect(style.active?.borderColor).toBe(testTheme.colors.destructive);
  });

  it("does not add a border to a filled variant when invalid", () => {
    const style = controlStyle(spec({ invalid: true }), testTheme);
    expect(style.backgroundColor).toBe(testTheme.colors.primary);
    expect(style.borderWidth).toBe(0);
    expect(style.hover?.borderColor).toBeUndefined();
    expect(style.active?.borderColor).toBeUndefined();
  });

  it("keeps a valid field's surface and its hover border", () => {
    const style = controlStyle(spec({ variant: fieldVariant }), testTheme);
    expect(style.backgroundColor).toBe(testTheme.colors.input);
    expect(style.borderColor).toBe(testTheme.colors.border);
    expect(style.hover?.borderColor).toBe(testTheme.colors.borderStrong);
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

  it("puts the ring it is given inside the edge of a clipped surface", () => {
    // Plan 344: an attached ButtonGroup clips at its buttons' outer edge, so
    // the ring painted outside a button was cut away. The overlay sits on the
    // button and draws the same ring as an inside border; Button passes the
    // recipe's ring (plan 370), so the two cannot drift apart.
    const ring = focusRing(testTheme).boxShadow;
    const inner = clippedFocusRingStyle(ring);
    expect(inner.borderWidth).toBe(ring.spreadRadius);
    expect(inner.borderColor).toBe(ring.color);
    expect(inner.position).toBe("absolute");
    expect(inner.pointerEvents).toBe("none");
    expect([inner.top, inner.right, inner.bottom, inner.left]).toStrictEqual([
      0, 0, 0, 0,
    ]);
    expect(inner.boxShadow).toBeUndefined();
    expect(inner.width).toBeUndefined();
    expect(inner.height).toBeUndefined();
  });

  it("paints no ring for a control that cannot act", () => {
    // Plan 332: focus outlives `disabled`, so a disabled control used to keep
    // its ring while the fields dropped theirs.
    expect(controlFocusStyle(spec({ disabled: true }), testTheme)).toEqual({});
    expect(
      sliderThumbStyle({ size: "md", focused: true, disabled: true }, testTheme)
        .boxShadow,
    ).toBeUndefined();
    expect(
      ratingStarStyle({ size: "md", focused: true, disabled: true }, testTheme)
        .boxShadow,
    ).toBeUndefined();
    // The enabled direction still rings, so the cases above cannot pass by the
    // painter having lost its ring entirely.
    expect(
      sliderThumbStyle({ size: "md", focused: true }, testTheme).boxShadow,
    ).toBeDefined();
    expect(
      ratingStarStyle({ size: "md", focused: true }, testTheme).boxShadow,
    ).toBeDefined();
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

  it("sends every public alignment in the runtime's own vocabulary", () => {
    // The bug guarded (plan 365): `end` was passed through verbatim, and the
    // runtime maps only center/right/left/start — so it painted as `start`.
    expect(
      text({ role: "body", tone: "default", align: "start" }).textAlign,
    ).toBe("start");
    expect(
      text({ role: "body", tone: "default", align: "center" }).textAlign,
    ).toBe("center");
    expect(
      text({ role: "body", tone: "default", align: "end" }).textAlign,
    ).toBe("right");
  });

  it("paints the inline decorations it is given, and none by default", () => {
    // The gap guarded (plan 377): `StyleDesc` paints underline and line-through,
    // but `Text` had no prop for either.
    expect(
      text({ role: "body", tone: "default" }).textDecoration,
    ).toBeUndefined();
    expect(
      text({ role: "body", tone: "default", decoration: "underline" })
        .textDecoration,
    ).toBe("underline");
    expect(
      text({ role: "body", tone: "default", decoration: "line-through" })
        .textDecoration,
    ).toBe("line-through");
  });

  it("truncates on one line, and clamps on several", () => {
    const truncated = text({ role: "body", tone: "default", truncate: true });
    expect(truncated.whiteSpace).toBe("nowrap");
    expect(truncated.textOverflow).toBe("ellipsis");
    const clamped = text({ role: "body", tone: "default", clamp: 2 });
    // The runtime's `lineClamp` is shared between identical strings, so the cap
    // is the element's own height (plan 082).
    expect(clamped.lineClamp).toBeUndefined();
    expect(clamped.whiteSpace).toBe("normal");
    expect(clamped.maxHeight).toBe(2 * testTheme.typography.body.lineHeight);
    expect(clamped.overflow).toBe("hidden");
  });

  it("caps a clamp on the role's own line height", () => {
    const clamped = text({ role: "codeBlock", tone: "default", clamp: 3 });
    expect(clamped.maxHeight).toBe(
      3 * testTheme.typography.codeBlock.lineHeight,
    );
  });

  it("lifts the shrink floor only when a content-sized track needs it", () => {
    // The bug guarded (plan 587): the published runtime sizes a
    // `max-content` track from a child's minimum width, so the shrink floor
    // plan 383 added made a `Text` cell measure 0. `shrink: false` restores the
    // runtime's automatic floor without changing the default.
    expect(text({ role: "body", tone: "default" }).minWidth).toBe(0);
    expect(
      text({ role: "body", tone: "default", shrink: false }).minWidth,
    ).toBe("auto");
  });

  it("refuses a clamp that would collapse the text", () => {
    Arr.forEach([0, -2, Number.NaN, Number.POSITIVE_INFINITY], (clamp) => {
      const style = text({ role: "body", tone: "default", clamp });
      expect(style.maxHeight).toBeUndefined();
      expect(style.overflow).toBeUndefined();
    });
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
    expect(style.alignSelf).toBe("stretch");
    expect(style.marginLeft).toBe(testTheme.spacing.md);
    expect(style.marginRight).toBe(testTheme.spacing.md);
  });

  it("draws a vertical rule one border wide and does not shrink", () => {
    const style = ruleStyle({ orientation: "vertical" }, testTheme);
    expect(style.width).toBe(testTheme.borderWidth.thin);
    expect(style.height).toBeUndefined();
    expect(style.flexShrink).toBe(0);
    expect(style.alignSelf).toBe("stretch");
    expect(style.backgroundColor).toBe(testTheme.colors.border);
  });
});

describe("scrollStyle", () => {
  it("defaults an omitted axis to vertical", () => {
    // Plan 397: the docs and `renderScrollArea` both promise this default, but
    // `ScrollSpec.axis` was required, so typed callers could not use it.
    expect(scrollStyle({})).toStrictEqual(scrollStyle({ axis: "vertical" }));
  });

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

  it("announces a whole percentage, not the float a computed value carries", () => {
    // Plan 755: a caller feeding (loaded / total) * 100 made the bar announce
    // "33.333333333333336%" — the paint stays exact, the sentence rounds.
    expect(progressValueText(100 / 3)).toBe("33%");
    expect(progressValueText(42)).toBe("42%");
    expect(progressValueText(99.6)).toBe("100%");
    expect(progressValueText(-0.4)).toBe("0%");
    expect(progressValueText(140.5)).toBe("100%");
    expect(progressValueText(Number.NaN)).toBe("0%");
    expect(progressValueText(Number.POSITIVE_INFINITY)).toBe("100%");
    expect(progressValueText(Number.NEGATIVE_INFINITY)).toBe("0%");
  });

  it("announces the caller's sentence when the bar stands for a quantity", () => {
    // Plan 780: 42% of a file copy says nothing about how many files are left.
    expect(progressValueText(42, "3 of 10 files")).toBe("3 of 10 files");
    expect(progressValueText(100 / 3, "a third")).toBe("a third");
  });

  it("falls back to the percentage when the caller's sentence says nothing", () => {
    // A computed unit string can be missing; blank is absence, not a silence.
    expect(progressValueText(42, "   ")).toBe("42%");
    expect(progressValueText(100 / 3, "")).toBe("33%");
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
    const rail = sliderRailStyle(testTheme);
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

  it("paints a ring on a focused thumb, at the token ring colour", () => {
    const focused = sliderThumbStyle({ ...spec, focused: true }, testTheme);
    expect(focused.boxShadow?.color).toBe(testTheme.colors.ring);
    expect(sliderThumbStyle(spec, testTheme).boxShadow).toBeUndefined();
  });

  it("gives the track — the element that owns the press — a hover and press wash", () => {
    // The bug guarded (plan 361): the track carries the cursor, the press and
    // the captured drag, yet declared no pointer feedback, so the only control
    // in the library that answered a hover with nothing was a slider.
    const track = sliderTrackStyle(spec, testTheme);
    expect(track.hover?.backgroundColor).toBe(testTheme.colors.hover);
    expect(track.active?.backgroundColor).toBe(testTheme.colors.active);
    expect(track.borderRadius).toBe(testTheme.radius.sm);
  });

  it("declares no wash on a disabled track, which cannot act", () => {
    const track = sliderTrackStyle({ ...spec, disabled: true }, testTheme);
    expect(track.hover).toBeUndefined();
    expect(track.active).toBeUndefined();
    expect(track.opacity).toBe(0.5);
    expect(track.cursor).toBe("not-allowed");
  });
});

describe("splitCallerStyle", () => {
  it("puts every margin on the anchor and nothing else", () => {
    // A floating layer anchors to the root that hugs its trigger (plan 060), so
    // a caller's margin belongs to that root; a margin on the trigger would
    // move the icon inside the anchor and leave the tip behind (plan 695).
    const split = splitCallerStyle({
      margin: 4,
      marginLeft: 12,
      height: 40,
      backgroundColor: "#123456",
    });
    expect(split.margin).toStrictEqual({ margin: 4, marginLeft: 12 });
    expect(split.body).toStrictEqual({
      height: 40,
      backgroundColor: "#123456",
    });
  });

  it("returns empty halves for a style that has neither", () => {
    expect(splitCallerStyle({})).toStrictEqual({ margin: {}, body: {} });
    expect(splitCallerStyle({ marginTop: 2 })).toStrictEqual({
      margin: { marginTop: 2 },
      body: {},
    });
  });
});
