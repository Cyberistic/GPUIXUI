/**
 * Holds the arithmetic the `text-truncation` probe reads a capture with.
 *
 * The probe's whole finding is "this end of the run is a whole glyph" versus
 * "this end is an ellipsis", and both are decided by where ink sits vertically
 * inside the lowest painted line. Nothing about a real frame can prove that
 * arithmetic — a stem and a row of dots look alike to a count — so the reader is
 * held to a drawn frame where the two are known.
 *
 * The failure being guarded is a reader that counts the whole line instead of
 * its upper half: it would report every ellipsis as a clipped glyph, which is
 * the exact claim the probe exists to settle.
 *
 * It also holds the probe's prose: the heading the registry test expects, the
 * check count the README prints, and the `lineClamp` limitation, so a runtime
 * bump cannot leave the page claiming a clamp that paints.
 */
import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { Pixels } from "@gpuixui/testing";
import { liveRegistry } from "./registry.js";
import {
  readTruncation,
  TRUNCATION_IDS,
  TRUNCATION_WIDTH,
  type InkBox,
  type TruncationRead,
} from "./truncation.js";

const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);

const scenarios = readFileSync(
  new URL("./scenarios.tsx", import.meta.url),
  "utf8",
);

/** The `truncationSteps` effect, bounded by the first declaration after it. */
const steps = (() => {
  const start = scenarios.indexOf("const truncationSteps");
  if (start === -1) return "";
  const ends = Arr.filter(
    [
      scenarios.indexOf("\nconst ", start + 1),
      scenarios.indexOf("\nexport const ", start + 1),
      scenarios.indexOf("\n/** The bodies", start + 1),
    ],
    (end) => end > start,
  );
  return scenarios.slice(
    start,
    Arr.reduce(ends, scenarios.length, (first, end) => Math.min(first, end)),
  );
})();

const FRAME = { width: 64, height: 40 } as const;

/** The ink the drawn frame uses, and the page it sits on. */
const INK = "#FF0000";
const PAGE = [255, 255, 255, 255] as const;
const GLYPH = [255, 0, 0, 255] as const;

/**
 * Two painted lines: a stem at the head of each, and three dots on the baseline
 * at the end of the second — the shape a clipped glyph and an ellipsis have.
 */
const inked = (x: number, y: number): boolean =>
  (y >= 4 && y <= 13 && x >= 2 && x <= 5) ||
  (y >= 20 &&
    y <= 29 &&
    ((x >= 2 && x <= 5) || (x >= 50 && x <= 51 && y >= 27)));

/** A capture of `scale` device pixels per logical point. */
const frameAt = (scale: number): Pixels.Pixels => {
  const width = FRAME.width * scale;
  const height = FRAME.height * scale;
  const at = (x: number, y: number): ReadonlyArray<number> =>
    inked(Math.floor(x / scale), Math.floor(y / scale)) ? GLYPH : PAGE;
  return new Pixels.Pixels({
    width,
    height,
    data: Uint8Array.from(
      Arr.flatMap(Arr.range(0, height - 1), (y) =>
        Arr.flatMap(Arr.range(0, width - 1), (x) => at(x, y)),
      ),
    ),
  });
};

const BOX = { x: 0, y: 0, width: FRAME.width, height: FRAME.height } as const;

/** The reader's answer, or a failure no test can pass through. */
const readOf = (
  frame: Pixels.Pixels,
  region: InkBox,
  scale: number,
  hex: string,
): TruncationRead =>
  Option.match(readTruncation(frame, region, scale, hex), {
    onNone: () => {
      throw new Error("the drawn frame carries ink the reader did not find");
    },
    onSome: (read) => read,
  });

describe("the truncation reader", () => {
  it("counts the painted lines and the ink's own right edge", () => {
    const read = readOf(frameAt(1), BOX, 1, INK);
    expect(read.lines).toBe(2);
    // The dots end one point before the inclusive column, so the edge is 52.
    expect(read.right).toBe(52);
  });

  it("tells a clipped stem from an ellipsis by the top of the line", () => {
    const read = readOf(frameAt(1), BOX, 1, INK);
    // Four columns of a stem over the five upper rows of a ten-row line.
    expect(read.headUpper).toBe(20);
    // The dots sit on the baseline, below the upper half: an ellipsis, not ink.
    expect(read.tailUpper).toBe(0);
  });

  it("reads the same run at a device scale", () => {
    const read = readOf(frameAt(2), BOX, 2, INK);
    expect(read.right).toBe(52);
    expect(read.headUpper).toBe(80);
    expect(read.tailUpper).toBe(0);
  });

  it("reports a region with no ink as absent rather than empty", () => {
    const blank = { x: 30, y: 0, width: 8, height: 4 } as const;
    expect(readTruncation(frameAt(1), blank, 1, INK)).toBe(Option.none());
  });

  it("reports a region outside the capture and a colour it cannot read as absent", () => {
    const outside = { x: 400, y: 0, width: 40, height: 40 } as const;
    expect(readTruncation(frameAt(1), outside, 1, INK)).toBe(Option.none());
    expect(readTruncation(frameAt(1), BOX, 1, "notacolour")).toBe(
      Option.none(),
    );
  });

  it("keeps the box width the probe asks a run to fit", () => {
    expect(TRUNCATION_WIDTH).toBe(200);
  });
});

describe("the truncation probe's record", () => {
  it("registers one probe for the ids the fixture names", () => {
    expect(
      Arr.filter(liveRegistry, (probe) => probe.id === "text-truncation"),
    ).toEqual([
      {
        id: "text-truncation",
        title: expect.stringContaining("ellipsis"),
        capability: "content",
      },
    ]);
    expect(Object.values(TRUNCATION_IDS)).toContain("truncation-clamp-box");
  });

  it("documents the probe under the version it was measured on", () => {
    expect(readme).toContain("### `text-truncation` — measured on 0.11.0 here");
  });

  it("prints the check count the steps assert", () => {
    const asserted = steps.match(/ctx\.expect[A-Za-z]+\(/g)?.length ?? 0;
    expect(asserted).toBeGreaterThan(10);
    const printed = Number(
      /(\d+) checks, `--only text-truncation`/.exec(readme)?.[1] ?? Number.NaN,
    );
    expect(printed).toBe(asserted);
  });

  it("states the clamp limitation the frame measured", () => {
    // The page and the probe have to agree that `lineClamp` paints every line
    // and that a definite height is the cut; a runtime bump that fixes the
    // clamp fails the probe, and one that fixes only the page fails this.
    expect(steps).toContain(
      "a clamp on the text paints every line of the paragraph",
    );
    expect(steps).toContain("a clamp on the box paints every line too");
    expect(steps).toContain(
      "a definite height with a hidden overflow paints the two lines",
    );
    expect(readme).toContain("**`lineClamp` does not paint in 0.11.0.**");
  });
});
