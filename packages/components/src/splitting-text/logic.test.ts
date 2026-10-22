/**
 * The split, without a renderer.
 *
 * The bugs these guard: a character split that tears an emoji in half; a space
 * in character mode painted as `" "`, which the text layout trims so the words
 * collide; a delay that restarts per line, so the second line arrives before the
 * first; and a `stepMs` of `NaN` scheduling a stagger no tween can use. The
 * delay's seconds and the reduced rule are `@gpuixui/motion`'s
 * (`timing.test.ts`, "a staggered timing").
 */

import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { offsetOf, splitUnits } from "../splitting-text/logic.js";

const texts = (source: string, mode: "words" | "characters" = "words") =>
  splitUnits(source, { mode }).map((line) => line.units.map((u) => u.text));

const delays = (
  source: string,
  options: Parameters<typeof splitUnits>[1] = {},
) =>
  splitUnits(source, options).flatMap((line) =>
    line.units.map((unit) => unit.delayMs),
  );

describe("splitUnits", () => {
  it("splits a phrase into words, collapsing whitespace and dropping blank lines", () => {
    expect(texts("  Ship\tit \n\n today \n")).toEqual([
      ["Ship", "it"],
      ["today"],
    ]);
  });

  it("keeps an unchanged word's key and replays the word that changed", () => {
    const before = splitUnits("Ship it")[0]?.units;
    const after = splitUnits("Ship now")[0]?.units;

    expect(after?.[0]?.key).toBe(before?.[0]?.key);
    expect(after?.[1]?.key).not.toBe(before?.[1]?.key);
  });

  it("splits characters by code point and keeps a visible word gap", () => {
    expect(texts("Hi 👋 wo", "characters")).toEqual([
      ["H", "i", "\u00A0", "👋", "\u00A0", "w", "o"],
    ]);
  });

  it("counts the stagger through every line, not once per line", () => {
    expect(delays("one two\nthree", { stepMs: 30 })).toEqual([0, 30, 60]);
    expect(delays("one two three", { stepMs: 30, from: "end" })).toEqual([
      60, 30, 0,
    ]);
    expect(delays("one two three", { stepMs: 30, from: "center" })).toEqual([
      30, 0, 30,
    ]);
  });

  it("falls back from a step the stagger cannot use, and keeps zero", () => {
    expect(delays("one two", { stepMs: Number.NaN })).toEqual([0, 40]);
    expect(delays("one two", { stepMs: -10 })).toEqual([0, 40]);
    expect(delays("one two", { stepMs: 0 })).toEqual([0, 0]);
  });

  it("splits an empty string into no rows", () => {
    expect(splitUnits("")).toEqual([]);
  });
});

describe("offsetOf", () => {
  it("keeps a caller's negative offset — a unit can start above", () => {
    expect(offsetOf(Option.some(-6))).toBe(-6);
  });

  it("falls back from a value the runtime would drop", () => {
    expect(offsetOf(Option.some(Number.POSITIVE_INFINITY))).toBe(8);
    expect(offsetOf(Option.none())).toBe(8);
  });
});
