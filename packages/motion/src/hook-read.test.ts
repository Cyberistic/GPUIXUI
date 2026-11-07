import { describe, expect, it } from "vitest";
import {
  retainCoast,
  retainTransition,
  sameCoast,
  sameFrame,
  tweenSpecOf,
  type CoastDeclaration,
} from "./hook-read.js";
import { easeOut, linear } from "./easing.js";
import { inertia } from "./inertia.js";
import { DEFAULT_TWEEN_MS, tween, type MotionFrame } from "./motion.js";
import { springPhysics, layoutSpring } from "./spring.js";

const frame = (
  value: number,
  velocity: number,
  complete = false,
): MotionFrame => ({
  value,
  velocity,
  active: false,
  complete,
});

const coast = (velocity: number, tauMs = 350): CoastDeclaration => ({
  inertia: inertia(tauMs),
  velocity,
});

describe("the declaration a hook runs with", () => {
  it("keeps a re-declared transition instead of re-arming the loop", () => {
    const declared = tween(120);

    const rebuilt = {
      kind: "tween",
      durationMs: 120,
      easing: easeOut,
    } as const;
    expect(retainTransition(declared, rebuilt)).toBe(declared);

    const houseDefault = tween();
    const unreadable = {
      kind: "tween",
      durationMs: Number.NaN,
      easing: easeOut,
    } as const;
    expect(retainTransition(houseDefault, unreadable)).toBe(houseDefault);
  });

  it("takes a declaration that means another run", () => {
    const declared = tween(120);
    expect(retainTransition(declared, tween(200))).toEqual(tween(200));
    expect(retainTransition(declared, tween(120, linear))).toEqual(
      tween(120, linear),
    );
    const spring = { kind: "spring", physics: springPhysics() } as const;
    expect(retainTransition(declared, spring)).toEqual(spring);

    expect(
      retainTransition(
        { kind: "spring", physics: layoutSpring },
        { kind: "spring", physics: springPhysics({ stiffness: 320 }) },
      ),
    ).toEqual({ kind: "spring", physics: springPhysics({ stiffness: 320 }) });
  });

  it("keeps a coast built again on a render", () => {
    const declared = coast(400);
    expect(retainCoast(declared, coast(400))).toBe(declared);

    const standstill = coast(0);
    expect(retainCoast(standstill, coast(Number.NaN))).toBe(standstill);
    expect(sameCoast(coast(400), coast(400))).toBe(true);
  });

  it("takes a coast that is another gesture", () => {
    const declared = coast(400);
    expect(retainCoast(declared, coast(700))).toEqual(coast(700));
    expect(retainCoast(declared, coast(400, 700))).toEqual(coast(400, 700));

    const pair: CoastDeclaration = {
      inertia: { tau: 0.35, min: 0, max: 100 },
      velocity: 400,
    };
    const swapped: CoastDeclaration = {
      inertia: { tau: 0.35, min: 100, max: 0 },
      velocity: 400,
    };
    expect(sameCoast(pair, swapped)).toBe(true);
  });
});

describe("the spec a tween hook reads", () => {
  it("is the documented tween when the value does not name one", () => {
    expect(tweenSpecOf(null)).toEqual({
      durationMs: DEFAULT_TWEEN_MS,
      easing: easeOut,
    });
    expect(tweenSpecOf(undefined)).toEqual({
      durationMs: DEFAULT_TWEEN_MS,
      easing: easeOut,
    });

    expect(tweenSpecOf({ durationMs: null, easing: null })).toEqual({
      durationMs: DEFAULT_TWEEN_MS,
      easing: easeOut,
    });
  });

  it("keeps the pair a caller states, including a zero duration", () => {
    expect(tweenSpecOf({ durationMs: 120, easing: linear })).toEqual({
      durationMs: 120,
      easing: linear,
    });
    expect(tweenSpecOf({ durationMs: 0 })).toEqual({
      durationMs: 0,
      easing: easeOut,
    });
  });

  it("takes a value that is not a curve as the default curve", () => {
    expect(tweenSpecOf({ durationMs: 120, easing: "easeInOut" }).easing).toBe(
      easeOut,
    );
  });
});

describe("the frame a hook publishes", () => {
  it("treats a frame that paints the same thing as the same frame", () => {
    expect(sameFrame(frame(40, 0), frame(40, 0))).toBe(true);
    expect(sameFrame(frame(40, 2), frame(40, 2))).toBe(true);
  });

  it("reports the completion edge even when nothing moved", () => {
    expect(sameFrame(frame(100, 0), frame(100, 0, true))).toBe(false);
    expect(sameFrame(frame(100, 0, true), frame(100, 0))).toBe(false);
  });

  it("reports a moved value or velocity", () => {
    expect(sameFrame(frame(40, 0), frame(41, 0))).toBe(false);
    expect(sameFrame(frame(40, 0), frame(40, 1))).toBe(false);
  });
});
