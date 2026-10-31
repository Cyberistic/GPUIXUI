/**
 * The typing reveal's rules, without a renderer.
 *
 * The bugs these guard: a `NaN` speed that schedules a timer forever, a
 * negative delay that waits until the process ends, and a reveal that slices an
 * emoji in half because it counted UTF-16 code units.
 */

import { describe, expect, it } from "vitest";
import {
  characters,
  typingDefaults,
  typingTiming,
  visibleText,
} from "./logic.js";

describe("typingTiming", () => {
  it("uses the declared defaults when the caller names neither", () => {
    expect(typingTiming()).toEqual({
      delayMs: typingDefaults.delayMs,
      speedMs: typingDefaults.speedMs,
    });
  });

  it("rounds a fractional pace instead of scheduling a sub-millisecond timer", () => {
    expect(typingTiming({ speedMs: 12.6, delayMs: 3.4 })).toEqual({
      speedMs: 13,
      delayMs: 3,
    });
  });

  it("falls back for a pace or delay that could never finish", () => {
    expect(
      typingTiming({ speedMs: Number.NaN, delayMs: Number.POSITIVE_INFINITY }),
    ).toEqual({
      speedMs: typingDefaults.speedMs,
      delayMs: typingDefaults.delayMs,
    });
    expect(typingTiming({ speedMs: -10, delayMs: -1 })).toEqual({
      speedMs: typingDefaults.speedMs,
      delayMs: typingDefaults.delayMs,
    });
  });

  it("keeps a zero speed, which means paint the whole string at once", () => {
    expect(typingTiming({ speedMs: 0 }).speedMs).toBe(0);
  });
});

describe("characters", () => {
  it("counts a character as a code point, so an emoji is never split", () => {
    expect(characters("a🎉b")).toEqual(["a", "🎉", "b"]);
    expect(characters("a🎉b")).toHaveLength(3);
    expect("a🎉b".length).toBe(4);
  });
});

describe("visibleText", () => {
  it("paints the first n characters", () => {
    expect(visibleText("Ship it", 4)).toBe("Ship");
    expect(visibleText("Ship it", 0)).toBe("");
    expect(visibleText("Ship it", 7)).toBe("Ship it");
  });

  it("clamps a count past the end and refuses a negative or unreadable one", () => {
    expect(visibleText("Ship", 99)).toBe("Ship");
    expect(visibleText("Ship", -3)).toBe("");
    expect(visibleText("Ship", Number.NaN)).toBe("");
  });

  it("keeps an emoji whole at every step", () => {
    const steps = Array.from({ length: 4 }, (_, index) =>
      visibleText("🎉🎉", index),
    );
    expect(steps).toEqual(["", "🎉", "🎉🎉", "🎉🎉"]);
  });
});
