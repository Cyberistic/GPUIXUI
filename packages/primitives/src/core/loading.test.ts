import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  indeterminateFillStyle,
  indeterminateLeadStyle,
  indeterminateOffset,
  PULSE_STEPS,
  pulseOpacity,
  skeletonStyle,
  SPINNER_SEGMENTS,
  spinnerDotStyle,
  spinnerDots,
} from "./loading.js";
import { testTheme } from "./testing/theme.fixture.js";

/**
 * Guards the discrete-step loading indicators.
 *
 * The runtime cannot rotate or interpolate a colour (plan 020 §1.2), so these
 * indicators move by stepping a number. That makes the step function the whole
 * behaviour: if it stops advancing, wraps wrongly, or lights two dots at once,
 * the indicator is frozen or nonsensical and nothing else in the pipeline
 * notices.
 */

describe("pulseOpacity", () => {
  it("alternates within its cycle and repeats", () => {
    const first = pulseOpacity(0);
    expect(first).toBe(1);
    expect(pulseOpacity(1)).toBeLessThan(first);
    expect(pulseOpacity(PULSE_STEPS)).toBe(first);
  });
});

describe("skeletonStyle", () => {
  it("reads as absence: the skeleton role, never the surface", () => {
    const style = skeletonStyle({}, testTheme);
    expect(style.backgroundColor).toBe(testTheme.colors.skeleton);
    expect(style.backgroundColor).not.toBe(testTheme.colors.card);
  });

  it("takes width, height and radius from the caller or the theme", () => {
    const style = skeletonStyle(
      { width: 120, height: 8, radius: "md" },
      testTheme,
    );
    expect(style.width).toBe(120);
    expect(style.height).toBe(8);
    expect(style.borderRadius).toBe(testTheme.radius.md);
    expect(skeletonStyle({}, testTheme).height).toBe(
      testTheme.typography.body.lineHeight,
    );
  });

  it("rounds a circle placeholder", () => {
    expect(skeletonStyle({ circle: true }, testTheme).borderRadius).toBe(
      testTheme.radius.full,
    );
  });

  it("makes a circle as wide as it is tall", () => {
    // The bug guarded (plan 330): `circle` only changed the radius, so the
    // default `100%` width painted a pill.
    const circle = skeletonStyle({ circle: true }, testTheme);
    expect(circle.width).toBe(circle.height);
    expect(circle.width).toBe(testTheme.typography.body.lineHeight);
    // an explicit width still wins, and a plain block stays full width
    expect(skeletonStyle({ circle: true, width: 40 }, testTheme).width).toBe(
      40,
    );
    expect(skeletonStyle({}, testTheme).width).toBe("100%");
  });

  it("falls back to the dimension's default when a pixel length is unusable", () => {
    // The bug guarded (plan 371): a `NaN` height reached the runtime, which
    // dropped it, and the placeholder painted zero high.
    const line = testTheme.typography.body.lineHeight;
    expect(skeletonStyle({ height: Number.NaN }, testTheme).height).toBe(line);
    expect(skeletonStyle({ width: Number.NaN }, testTheme).width).toBe("100%");
    expect(skeletonStyle({ height: -8 }, testTheme).height).toBe(line);
    // A percentage is the caller's own layout and passes through.
    expect(
      skeletonStyle({ width: "50%", height: "30%" }, testTheme),
    ).toMatchObject({ width: "50%", height: "30%" });
  });

  it("gives up width in a row but never its own height", () => {
    // The bug guarded (plan 384): `width: "100%"` plus `flexShrink: 0` painted
    // a default line 46 px outside a 220 px row, and an over-full column
    // squashed explicit heights once the item could shrink.
    const line = skeletonStyle({ height: 12 }, testTheme);
    expect(line.flexShrink).toBe(1);
    expect(line.minHeight).toBe(12);
    expect(skeletonStyle({ width: "60%" }, testTheme).flexShrink).toBe(1);
    // An explicit size is the caller's, and a circle's width is its height.
    expect(skeletonStyle({ width: 40 }, testTheme).flexShrink).toBe(0);
    const circle = skeletonStyle({ circle: true }, testTheme);
    expect(circle.flexShrink).toBe(0);
    expect(circle.minHeight).toBe(circle.height);
  });
});

