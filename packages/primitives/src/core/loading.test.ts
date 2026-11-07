import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { motionLevels } from "@gpuixui/motion/timing";
import {
  indeterminateFillStyle,
  indeterminateLeadStyle,
  indeterminateOffset,
  progressAnimates,
  PULSE_INTERVAL_MS,
  PULSE_STEPS,
  pulseOpacity,
  skeletonSize,
  skeletonStyle,
  SPINNER_ACCENTS,
  SPINNER_ARC_TICKS,
  SPINNER_FADE_FLOOR,
  SPINNER_RING_TICKS,
  SPINNER_SEGMENTS,
  spinnerTickStyle,
  spinnerTicks,
  STEP_INTERVAL_MS,
} from "./loading.js";
import {
  PULSE_INTERVAL_MS as corePulseInterval,
  SPINNER_ARC_TICKS as coreSpinnerArc,
  SPINNER_FADE_FLOOR as coreSpinnerFloor,
  SPINNER_RING_TICKS as coreSpinnerTicks,
  STEP_INTERVAL_MS as coreStepInterval,
} from "./index.js";
import { testTheme } from "./testing/theme.fixture.js";
import type { RadiusStep } from "./theme.js";

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

  it("keeps its documented corner for a stored radius name the release dropped", () => {
    const stored = "xl2" as RadiusStep;
    expect(skeletonStyle({ radius: stored }, testTheme).borderRadius).toBe(
      testTheme.radius.sm,
    );
  });

  it("rounds a circle placeholder", () => {
    expect(skeletonStyle({ circle: true }, testTheme).borderRadius).toBe(
      testTheme.radius.full,
    );
  });

  it("mirrors a circle's missing side so one explicit size stays round", () => {
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

    expect(
      skeletonSize({ circle: true, width: 40, height: 24 }, testTheme),
    ).toStrictEqual({ width: 40, height: 24 });
  });

  it("takes a side it cannot paint from the default, not from the box", () => {
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

    expect(skeletonSize({ width: "45%", height: "2% " }, testTheme)).toEqual({
      width: "45%",
      height: "2% ",
    });
  });

  it("takes a blank side from the default, not from a dimension it cannot parse", () => {
    const line = testTheme.typography.body.lineHeight;
    expect(skeletonSize({ width: "" }, testTheme)).toStrictEqual({
      width: "100%",
      height: line,
    });
    expect(skeletonSize({ width: "   ", height: "" }, testTheme)).toStrictEqual(
      { width: "100%", height: line },
    );
    expect(skeletonSize({ circle: true, width: "" }, testTheme)).toStrictEqual({
      width: line,
      height: line,
    });

    expect(skeletonSize({ width: "45%" }, testTheme)).toStrictEqual({
      width: "45%",
      height: line,
    });
  });
});

