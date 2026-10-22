/**
 * Holds the arithmetic the `box-paint` probe reads a frame with, and the claims
 * its README section prints.
 *
 * Two numbers decide the whole probe — how many pixels of the border colour a
 * box holds, and whether two sampled points are the same colour — and both are
 * easy to get subtly wrong: a comparison with no tolerance never matches an
 * antialiased sample, and a count over a region that moved reads `0`, which is
 * the answer "this edge painted nothing" rather than "this region is not in the
 * frame". The drawn frame below makes each failure visible.
 *
 * `node:fs` is deliberate, as in `registry.test.ts`: this checks the
 * repository's own probe and prose, not a runtime path.
 */
import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { Pixels } from "@gpuixui/testing";
import { liveRegistry } from "./registry.js";
import {
  BOX_PAINT_BORDER,
  BOX_PAINT_FILL,
  BOX_PAINT_IDS,
  BOX_PAINT_TOLERANCE,
  BOX_PAINT_WIDTH,
  colourAt,
  countPaint,
  differs,
  isColour,
  pointAcross,
  type PaintBox,
} from "./box-paint.js";

const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);

const scenarios = readFileSync(
  new URL("./scenarios.tsx", import.meta.url),
  "utf8",
);

/** The `boxPaintSteps` effect, bounded by the first declaration after it. */
const steps = (() => {
  const start = scenarios.indexOf("const boxPaintSteps");
  if (start === -1) return "";
  const after = [
    scenarios.indexOf("\nconst ", start + 1),
    scenarios.indexOf("\nexport const ", start + 1),
    scenarios.indexOf("\n/** The bodies", start + 1),
  ].filter((end) => end > start);
  return scenarios.slice(
    start,
    after.length === 0 ? scenarios.length : Math.min(...after),
  );
})();

const BORDER = new Pixels.Rgba({ r: 255, g: 59, b: 48, a: 255 });
const PAGE = new Pixels.Rgba({ r: 17, g: 20, b: 26, a: 255 });

/** A 20×10 frame with an 4×3 block of the border colour at x 2–5, y 2–4. */
const frame = (): Pixels.Pixels => {
  const width = 20;
  const height = 10;
  const data = Arr.flatMap(Arr.range(0, height - 1), (y) =>
    Arr.flatMap(Arr.range(0, width - 1), (x) =>
      x >= 2 && x <= 5 && y >= 2 && y <= 4
        ? [BORDER.r, BORDER.g, BORDER.b, BORDER.a]
        : [255, 255, 255, 255],
    ),
  );
  return new Pixels.Pixels({
    width,
    height,
    data: Uint8Array.from(data),
  });
};

const BOX: PaintBox = { x: 0, y: 0, width: 20, height: 10 };

/** An `Option` that the drawn frame guarantees, as a value a test can read. */
const someOf = <A>(value: Option.Option<A>): A =>
  Option.match(value, {
    onNone: () => {
      throw new Error("the drawn frame carries what the reader asked for");
    },
    onSome: (found) => found,
  });

describe("the box-paint reader", () => {
  it("samples a logical point and reports a point outside the capture", () => {
    const sample = someOf(colourAt(frame(), { x: 3, y: 3 }, 1));
    expect([sample.r, sample.g, sample.b]).toEqual([
      BORDER.r,
      BORDER.g,
      BORDER.b,
    ]);
    expect(colourAt(frame(), { x: 30, y: 3 }, 1)).toEqual(Option.none());
    expect(colourAt(frame(), { x: 3, y: 30 }, 1)).toEqual(Option.none());
  });

  it("calls two colours the same within a tolerance and different past it", () => {
    const antialiased = new Pixels.Rgba({
      r: BORDER.r - BOX_PAINT_TOLERANCE,
      g: BORDER.g + BOX_PAINT_TOLERANCE,
      b: BORDER.b,
      a: 255,
    });
    expect(differs(BORDER, antialiased)).toBe(false);
    expect(isColour(antialiased, BOX_PAINT_BORDER)).toBe(true);
    expect(isColour(PAGE, BOX_PAINT_BORDER)).toBe(false);
    // A colour string the grammar cannot read is not a match for anything.
    expect(isColour(BORDER, "notacolour")).toBe(false);
  });

  it("counts one exact colour inside a box and reports an absent box", () => {
    const region = { x: 0, y: 0, width: 10, height: 10 };
    expect(countPaint(frame(), region, 1, BOX_PAINT_BORDER)).toEqual(
      Option.some(12),
    );
    // The same region moved out of the frame is absent, not empty.
    expect(
      countPaint(
        frame(),
        { x: 40, y: 0, width: 10, height: 10 },
        1,
        BOX_PAINT_BORDER,
      ),
    ).toEqual(Option.none());
    expect(countPaint(frame(), region, 1, "notacolour")).toEqual(Option.none());
  });

  it("reads a box's own fill apart from the page", () => {
    expect(isColour(PAGE, BOX_PAINT_FILL)).toBe(false);
    expect(
      isColour(
        new Pixels.Rgba({ r: 52, g: 199, b: 89, a: 255 }),
        BOX_PAINT_FILL,
      ),
    ).toBe(true);
  });

  it("places a sample the fraction of the way across a box", () => {
    expect(
      pointAcross({ x: 10, y: 4, width: 200, height: 60 }, 0.25, 20),
    ).toEqual({ x: 60, y: 20 });
  });

  it("keeps the geometry the probe asks for", () => {
    expect(BOX_PAINT_WIDTH).toBe(160);
    expect(BOX).toEqual({ x: 0, y: 0, width: 20, height: 10 });
  });
});

describe("the box-paint probe's record", () => {
  it("registers the probe and hosts it", () => {
    expect(liveRegistry.filter((probe) => probe.id === "box-paint")).toEqual([
      {
        id: "box-paint",
        title: expect.stringContaining("dashed"),
        capability: "content",
      },
    ]);
    expect(Object.values(BOX_PAINT_IDS)).toHaveLength(5);
  });

  it("documents it under the version it was measured on", () => {
    expect(readme).toContain("### `box-paint` — measured on 0.11.0 here");
  });

  it("prints the check count the steps assert", () => {
    const asserted = steps.match(/ctx\.expect[A-Za-z]+\(/g)?.length ?? 0;
    expect(asserted).toBeGreaterThan(5);
    const printed = Number(
      /(\d+) checks, `--only box-paint`/.exec(readme)?.[1] ?? Number.NaN,
    );
    expect(printed).toBe(asserted);
  });

  it("states the three shapes the fixture asks for", () => {
    // The page says which properties it measured, so a fixture that stopped
    // asking for one of them would leave the sentence claiming a paint nobody
    // requested.
    expect(scenarios).toContain('borderStyle: "dashed"');
    expect(scenarios).toContain("borderTopLeftRadius: 24");
    expect(scenarios).toContain("borderTopWidth: 8");
    expect(steps).toContain("a dashed edge covers less of its band");
    expect(steps).toContain("a per-corner radius cuts its own corner");
    expect(steps).toContain("a named top width paints the top edge");
  });
});
