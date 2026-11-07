import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import { drives, processes, sensors } from "./data.js";
import { nextRange, rangeLabel, ring, samples } from "./logic.js";

describe("the monitor", () => {
  it("draws the same window twice, inside the sensor's band", () => {
    const cpu = sensors[0]!;
    const first = samples(cpu.seed, cpu.temp, 24);
    expect(samples(cpu.seed, cpu.temp, 24)).toEqual(first);
    expect(
      Arr.every(first, (value) => value > cpu.temp - 8 && value < cpu.temp + 8),
    ).toBe(true);
    expect(new Set(first).size).toBeGreaterThan(4);
  });

  it("keeps the ring whole and the drives and processes readable", () => {
    const segments = ring(26);
    expect(Arr.reduce(segments, 0, (sum, part) => sum + part.value)).toBe(100);
    expect(Arr.every(drives, (drive) => drive.used > 0 && drive.used < 1)).toBe(
      true,
    );
    expect(processes.length).toBeGreaterThanOrEqual(3);
  });

  it("names the window a press opens", () => {
    expect(rangeLabel(nextRange(1, 15))).toBe("last 15 min");
    expect(rangeLabel(nextRange(15, 15))).toBe("last 15 min");
  });
});
