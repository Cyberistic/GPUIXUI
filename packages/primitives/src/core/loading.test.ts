import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  indeterminateFillStyle,
  indeterminateLeadStyle,
  indeterminateOffset,
  progressAnimates,
  PULSE_STEPS,
  pulseOpacity,
  skeletonSize,
  skeletonStyle,
  SPINNER_ACCENTS,
  SPINNER_DOTS,
  SPINNER_FADE_FLOOR,
  SPINNER_SEGMENTS,
  spinnerDotStyle,
  spinnerDots,
} from "./loading.js";
import {
  SPINNER_DOTS as coreSpinnerDots,
  SPINNER_FADE_FLOOR as coreSpinnerFloor,
} from "./index.js";
import { testTheme } from "./testing/theme.fixture.js";

/**
 * Guards the discrete-step loading indicators.
 *
 * The runtime cannot rotate or interpolate a colour (see `docs/gpuix-capabilities.md`), so these
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

  it("mirrors a circle's missing side so one explicit size stays round", () => {
    // The bug: width-only fell back to a line height, so a "circle" painted an
    // ellipse and every avatar placeholder was squashed.
    expect(skeletonSize({ circle: true, width: 40 }, testTheme)).toStrictEqual({
      width: 40,
      height: 40,
    });
    expect(skeletonSize({ circle: true, height: 40 }, testTheme)).toStrictEqual(
      { width: 40, height: 40 },
    );
    const line = testTheme.typography.body.lineHeight;
    expect(skeletonSize({ circle: true }, testTheme)).toStrictEqual({
      width: line,
      height: line,
    });
    // Two explicit sides are the caller's business, even if they differ.
    expect(
      skeletonSize({ circle: true, width: 40, height: 24 }, testTheme),
    ).toStrictEqual({ width: 40, height: 24 });
  });

  it("takes a side it cannot paint from the default, not from the box", () => {
    // The bug guarded: a placeholder's side is often a measurement, and a
    // measurement that never arrived reached `width` as `NaN`, which paints no
    // box at all — a skeleton that looks like content that finished loading.
    const line = testTheme.typography.body.lineHeight;
    Arr.forEach([Number.NaN, Number.POSITIVE_INFINITY, 0, -4], (side) => {
      expect(skeletonSize({ width: side }, testTheme)).toStrictEqual({
        width: "100%",
        height: line,
      });
      expect(skeletonSize({ height: side }, testTheme)).toStrictEqual({
        width: "100%",
        height: line,
      });
      expect(
        skeletonSize({ circle: true, width: side }, testTheme),
      ).toStrictEqual({ width: line, height: line });
    });
    // A length string is an expression, not a measurement, and stays.
    expect(skeletonSize({ width: "45%", height: "2% " }, testTheme)).toEqual({
      width: "45%",
      height: "2% ",
    });
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

  it("fades the trail to its floor and lights one dot per step of a turn", () => {
    // The bug guarded: the fade divided the trail's distance by the *bar's*
    // eight segments, so with three dots the dimmest trail dot was 0.75 and the
    // documented 0.2 floor was unreachable. The period was eight steps too, so
    // the eighth frame stepped the lit dot backwards (1 -> 0). The fade now
    // spans the row and a turn is the row's own length.
    expect(SPINNER_FADE_FLOOR).toBe(0.2);
    const opacities = Arr.map(spinnerDots(0), (dot) => dot.opacity);
    expect(Math.min(...opacities)).toBe(SPINNER_FADE_FLOOR);
    // Lit, the dot ahead (the fade's far end), then the one just behind it.
    expect(opacities).toStrictEqual([1, 0.2, 0.5]);
    const lit = Arr.map(Arr.range(0, SPINNER_DOTS - 1), (step) =>
      Option.getOrElse(
        Arr.findFirstIndex(spinnerDots(step), (dot) => dot.active),
        () => -1,
      ),
    );
    expect(lit).toStrictEqual([0, 1, 2]);
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

  it("paints the accent on every dot and fades the trail with opacity", () => {
    // A trail painted in the muted role put a grey dot on a filled control,
    // where only that fill's on-colour is legible; the accent is the dot, and
    // the step is the opacity.
    const dots = spinnerDots(0);
    const lit = Arr.filter(dots, (dot) => dot.active);
    const rest = Arr.filter(dots, (dot) => !dot.active);
    const spec = { size: 6, accent: "on-primary" } as const;
    const paint = Arr.map(dots, (dot) => spinnerDotStyle(spec, dot, testTheme));

    expect(
      Arr.every(
        paint,
        (s) => s.backgroundColor === testTheme.colors.primaryForeground,
      ),
    ).toBe(true);
    expect(Arr.every(lit, (dot) => dot.opacity === 1)).toBe(true);
    expect(Arr.every(rest, (dot) => dot.opacity < 1)).toBe(true);
  });

  it("resolves a fill's on-colour for every filled accent", () => {
    const dot = { active: true, opacity: 1 };
    const colourOf = (accent: (typeof SPINNER_ACCENTS)[number]): unknown =>
      spinnerDotStyle({ size: 6, accent }, dot, testTheme).backgroundColor;

    expect(colourOf("on-primary")).toBe(testTheme.colors.primaryForeground);
    expect(colourOf("on-secondary")).toBe(testTheme.colors.secondaryForeground);
    expect(colourOf("on-destructive")).toBe(
      testTheme.colors.destructiveForeground,
    );
    // A pressed toggle's face is the accent role, so its spinner paints the
    // accent's own on-colour rather than the brand fill behind it.
    expect(colourOf("on-accent")).toBe(testTheme.colors.accentForeground);
    // A disabled filled action paints the neutral pair, so its spinner reads
    // on that fill rather than on the action's own.
    expect(colourOf("on-disabled")).toBe(testTheme.colors.disabledForeground);
    expect(colourOf("muted")).toBe(testTheme.colors.mutedForeground);
  });
});

describe("the spinner's own numbers", () => {
  it("publishes the row length and the fade floor from the core entry", () => {
    // The inventory row and the page name both numbers, so a consumer reading
    // them must be able to import them: a constant the package exports from its
    // source file but not from its public core entry is a name that resolves in
    // the repo and not in a consumer's program.
    expect(coreSpinnerDots).toBe(SPINNER_DOTS);
    expect(coreSpinnerFloor).toBe(SPINNER_FADE_FLOOR);
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

describe("progressAnimates", () => {
  it("animates only a bar that has no value to draw", () => {
    // The bug guarded: a determinate bar ran the step timer for a segment it
    // never paints, waking the tree every interval for nothing.
    expect(progressAnimates(Option.none())).toBe(true);
    expect(progressAnimates(Option.some(42))).toBe(false);
    expect(progressAnimates(Option.some(0))).toBe(false);
  });
});
