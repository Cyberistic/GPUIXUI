/**
 * Guards momentum decay: exponential approach to the projected rest position,
 * and hard clamping to configured bounds with zero velocity. Reverting the
 * decay or clamp formula fails these assertions.
 *
 * The last suite guards the totality the package promises: `Inertia` is a
 * structural interface a caller may build by hand, so a time constant or a bound
 * the formulas cannot read must be repaired by the samplers rather than
 * reaching them — otherwise `project` answers `NaN` and the value never settles.
 */
import { describe, expect, it } from "vitest";
import { inertia, project, sampleInertia, type Inertia } from "./inertia.js";
import { sameInertia } from "./inertia-read.js";

describe("inertia", () => {
  it("projects the resting position and clamps to bounds", () => {
    const free = inertia(350);
    expect(project(free, 5, 100)).toBeCloseTo(40, 5);

    const bounded = inertia(350, { min: 0, max: 10 });
    expect(project(bounded, 5, 100)).toBe(10);
  });

  it("swaps inverted bounds", () => {
    const swapped = inertia(350, { min: 10, max: 0 });
    expect(swapped.min).toBe(0);
    expect(swapped.max).toBe(10);
  });

  it("decays exponentially from the initial velocity", () => {
    const sample = sampleInertia(inertia(350), 0, 100, 350);
    expect(sample.value).toBeCloseTo(35 * (1 - Math.E ** -1), 3);
    expect(sample.velocity).toBeCloseTo(100 * Math.E ** -1, 3);
    expect(sample.settled).toBe(false);
  });

  it("clamps to a bound and stops with zero velocity", () => {
    const bounded = inertia(350, { min: 0, max: 20 });
    const early = sampleInertia(bounded, 0, 100, 100);
    expect(early.value).toBeLessThan(20);

    const settled = sampleInertia(bounded, 0, 100, 2000);
    expect(settled.value).toBe(20);
    expect(settled.velocity).toBe(0);
    expect(settled.settled).toBe(true);
  });

  it("never exceeds its bounds at any sampled time", () => {
    const bounded = inertia(350, { min: 0, max: 20 });
    [0, 50, 150, 500, 1200, 3000].forEach((ms) => {
      const sample = sampleInertia(bounded, 0, 100, ms);
      expect(sample.value).toBeLessThanOrEqual(20);
      expect(sample.value).toBeGreaterThanOrEqual(0);
    });
  });

  it("reads a non-finite elapsed time as the start of the coast", () => {
    // `Math.max(NaN, 0)` is `NaN`, so a clock the caller could not read used to
    // return `NaN` from every field instead of the release frame.
    const release = sampleInertia(inertia(350), 0, 100, 0);
    expect(sampleInertia(inertia(350), 0, 100, Number.NaN)).toEqual(release);
  });
});

describe("an inertia built by hand", () => {
  // `Inertia` is an exported structural interface, so `inertia()`'s repair is
  // not the only path into the formulas: `{ tau: NaN, min: null, max: null }`
  // type-checks. It used to answer `NaN` from `project`, and a `MotionValue`
  // coasting on it painted `NaN` into its target and never settled.
  const unreadable = (tau: number): Inertia => ({
    tau,
    min: null,
    max: null,
  });

  it("takes the house time constant for one that cannot run", () => {
    // 350 ms of decay at 100 px/s covers 35 px.
    [Number.NaN, Number.POSITIVE_INFINITY, 0, -0.35].forEach((tau) => {
      expect(project(unreadable(tau), 0, 100)).toBeCloseTo(35, 5);
      expect(sampleInertia(unreadable(tau), 0, 100, 350)).toEqual(
        sampleInertia(inertia(350), 0, 100, 350),
      );
    });
  });

  it("settles a coast it could not have run before", () => {
    const frame = sampleInertia(unreadable(Number.NaN), 0, 100, 4_500);
    expect(Number.isFinite(frame.value)).toBe(true);
    expect(frame.value).toBeCloseTo(35, 3);
    expect(Math.abs(frame.velocity)).toBeLessThanOrEqual(0.001);
    expect(frame.settled).toBe(true);
  });

  it("reads an unreadable release frame as a standstill", () => {
    const house = inertia(350);
    expect(sampleInertia(house, Number.NaN, 100, 350)).toEqual(
      sampleInertia(house, 0, 100, 350),
    );
    expect(sampleInertia(house, 0, Number.NaN, 350)).toEqual({
      value: 0,
      velocity: 0,
      settled: true,
    });
  });

  it("drops a bound it cannot read, not the one beside it", () => {
    // The repair must be per bound: dropping the pair (or reading `NaN` as a
    // floor) would release a projection past the readable `max`.
    const hand = { tau: 0.35, min: Number.NaN, max: 10 };
    expect(project(hand, 0, 100)).toBe(10);
    expect(sampleInertia(hand, 0, 100, 120).value).toBeLessThanOrEqual(10);
  });

  it("reads a declaration that carries no inertia as the house coast", () => {
    // A config decoded from storage can reach these entry points with no object
    // at all. Reading `.tau` off nothing threw a `TypeError` out of the render
    // that projects a resting frame (`useInertia`), and the coast never ran.
    // @ts-expect-error — an inertia a store wrote as `null`.
    expect(project(null, 0, 100)).toBe(project(inertia(350), 0, 100));
    // @ts-expect-error — the same absent inertia reaching a sample.
    expect(sampleInertia(undefined, 0, 100, 350)).toEqual(
      sampleInertia(inertia(350), 0, 100, 350),
    );
    // @ts-expect-error — and the equality the retained value's guard reads.
    expect(sameInertia(null, inertia(350))).toBe(true);
  });

  it("swaps an inverted pair the sampler is handed", () => {
    // `inertia()` swaps; a hand-built pair must read as the same range, or a
    // negative release clamps to the wrong end.
    const hand = { tau: 0.35, min: 10, max: 0 };
    expect(project(hand, 0, 100)).toBe(10);
    expect(project(hand, 20, -100)).toBe(0);
  });
});

