/**
 * Holds the arithmetic the `slider-vertical-lifecycle` probe reads a window
 * with, and the claims the probe has to keep making.
 *
 * The probe's whole finding is "the value runs up": a thumb at zero sits on the
 * rail's floor and a drag maps `event.y` from the bottom. That inversion cannot
 * be proved by a frame alone — a caption can say "runs up" over a slider that
 * runs down — so the reader is held to a drawn frame with a known centre and to
 * the primitives' own pointer mapping.
 *
 * The failure being guarded is a ceiling-first formula: it would centre the
 * thumb at the top for a zero value, which is the exact bug the probe exists to
 * settle (measured in the window as `expected 56 ± 1, got 240`).
 */
import { readFileSync } from "node:fs";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { Pixels } from "@gpuixui/testing";
import { verticalPointerValue } from "@gpuixui/primitives";
import { liveRegistry } from "./registry.js";
import {
  VERTICAL_FRACTION,
  VERTICAL_SLIDER_HEIGHT,
  VERTICAL_SLIDER_IDS,
  inkBounds,
  thumbCentreAt,
  thumbCentreY,
  type VerticalBox,
} from "./vertical-slider.js";

const scenarios = readFileSync(
  new URL("./scenarios.tsx", import.meta.url),
  "utf8",
);

const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);

/** The `verticalSliderSteps` effect, bounded by the `box-paint` probe. */
const steps = (() => {
  const start = scenarios.indexOf("const verticalSliderSteps");
  const end = scenarios.indexOf("const BoxPaintProbe", start + 1);
  return start === -1 || end === -1 ? "" : scenarios.slice(start, end);
})();

/** The count the README prints for this probe, if any. */
const printedCheckCount = (): number =>
  Number(
    /(\d+) checks, `--only slider-vertical-lifecycle`/.exec(readme)?.[1] ??
      Number.NaN,
  );

/** The track the probe mounts: a 200-point box with half a thumb at each end. */
const TRACK: VerticalBox = { x: 16, y: 48, width: 32, height: 200 };
const INSET = 8;
const RAIL: VerticalBox = {
  x: 30,
  y: TRACK.y + INSET,
  width: 4,
  height: TRACK.height - 2 * INSET,
};

const INK = "#FF0000";
const PAGE = [255, 255, 255, 255] as const;
const DISC = [255, 0, 0, 255] as const;

/**
 * A drawn frame with a 12-point disc of ink, its top-left at `at`, at `scale`.
 *
 * The frame is the region the reader is given plus a margin, so a wrong origin
 * shows up as a shifted centre rather than as a frame edge.
 */
const frameWithDisc = (at: VerticalBox, scale: number): Pixels.Pixels => {
  const width = 48 * scale;
  const height = 100 * scale;
  const inked = (x: number, y: number): boolean =>
    x >= at.x * scale &&
    x < (at.x + at.width) * scale &&
    y >= at.y * scale &&
    y < (at.y + at.height) * scale;
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const at4 = (y * width + x) * 4;
      const colour = inked(x, y) ? DISC : PAGE;
      data[at4] = colour[0];
      data[at4 + 1] = colour[1];
      data[at4 + 2] = colour[2];
      data[at4 + 3] = colour[3];
    }
  }
  return new Pixels.Pixels({ width, height, data });
};

describe("the vertical slider's axis", () => {
  it("reads a fraction from the floor, and the pointer mapping agrees", () => {
    const range = { min: 0, max: 100, step: 1 } as const;
    for (const fraction of [0, VERTICAL_FRACTION, 0.5, 1]) {
      const y = thumbCentreAt(RAIL, fraction);
      expect(verticalPointerValue(y, TRACK, range, INSET)).toBeCloseTo(
        fraction * 100,
        5,
      );
    }
  });

  it("puts zero on the rail's floor and one on its ceiling", () => {
    // The inversion itself: a ceiling-first formula would swap these.
    expect(thumbCentreAt(RAIL, 0)).toBe(RAIL.y + RAIL.height);
    expect(thumbCentreAt(RAIL, 1)).toBe(RAIL.y);
  });

  it("keeps the caller's height as the track's length", () => {
    expect(VERTICAL_SLIDER_HEIGHT).toBe(200);
    expect(VERTICAL_SLIDER_IDS.slider).not.toBe(VERTICAL_SLIDER_IDS.range);
  });
});

describe("the thumb's paint", () => {
  it("reads the centre of the ink inside the slider's box", () => {
    // A disc whose centre is logical y=40, captured at 2 device pixels a point.
    const disc = { x: 10, y: 34, width: 12, height: 12 } as const;
    const frame = frameWithDisc(disc, 2);
    const centre = Option.getOrNull(
      thumbCentreY(frame, { x: 0, y: 20, width: 40, height: 80 }, 2, INK),
    );
    expect(centre).toBe(40);
  });

  it("reports the ink's logical box, with the region's origin restored", () => {
    const disc = { x: 10, y: 34, width: 12, height: 12 } as const;
    const frame = frameWithDisc(disc, 2);
    expect(
      Option.getOrNull(
        inkBounds(frame, { x: 0, y: 20, width: 40, height: 80 }, 2, INK),
      ),
    ).toEqual({ x: 10, y: 34, width: 12, height: 12 });
  });

  it("reads nothing from a colour the region does not paint", () => {
    expect(
      thumbCentreY(
        frameWithDisc({ x: 10, y: 34, width: 12, height: 12 }, 1),
        {
          x: 0,
          y: 20,
          width: 40,
          height: 80,
        },
        1,
        "#00FF00",
      ),
    ).toBe(Option.none());
  });
});

describe("the probe's documentation", () => {
  it("registers the probe the fixture names", () => {
    expect(
      liveRegistry.filter((probe) => probe.id === "slider-vertical-lifecycle"),
    ).toEqual([
      {
        id: "slider-vertical-lifecycle",
        title: expect.stringContaining("vertical slider"),
        capability: "input",
      },
    ]);
    expect(readme).toContain(
      "### `slider-vertical-lifecycle` — measured on 0.11.0 here",
    );
  });

  it("prints the check count the probe actually asserts", () => {
    // A `paintedBox` call is one `the runtime paints <id>` check as well as the
    // box it returns, so both sites count.
    const asserted =
      (steps.match(/ctx\.expect[A-Za-z]+\(/g)?.length ?? 0) +
      (steps.match(/paintedBox\(/g)?.length ?? 0);
    expect(asserted).toBeGreaterThan(10);
    expect(printedCheckCount()).toBe(asserted);
  });

  it("states the axis the frame measured", () => {
    // Each claim is the one check that would pass if the axis were reversed, so
    // a probe that drops one leaves the measurement unreadable rather than red.
    expect(steps).toContain("a thumb at zero is centred on the rail's floor");
    expect(steps).toContain("a press at the track's centre reports half");
    expect(steps).toContain("a drag to a quarter from the floor reports 25");
    expect(steps).toContain(
      "no fill paints above the thumb: the bar grows from the floor",
    );
    expect(steps).toContain(
      "a pointer move after the release does not move the value",
    );
    expect(steps).toContain("the range's lower thumb is centred on its value");
    expect(readme).toContain("**The value that runs up.**");
  });
});
