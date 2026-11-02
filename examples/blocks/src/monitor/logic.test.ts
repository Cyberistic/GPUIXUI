/**
 * A window's samples are stable and inside the sensor's band; the label names
 * the window a press selects.
 */
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import { cores, sensors } from "./data.js";
import { nextRange, rangeLabel, samples } from "./logic.js";

describe("the monitor", () => {
  it("draws the same window twice, inside the sensor's band", () => {
    const cpu = sensors[0]!;
    const first = samples(cpu.seed, cpu.base, 24);
    expect(samples(cpu.seed, cpu.base, 24)).toEqual(first);
    expect(
      Arr.every(first, (value) => value > cpu.base - 8 && value < cpu.base + 8),
    ).toBe(true);
    expect(new Set(first).size).toBeGreaterThan(4);
  });

  it("names the window and keeps the cores in range", () => {
    expect(rangeLabel(nextRange(1, 5))).toBe("last 5 min");
    expect(Arr.every(cores, (value) => value >= 0 && value <= 100)).toBe(true);
  });
});