describe("spinnerDots", () => {
  it("lights exactly one dot per step", () => {
    const lit = Arr.map(Arr.range(0, 15), (step) =>
      Arr.filter(spinnerDots(step), (dot) => dot.active),
    );
    expect(Arr.every(lit, (dots) => dots.length === 1)).toBe(true);
  });

  it("advances the lit dot each step and wraps", () => {
    const active = (step: number) =>
      Option.getOrElse(
        Arr.findFirstIndex(spinnerDots(step), (dot) => dot.active),
        () => -1,
      );
    expect(active(0)).not.toBe(active(1));
    expect(active(3)).toBe(active(0));
  });

  it("keeps every dot visible and the active one fully opaque", () => {
    const dots = spinnerDots(4);
    expect(Arr.every(dots, (dot) => dot.opacity >= 0.2)).toBe(true);
    const active = Option.getOrElse(
      Arr.findFirst(dots, (dot) => dot.active),
      () => ({ opacity: -1, active: false }),
    );
    expect(active.opacity).toBe(1);
  });

  it("tints the lit dot with the accent and the rest with the muted role", () => {
    const dots = spinnerDots(0);
    const lit = Arr.filter(dots, (dot) => dot.active);
    const rest = Arr.filter(dots, (dot) => !dot.active);
    const spec = { size: 6, accent: "primary" } as const;
    const litPaint = Arr.map(lit, (dot) =>
      spinnerDotStyle(spec, dot, testTheme),
    );
    const restPaint = Arr.map(rest, (dot) =>
      spinnerDotStyle(spec, dot, testTheme),
    );
    expect(
      Arr.every(
        litPaint,
        (s) => s.backgroundColor === testTheme.colors.primary,
      ),
    ).toBe(true);
    expect(
      Arr.every(
        restPaint,
        (s) => s.backgroundColor === testTheme.colors.mutedForeground,
      ),
    ).toBe(true);
  });

  it("paints a usable dot when the requested side cannot be painted", () => {
    // The bug guarded (plan 371): a `NaN` side was dropped by the runtime, so
    // every dot lost its width and the spinner painted a zero-high row.
    const dot = { active: true, opacity: 1 } as const;
    const fallback = testTheme.iconSize.md;
    Arr.forEach([Number.NaN, Number.POSITIVE_INFINITY, -6], (size) => {
      const style = spinnerDotStyle(
        { size, accent: "primary" },
        dot,
        testTheme,
      );
      expect(style.width).toBe(fallback);
      expect(style.height).toBe(fallback);
    });
    expect(
      spinnerDotStyle({ size: 0, accent: "primary" }, dot, testTheme).width,
    ).toBe(0);
  });
});

describe("indeterminateOffset", () => {
  const segment = 40;

  it("stays inside the track for the whole cycle", () => {
    const offsets = Arr.map(Arr.range(0, 64), (step) =>
      indeterminateOffset(step, segment),
    );
    expect(
      Arr.every(offsets, (value) => value >= 0 && value <= 100 - segment),
    ).toBe(true);
    // The cycle visits one distinct offset per segment step, so the bar is
    // never still and never repeats a position inside a cycle.
    expect(new Set(offsets).size).toBe(SPINNER_SEGMENTS);
  });

  it("moves and then wraps, so the bar is never still", () => {
    expect(indeterminateOffset(1, segment)).toBeGreaterThan(
      indeterminateOffset(0, segment),
    );
    expect(indeterminateOffset(8, segment)).toBe(
      indeterminateOffset(0, segment),
    );
  });

  it("never paints the segment past the end of the track", () => {
    const max = Math.max(
      ...Arr.map(Arr.range(0, 40), (s) => indeterminateOffset(s, segment)),
    );
    expect(max + segment).toBeLessThanOrEqual(100);
  });

  it("cannot travel when the segment fills the track", () => {
    expect(indeterminateOffset(3, 100)).toBe(0);
  });

  it("moves the segment with a percentage-width spacer, not a pixel offset", () => {
    const offset = indeterminateOffset(3, segment);
    expect(indeterminateLeadStyle(offset).width).toBe(`${offset}%`);
    expect(
      indeterminateFillStyle(segment, testTheme.colors.primary, testTheme)
        .width,
    ).toBe(`${segment}%`);
  });
});
