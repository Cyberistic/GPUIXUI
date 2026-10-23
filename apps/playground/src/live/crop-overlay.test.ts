/**
 * Holds the `crop-overlay` fixture, the probe that paints it, and the numbers
 * the README teaches.
 *
 * The bug this guards: Tier 5's *Crop area* row said the paint *under* a crop
 * was measured and the crop itself was not — the mask, the press it must not
 * take and the handle's clamp were claims. The probe settles all three in a
 * window; this suite keeps the arithmetic it paints and the prose a reader
 * plans from pointing at the same numbers.
 *
 * `node:fs` is deliberate, as in the other live fixtures: this reads the
 * repository's own probe and prose, never a runtime path.
 */
import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import { blend, alphaOf, getTheme } from "@gpuixui/tokens";
import {
  CROP_CHECKS,
  CROP_HANDLE,
  CROP_IDS,
  CROP_IMAGE_HEIGHT,
  CROP_IMAGE_HEX,
  CROP_IMAGE_WIDTH,
  CROP_MIN,
  CROP_OPENING,
  CROP_OUTSIDE_POINT,
  cropBars,
  cropCentre,
  cropHandleBox,
  cropMaskColour,
  cropMaskPaint,
  cropPixels,
  cropPrefix,
  cropReadout,
  draggedCrop,
  sameBox,
} from "./crop-overlay.js";
import { liveRegistry } from "./registry.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const probe = read("./crop-overlay-probe.tsx");
const readme = read("../../README.md");

const theme = getTheme("dark");

describe("the mask's arithmetic", () => {
  it("leaves the hole uncovered and covers everything else", () => {
    const bars = cropBars(CROP_OPENING);
    expect(Arr.map(bars, (bar) => bar.side)).toEqual([
      "top",
      "right",
      "bottom",
      "left",
    ]);
    expect(bars).toEqual([
      { side: "top", box: { x: 0, y: 0, width: 240, height: 40 } },
      { side: "right", box: { x: 160, y: 40, width: 80, height: 70 } },
      { side: "bottom", box: { x: 0, y: 110, width: 240, height: 50 } },
      { side: "left", box: { x: 0, y: 40, width: 60, height: 70 } },
    ]);

    // The four bars plus the hole are the bitmap, with no overlap and no gap.
    const covered = Arr.reduce(
      bars,
      CROP_OPENING.width * CROP_OPENING.height,
      (total, bar) => total + bar.box.width * bar.box.height,
    );
    expect(covered).toBe(CROP_IMAGE_WIDTH * CROP_IMAGE_HEIGHT);
    const hole = cropCentre(CROP_OPENING);
    expect(
      Arr.some(
        bars,
        (bar) =>
          hole.x >= bar.box.x &&
          hole.x < bar.box.x + bar.box.width &&
          hole.y >= bar.box.y &&
          hole.y < bar.box.y + bar.box.height,
      ),
    ).toBe(false);
  });

  it("paints no bar outside a hole that reaches the frame's edges", () => {
    expect(
      Arr.map(
        cropBars({ x: 0, y: 0, width: 240, height: 160 }),
        (bar) => bar.side,
      ),
    ).toEqual([]);
    expect(
      Arr.map(
        cropBars({ x: 60, y: 40, width: 180, height: 120 }),
        (bar) => bar.side,
      ),
    ).toEqual(["top", "left"]);
  });

  it("centres the handle on the hole's bottom-right corner", () => {
    expect(cropHandleBox(CROP_OPENING)).toEqual({
      x: 155,
      y: 105,
      width: CROP_HANDLE,
      height: CROP_HANDLE,
    });
  });

  it("composites the veil over the bitmap rather than over the page", () => {
    // Two premises: the veil is translucent, and the pixel it leaves is that
    // veil over the bitmap — a bar painted under the picture leaves the bitmap.
    expect(alphaOf(cropMaskColour(theme))).toBeLessThan(1);
    expect(cropMaskPaint(theme)).toBe(
      blend(
        CROP_IMAGE_HEX,
        theme.colors.overlay,
        alphaOf(theme.colors.overlay),
      ),
    );
    expect(cropMaskPaint(theme)).not.toBe(CROP_IMAGE_HEX);
    // The point the probe samples outside the opening is covered at rest.
    const bars = cropBars(CROP_OPENING);
    expect(
      Arr.some(
        bars,
        (bar) =>
          CROP_OUTSIDE_POINT.x >= bar.box.x &&
          CROP_OUTSIDE_POINT.x < bar.box.x + bar.box.width &&
          CROP_OUTSIDE_POINT.y >= bar.box.y &&
          CROP_OUTSIDE_POINT.y < bar.box.y + bar.box.height,
      ),
    ).toBe(true);
    // …and inside the hole the second drag leaves.
    const largest = draggedCrop(CROP_OPENING, 1000, 1000);
    expect(
      CROP_OUTSIDE_POINT.x < largest.x + largest.width &&
        CROP_OUTSIDE_POINT.y < largest.y + largest.height,
    ).toBe(true);
  });

  it("paints one solid bitmap, so a hole's pixel cannot be an edge", () => {
    const pixels = cropPixels();
    expect(pixels.length).toBe(CROP_IMAGE_WIDTH * CROP_IMAGE_HEIGHT * 4);
    const distinct = Arr.dedupe(
      Arr.makeBy(
        CROP_IMAGE_WIDTH * CROP_IMAGE_HEIGHT,
        (pixel) =>
          `${pixels[pixel * 4] ?? 0},${pixels[pixel * 4 + 1] ?? 0},${
            pixels[pixel * 4 + 2] ?? 0
          }`,
      ),
    );
    expect(distinct.length).toBe(1);
  });
});

