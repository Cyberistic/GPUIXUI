/**
 * Multi-step sequence matching.
 *
 * The bugs these guard: a sequence matcher that fires on the first step alone,
 * one that never times out a partial sequence, and one that treats a one-step
 * sequence differently from its chord.
 */

import { describe, expect, it } from "vitest";
import { parseHotkey } from "@tanstack/hotkeys";
import { makeSequenceMatcher } from "./sequence.js";
import { toTanstackPlatform } from "./platform.js";

const mac = toTanstackPlatform("darwin");
const chord = (binding: string) => parseHotkey(binding, mac);
const matcher = (sequence: ReadonlyArray<string>, timeoutMs = 1000) =>
  makeSequenceMatcher(sequence, { timeoutMs, platform: "darwin" });

describe("makeSequenceMatcher", () => {
  it("matches a two-step sequence only after both steps", () => {
    const m = matcher(["g", "g"]);
    expect(m.advance(chord("g"), 0)).toBe(false);
    expect(m.advance(chord("g"), 10)).toBe(true);
  });

  it("resets on timeout between steps", () => {
    const m = matcher(["g", "g"], 100);
    expect(m.advance(chord("g"), 0)).toBe(false);
    // The second step arrives after the timeout, so it restarts from step one.
    expect(m.advance(chord("g"), 200)).toBe(false);
    expect(m.advance(chord("g"), 210)).toBe(true);
  });

  it("treats a one-step sequence as its chord", () => {
    const m = matcher(["g"]);
    expect(m.advance(chord("g"), 0)).toBe(true);
  });

  it("does not match when a non-step key interrupts", () => {
    const m = matcher(["g", "g"]);
    expect(m.advance(chord("g"), 0)).toBe(false);
    expect(m.advance(chord("h"), 10)).toBe(false);
    expect(m.progress()).toBe(0);
  });

  it("restarts from the first step when it repeats", () => {
    const m = matcher(["g", "h"]);
    expect(m.advance(chord("g"), 0)).toBe(false);
    // `g` again matches step one, so progress stays on the second step.
    expect(m.advance(chord("g"), 10)).toBe(false);
    expect(m.progress()).toBe(1);
    expect(m.advance(chord("h"), 20)).toBe(true);
  });

  it("ignores modifier-only chords without touching progress", () => {
    const m = matcher(["g", "g"]);
    expect(m.advance(chord("g"), 0)).toBe(false);
    expect(m.advance(parseHotkey("shift", mac), 10)).toBe(false);
    expect(m.progress()).toBe(1);
  });
});
