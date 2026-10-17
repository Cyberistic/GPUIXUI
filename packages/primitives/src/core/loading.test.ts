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
