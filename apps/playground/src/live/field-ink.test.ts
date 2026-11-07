import { readFileSync } from "node:fs";
import { getTheme } from "@gpuixui/tokens";
import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";
import { describe, expect, it } from "vitest";
import {
  INK_PEAK_FLOOR,
  INK_PEAK_TOLERANCE,
  RUNTIME_HINT_HEX,
  countDarker,
  countInk,
  inkRegion,
  luminanceOf,
  peakInk,
} from "./field-ink.js";

const dark = getTheme("dark");

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const scenarios = read("./scenarios.tsx");
const readme = read("../../README.md");

const fill: ReadonlyArray<number> = [25, 29, 37, 255];
const frame = new Pixels.Pixels({
  width: 6,
  height: 4,
  data: new Uint8Array(6 * 4 * 4).map((_, at) => fill[at % 4] ?? 0),
});

const paint = (x: number, y: number, colour: ReadonlyArray<number>): void => {
  const at = (y * 6 + x) * 4;
  frame.data.set(colour, at);
};

paint(1, 1, [143, 143, 143, 255]);
paint(2, 1, [0, 0, 0, 255]);
paint(3, 1, [238, 241, 245, 255]);

const wholeFrame = { x: 0, y: 0, width: 6, height: 4 };

describe("the two inks a field paints", () => {
  it("the runtime's hint and the theme's placeholder are different colours", () => {
    expect(RUNTIME_HINT_HEX).not.toBe(dark.colors.placeholder);
    expect(Pixels.hexToRgba(RUNTIME_HINT_HEX)).not.toEqual(
      Pixels.hexToRgba(dark.colors.placeholder),
    );
  });

  it("the seam's ink sits far above the floor that separates it from the platform's", () => {
    const ink = Option.getOrElse(
      luminanceOf(dark.colors.inputForeground),
      () => 0,
    );
    expect(ink > INK_PEAK_FLOOR + INK_PEAK_TOLERANCE).toBe(true);
  });

  it("a box becomes a frame region at the capture's scale, minus its border", () => {
    expect(
      inkRegion({ x: 10, y: 20, width: 100, height: 40 }, 2, 1),
    ).toMatchObject({ x: 22, y: 42, width: 196, height: 76 });
  });

  it("counts the hint's exact colour and no other", () => {
    expect(
      Option.getOrElse(
        countInk(frame, wholeFrame, 1, RUNTIME_HINT_HEX),
        () => -1,
      ),
    ).toBe(1);
    expect(
      Option.getOrElse(
        countInk(frame, wholeFrame, 1, dark.colors.placeholder),
        () => -1,
      ),
    ).toBe(0);
  });

  it("reads the brightest pixel and the ink darker than the fill", () => {
    const peak = Option.getOrElse(peakInk(frame, wholeFrame, 1), () => 0);
    expect(Math.round(peak)).toBe(
      Math.round(
        Option.getOrElse(luminanceOf(dark.colors.inputForeground), () => 0),
      ),
    );
    expect(
      Option.getOrElse(
        countDarker(frame, wholeFrame, 1, dark.colors.input),
        () => -1,
      ),
    ).toBe(1);
  });
});

describe("the README holds the probe's measurement", () => {
  it("prints the check count the probe asserts", () => {
    const start = scenarios.indexOf("const fieldInkSteps");
    const end = scenarios.indexOf(
      "\nconst ",
      scenarios.indexOf("const ", start + 1),
    );
    const steps = scenarios.slice(start, end);
    const checks = [...steps.matchAll(/ctx\.expect/g)].length;
    expect(readme).toContain(`${checks} checks, \`--only field-ink\``);
  });

  it("prints the peaks the frames showed and the tolerance the probe uses", () => {
    expect(readme).toContain("**47.5**");
    expect(readme).toContain("**240.7**");
    expect(readme).toContain(`\`INK_PEAK_TOLERANCE\` (${INK_PEAK_TOLERANCE})`);
  });
});