describe("the handle's clamp", () => {
  it("grows toward the bitmap's edges and stops there", () => {
    expect(draggedCrop(CROP_OPENING, 40, 30)).toEqual({
      x: 60,
      y: 40,
      width: 140,
      height: 100,
    });
    expect(draggedCrop(CROP_OPENING, 1000, 1000)).toEqual({
      x: 60,
      y: 40,
      width: CROP_IMAGE_WIDTH - 60,
      height: CROP_IMAGE_HEIGHT - 40,
    });
  });

  it("never narrows below the minimum, and keeps its origin", () => {
    expect(draggedCrop(CROP_OPENING, -1000, -1000)).toEqual({
      x: CROP_OPENING.x,
      y: CROP_OPENING.y,
      width: CROP_MIN,
      height: CROP_MIN,
    });
    // The second drag starts where the first left the hole, not at the
    // opening, so a caller applies the delta to the crop its press saw.
    const smallest = draggedCrop(CROP_OPENING, -1000, -1000);
    expect(draggedCrop(smallest, 1000, 1000)).toEqual({
      x: smallest.x,
      y: smallest.y,
      width: CROP_IMAGE_WIDTH - smallest.x,
      height: CROP_IMAGE_HEIGHT - smallest.y,
    });
  });

  it("moves nothing for a delta no pointer can carry", () => {
    expect(
      draggedCrop(CROP_OPENING, Number.NaN, Number.POSITIVE_INFINITY),
    ).toEqual(CROP_OPENING);
  });
});

describe("the readout", () => {
  it("spells the hole, the moves and both press channels", () => {
    expect(cropPrefix(CROP_OPENING)).toBe("crop=60,40,100,70");
    expect(
      cropReadout({
        crop: CROP_OPENING,
        moves: 8,
        framePresses: 1,
        imagePresses: 0,
      }),
    ).toBe("crop=60,40,100,70 moves=8 frame=1 image=0");
  });

  it("compares a reported box within one point", () => {
    const box = { x: 0, y: 0, width: 240, height: 160 };
    expect(sameBox(box, box)).toBe(true);
    expect(sameBox({ ...box, x: 1 }, box)).toBe(true);
    expect(sameBox({ ...box, width: 242 }, box)).toBe(false);
  });
});