describe("a release whose rest the runtime cannot represent", () => {
  it("settles on the nearest destination the runtime can paint", () => {
    // A rest that overflows is still a readable input, so no repair above
    // caught it: `position + speed * tau` was `Infinity`, and the release
    // frame's zero travel multiplied it into `Infinity * 0`, which is `NaN` —
    // a frame the runtime paints as nothing, that never settles.
    const huge = inertia(1e308);
    expect(project(huge, 1e308, 1e308)).toBe(1e308);
    expect(sampleInertia(huge, 1e308, 1e308, 0)).toEqual({
      value: 1e308,
      velocity: 0,
      settled: true,
    });
    expect(sampleInertia(huge, 1e308, -1e308, 0)).toEqual({
      value: 1e308,
      velocity: 0,
      settled: true,
    });

    // A wall in the direction it was thrown is the destination: it is finite,
    // so the coast travels to it rather than inventing a rest.
    const walled = inertia(1e308, { max: 100 });
    expect(project(walled, 1e308, 1e308)).toBe(100);
    expect(sampleInertia(walled, 1e308, 1e308, 0)).toEqual({
      value: 100,
      velocity: 0,
      settled: true,
    });

    // Every field stays a number the runtime can paint, at every clock.
    [0, 1, 50, 1000, Number.POSITIVE_INFINITY].forEach((ms) => {
      const sample = sampleInertia(huge, 1e308, 1e308, ms);
      expect(Number.isFinite(sample.value)).toBe(true);
      expect(Number.isFinite(sample.velocity)).toBe(true);
    });
  });
});

describe("a coast released on a wall", () => {
  // The sampler read "the value is at a bound" as "the coast is over", without
  // asking which way it was moving. A surface dragged to the edge of its range
  // and released *back into* the range therefore reported itself settled on the
  // release frame, so `MotionValue` finished the run there and jumped to the
  // projected rest at the far end instead of travelling.
  const bounded = inertia(350, { min: 0, max: 20 });

  it("moves back into the range instead of settling at the release frame", () => {
    const fromFloor = sampleInertia(bounded, 0, 100, 0);
    expect(fromFloor).toEqual({
      value: 0,
      velocity: 100,
      settled: false,
    });
    const fromCeiling = sampleInertia(bounded, 20, -100, 0);
    expect(fromCeiling).toEqual({
      value: 20,
      velocity: -100,
      settled: false,
    });
    // The next sample is inside the range, so the release frame was a start
    // rather than the end of the journey.
    expect(sampleInertia(bounded, 0, 100, 100).value).toBeGreaterThan(0);
    expect(sampleInertia(bounded, 20, -100, 100).value).toBeLessThan(20);
  });

  it("still settles a release that pushes into the wall", () => {
    // The control: a wall is hard when the velocity points at it, which is the
    // rule that zeroes the speed at the bound.
    expect(sampleInertia(bounded, 0, -100, 0)).toEqual({
      value: 0,
      velocity: 0,
      settled: true,
    });
    expect(sampleInertia(bounded, 20, 100, 0)).toEqual({
      value: 20,
      velocity: 0,
      settled: true,
    });
  });
});
