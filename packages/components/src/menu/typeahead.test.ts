/**
 * The type-ahead buffer's window and repeat rules.
 *
 * The bugs these guard: a buffer with no window made every later letter part of
 * an old search; a repeated letter appended into a prefix that matches nothing
 * instead of advancing to the next row; and an uppercase keystroke never matched
 * a lower-case label.
 */

import * as Duration from "effect/Duration";
import { describe, expect, it } from "vitest";
import { idle, press, window } from "./typeahead.js";

const ms = (value: number): bigint => BigInt(value) * 1_000_000n;

describe("press", () => {
  it("starts a buffer from the first letter, lower-cased", () => {
    expect(press(idle, "R", ms(0))).toEqual({ text: "r", at: 0n });
  });

  it("appends a different letter inside the window", () => {
    const first = press(idle, "r", 0n);
    expect(press(first, "e", ms(100))).toEqual({ text: "re", at: ms(100) });
  });

  it("starts over after the window, and not before it", () => {
    const first = press(idle, "r", 0n);
    expect(press(first, "e", ms(500)).text).toBe("re");
    expect(press(first, "e", ms(500) + 1n).text).toBe("e");
  });

  it("keeps a repeated single letter so the match can advance", () => {
    const first = press(idle, "d", 0n);
    expect(press(first, "d", ms(100))).toEqual({ text: "d", at: ms(100) });
  });

  it("appends a repeat after a longer prefix", () => {
    const first = press(idle, "d", 0n);
    const second = press(first, "e", ms(50));
    expect(press(second, "d", ms(100)).text).toBe("ded");
  });

  it("starts empty and expires after half a second", () => {
    expect(idle).toEqual({ text: "", at: 0n });
    expect(Duration.toMillis(window)).toBe(500);
  });
});
