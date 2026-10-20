/**
 * The QR pixel rules (plan `708`).
 *
 * The bug these guard: a sampler that forgets the quiet-zone offset reads its
 * neighbour's module, so a frame that looks right still reconstructs the wrong
 * matrix. A second bug is colour: treating an unreadable or unexpected sample
 * as a light module would let a blank frame pass. Both are one-character
 * mistakes in `sampleMatrix`, so each test drives a sampler by hand.
 */
import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";
import {
  darkModuleCount,
  frameMatrixSize,
  moduleCentre,
  quietZoneSamples,
  sampleMatrix,
} from "./qr-pixels.js";

const DARK = new Pixels.Rgba({ r: 0, g: 0, b: 0, a: 255 });
const LIGHT = new Pixels.Rgba({ r: 255, g: 255, b: 255, a: 255 });
const COLOURS = { dark: DARK, light: LIGHT } as const;
const SPEC = { module: 2, quiet: 1 } as const;
const ORIGIN = { x: 10, y: 20 } as const;

/** A 3 × 3 fixture: `#` dark, `.` light. */
const MATRIX = ["#.#", ".#.", "##."] as const;

/**
 * A sampler that paints the authored matrix, reading the module index back from
 * the coordinate. A wrong centre therefore reads a neighbouring module, which is
 * exactly the failure the quiet-zone offset can cause.
 */
const samplerFrom = (
  matrix: ReadonlyArray<string>,
  invert: ReadonlyArray<{ readonly row: number; readonly col: number }> = [],
  unreadable: ReadonlyArray<{
    readonly row: number;
    readonly col: number;
  }> = [],
) => {
  const cells = new Map<string, "dark" | "light" | "none">();
  matrix.forEach((row, rowIndex) =>
    row.split("").forEach((cell, col) => {
      const flipped = invert.some(
        (target) => target.row === rowIndex && target.col === col,
      );
      const missing = unreadable.some(
        (target) => target.row === rowIndex && target.col === col,
      );
      const authored = cell === "#" ? "dark" : "light";
      const value = missing
        ? "none"
        : flipped
          ? authored === "dark"
            ? "light"
            : "dark"
          : authored;
      cells.set(`${rowIndex}:${col}`, value);
    }),
  );
  return (x: number, y: number): Option.Option<Pixels.Rgba> => {
    const col = Math.round((x - ORIGIN.x) / SPEC.module - SPEC.quiet - 0.5);
    const row = Math.round((y - ORIGIN.y) / SPEC.module - SPEC.quiet - 0.5);
    return Option.flatMap(
      Option.fromNullishOr(cells.get(`${row}:${col}`)),
      (value) =>
        value === "none"
          ? Option.none()
          : Option.some(value === "dark" ? DARK : LIGHT),
    );
  };
};

describe("moduleCentre", () => {
  it("places the first module one full quiet zone plus half a module in", () => {
    expect(moduleCentre(0, 0, SPEC, ORIGIN)).toEqual({ x: 13, y: 23 });
  });

  it("advances by exactly one module on each axis", () => {
    expect(moduleCentre(2, 1, { module: 6, quiet: 4 }, { x: 0, y: 0 })).toEqual(
      {
        x: 33,
        y: 39,
      },
    );
  });
});

describe("sampleMatrix", () => {
  it("reconstructs the authored matrix with no mismatch", () => {
    const reading = sampleMatrix(
      MATRIX,
      SPEC,
      ORIGIN,
      COLOURS,
      samplerFrom(MATRIX),
    );
    expect(reading.rows).toEqual(["#.#", ".#.", "##."]);
    expect(reading.mismatches).toHaveLength(0);
    expect(reading.darkCount).toBe(darkModuleCount(MATRIX));
  });

  it("names the one module whose painted colour is wrong", () => {
    const reading = sampleMatrix(
      MATRIX,
      SPEC,
      ORIGIN,
      COLOURS,
      samplerFrom(MATRIX, [{ row: 1, col: 1 }]),
    );
    expect(reading.mismatches).toHaveLength(1);
    expect(reading.mismatches[0]).toMatchObject({
      row: 1,
      col: 1,
      expected: "dark",
      actual: "#ffffffff",
    });
    expect(reading.rows[1]).toBe("...");
  });

  it("treats an unreadable light module as a mismatch, not a pass", () => {
    const reading = sampleMatrix(
      MATRIX,
      SPEC,
      ORIGIN,
      COLOURS,
      samplerFrom(MATRIX, [], [{ row: 0, col: 1 }]),
    );
    expect(reading.mismatches).toHaveLength(1);
    expect(reading.mismatches[0]?.actual).toBe("outside the frame");
  });

  it("reads a neighbour when the quiet zone is dropped", () => {
    const withoutQuiet = sampleMatrix(
      MATRIX,
      { module: 2, quiet: 0 },
      ORIGIN,
      COLOURS,
      samplerFrom(MATRIX),
    );
    expect(withoutQuiet.mismatches.length).toBeGreaterThan(0);
  });

  it("skips a short row instead of sampling past its width", () => {
    const reading = sampleMatrix(
      ["##", "#"],
      SPEC,
      ORIGIN,
      COLOURS,
      samplerFrom(["##", "#"]),
    );
    expect(reading.rows).toEqual(["##", "#"]);
    expect(reading.mismatches).toHaveLength(0);
  });
});

describe("the quiet zone and the frame box", () => {
  it("is four samples, half a band inside each corner", () => {
    expect(quietZoneSamples(SPEC, ORIGIN, 24)).toEqual([
      { x: 11, y: 21 },
      { x: 33, y: 21 },
      { x: 11, y: 43 },
      { x: 33, y: 43 },
    ]);
  });

  it("includes the quiet zone in the painted square", () => {
    expect(frameMatrixSize(["###"], { module: 6, quiet: 4 })).toBe(54);
  });
});