describe("spinnerTicks", () => {
  const headOf = (step: number): number =>
    Option.getOrElse(
      Arr.findFirstIndex(spinnerTicks(step, 16), (tick) => tick.active),
      () => -1,
    );

  it("lights exactly one head per step", () => {
    const heads = Arr.map(Arr.range(0, 47), (step) =>
      Arr.filter(spinnerTicks(step, 16), (tick) => tick.active),
    );

    expect(Arr.every(heads, (ticks) => ticks.length === 1)).toBe(true);
  });

  it("advances the head one tick per step and wraps at the ring's length", () => {
    expect(headOf(0)).toBe(0);
    expect(headOf(1)).toBe(1);
    expect(headOf(SPINNER_RING_TICKS)).toBe(0);

    for (const step of Arr.range(0, SPINNER_RING_TICKS - 1)) {
      expect((headOf(step) + 1) % SPINNER_RING_TICKS).toBe(headOf(step + 1));
    }
  });

  it("fades the arc behind the head and leaves the rest of the ring empty", () => {
    const ticks = spinnerTicks(0, 16);
    const head = ticks[0];
    const tailEnd = ticks[SPINNER_ARC_TICKS - 1];

    const gap = ticks[1];

    expect(head?.opacity).toBe(1);
    expect(tailEnd?.opacity).toBe(SPINNER_FADE_FLOOR);
    expect(gap?.opacity).toBe(0);

    expect(Arr.filter(ticks, (tick) => tick.opacity > 0)).toHaveLength(
      SPINNER_ARC_TICKS,
    );
    expect(
      Arr.every(
        Arr.range(1, SPINNER_RING_TICKS - SPINNER_ARC_TICKS),
        (index) => ticks[index]?.opacity === 0,
      ),
    ).toBe(true);
  });

  it("places every tick inside the ring, on its circle", () => {
    const size = 24;
    const ticks = spinnerTicks(3, size);
    const radius = (size - (ticks[0]?.side ?? 0)) / 2;

    expect(ticks).toHaveLength(SPINNER_RING_TICKS);
    for (const tick of ticks) {
      const centreX = tick.x + tick.side / 2;
      const centreY = tick.y + tick.side / 2;
      expect(centreX - size / 2).toBeCloseTo(
        radius *
          Math.cos(
            -Math.PI / 2 + (tick.index / SPINNER_RING_TICKS) * Math.PI * 2,
          ),
        6,
      );
      expect(centreY - size / 2).toBeCloseTo(
        radius *
          Math.sin(
            -Math.PI / 2 + (tick.index / SPINNER_RING_TICKS) * Math.PI * 2,
          ),
        6,
      );

      expect(tick.x).toBeGreaterThanOrEqual(0);
      expect(tick.y).toBeGreaterThanOrEqual(0);
      expect(tick.x + tick.side).toBeLessThanOrEqual(size);
      expect(tick.y + tick.side).toBeLessThanOrEqual(size);
    }
  });

  it("keeps a usable ring for a size it cannot paint", () => {
    for (const size of [0, -4, Number.NaN]) {
      const ticks = spinnerTicks(0, size);
      expect(ticks).toHaveLength(SPINNER_RING_TICKS);
      expect(Arr.every(ticks, (tick) => tick.side > 0)).toBe(true);
      expect(Arr.every(ticks, (tick) => Number.isFinite(tick.x))).toBe(true);
    }
  });

  it("paints the accent on every tick and fades the tail with opacity", () => {
    const ticks = spinnerTicks(0, 12);
    const spec = { size: 12, accent: "on-primary" } as const;
    const paint = Arr.map(ticks, (tick) =>
      spinnerTickStyle(spec, tick, testTheme),
    );

    expect(
      Arr.every(
        paint,
        (tick) => tick.backgroundColor === testTheme.colors.primaryForeground,
      ),
    ).toBe(true);
    expect(
      Arr.every(
        paint,
        (tick) =>
          tick.position === "absolute" &&
          tick.width === ticks[0]?.side &&
          tick.borderRadius === testTheme.radius.full,
      ),
    ).toBe(true);
  });

  it("resolves a fill's on-colour for every filled accent", () => {
    const tick = spinnerTicks(0, 12)[0];
    if (tick === undefined) throw new Error("the ring drew no tick");
    const colourOf = (accent: (typeof SPINNER_ACCENTS)[number]): unknown =>
      spinnerTickStyle({ size: 12, accent }, tick, testTheme).backgroundColor;

    expect(colourOf("on-primary")).toBe(testTheme.colors.primaryForeground);
    expect(colourOf("on-secondary")).toBe(testTheme.colors.secondaryForeground);
    expect(colourOf("on-destructive")).toBe(
      testTheme.colors.destructiveForeground,
    );
    expect(colourOf("on-accent")).toBe(testTheme.colors.accentForeground);
    expect(colourOf("on-disabled")).toBe(testTheme.colors.disabledForeground);
    expect(colourOf("muted")).toBe(testTheme.colors.mutedForeground);
  });
});

describe("the spinner's own numbers", () => {
  it("publishes the ring's resolution and the fade floor from the core entry", () => {
    expect(coreSpinnerTicks).toBe(SPINNER_RING_TICKS);
    expect(coreSpinnerArc).toBe(SPINNER_ARC_TICKS);
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
    expect(progressAnimates(Option.none())).toBe(true);
    expect(progressAnimates(Option.some(42))).toBe(false);
    expect(progressAnimates(Option.some(0))).toBe(false);
  });
});

describe("the loading indicators' cadence", () => {
  const source = (file: string): string =>
    readFileSync(new URL(`../components/${file}`, import.meta.url), "utf8");
  const stepIndicators = ["Progress.tsx", "Spinner.tsx"] as const;

  it("ticks the step indicators at the house timing's step level", () => {
    expect(coreStepInterval).toBe(motionLevels.step);
    expect(corePulseInterval).toBe(PULSE_INTERVAL_MS);
    expect(Number.isFinite(STEP_INTERVAL_MS)).toBe(true);
    expect(STEP_INTERVAL_MS).toBeGreaterThan(0);
  });

  it("reads that level in both step indicators and writes no number of its own", () => {
    Arr.forEach(stepIndicators, (file) => {
      const text = source(file);
      expect(text, file).toContain("STEP_INTERVAL_MS");
      expect(text, file).toContain("useStep(");

      expect(text, file).not.toMatch(/useStep\([^)]*\b\d{2,}\b/);
    });
  });

  it("keeps a pulse slower than a step, outside the transition levels", () => {
    expect(PULSE_INTERVAL_MS).toBeGreaterThan(STEP_INTERVAL_MS);
    expect(Object.values(motionLevels)).not.toContain(PULSE_INTERVAL_MS);
    const text = source("Skeleton.tsx");
    expect(text).toContain("PULSE_INTERVAL_MS");
    expect(text).not.toMatch(/useStep\([^)]*\b\d{2,}\b/);
  });
});