describe("the probe and the registry", () => {
  it("registers the probe as a content measurement", () => {
    expect(liveRegistry).toContainEqual({
      id: "crop-overlay",
      title:
        "Content: a crop frame masks a bitmap with four veil bars that take no press, and a corner handle drags the hole inside the bitmap's own bounds",
      capability: "content",
    });
    expect(CROP_IDS.frame).toBe("crop-frame");
  });

  it("drives the mask, the clamp and the paint through the fixture", () => {
    // A probe that re-implemented the arithmetic could pass while the README
    // taught the fixture's numbers, so the composition is the claim.
    expect(probe).toContain("cropBars(crop)");
    expect(probe).toContain("draggedCrop(");
    expect(probe).toContain("cropMaskColour(theme)");
    expect(probe).toContain("cropMaskPaint(palettes.dark)");
    expect(probe).toContain("cropHandleBox(crop)");
    expect(probe).toContain("cropCentre(CROP_OPENING)");
    expect(probe).toContain("sameBox(");
  });

  it("declares the no-press rule the negative control measured", () => {
    // Without this rule a bar is the hit test's answer and the picture beneath
    // it is unreachable — the measured control this suite exists to keep.
    expect(probe).toContain('pointerEvents: "none"');
  });

  it("counts the checks the probe can assert", () => {
    // The printed count is the run's own, so it cannot be derived statically;
    // the assertion sites are the floor a hollow probe cannot fall below.
    const steps = probe.slice(probe.indexOf("export const cropOverlaySteps"));
    const sites = Arr.length(
      Arr.fromIterable(steps.matchAll(/ctx\.expect\w+\(/g)),
    );
    expect(sites).toBeGreaterThan(0);
    expect(CROP_CHECKS).toBeGreaterThanOrEqual(sites);
  });
});

describe("the README", () => {
  it("documents the measurement under the version it was made on", () => {
    expect(readme).toContain("### `crop-overlay` — measured on 0.11.0 here");
    expect(readme).toContain(`${CROP_CHECKS} checks`);
    expect(readme).toContain("`src/live/crop-overlay.ts`");
    expect(readme).toContain("crop-overlay.test.ts");
  });

  it("prints the values the fixture computes", () => {
    const flat = readme.replace(/\s+/g, " ");
    // The composite, the opening's bars and both clamped holes, derived here
    // so a fixture edit cannot leave the page on the previous numbers.
    expect(flat).toContain(cropMaskPaint(theme));
    expect(flat).toContain(CROP_IMAGE_HEX);
    expect(flat).toContain(cropPrefix(draggedCrop(CROP_OPENING, -1000, -1000)));
    expect(flat).toContain(cropPrefix(draggedCrop(CROP_OPENING, 1000, 1000)));
    expect(flat).toContain(String(CROP_MIN));
    expect(flat).toContain(String(CROP_HANDLE));
  });

  it("states the press routing the window measured", () => {
    // The measured fact: a press on the bitmap reports on the frame, never on
    // the image, so a picture-pan handler belongs on the frame.
    const flat = readme.replace(/\s+/g, " ");
    expect(flat).toContain("frame=1 image=0");
    expect(flat).toContain("frame=2 image=0");
    expect(flat).toContain("An `<img>` is not a press target");
    expect(flat).not.toContain("report an image press");
  });

  it("names the limits it did not measure rather than implying them", () => {
    // A crop that shrinks from the top-left, a rotation and a keyboard path are
    // not measured here; the page must say so instead of leaving a reader to
    // infer them from the picture.
    const flat = readme.replace(/\s+/g, " ");
    expect(flat).toContain("a rotate gesture");
    expect(flat).toContain("no keyboard path for the handle");
    expect(flat).toContain("shrinks from the top-left corner");
    expect(
      Arr.filter(
        ["crop-rest", "crop-min", "crop-max", "crop-dragged"],
        (state) => !flat.includes(`.artifacts/live/${state}.png`),
      ),
    ).toEqual([]);
  });
});
