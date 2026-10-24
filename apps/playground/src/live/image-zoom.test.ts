/**
 * Holds the `image-zoom` fixture, the probe that drives the shipped component,
 * and the numbers the README teaches.
 *
 * The gap this closes: `ImageZoom` shipped with an offscreen suite that reads
 * the box the runtime was handed, and the *paint* it produces — that an `<img>`
 * host scales its buffer into a bigger box, and that the pan keeps the pointed
 * spot under the pointer — rested on a measurement of a chart's pixel buffer.
 * The probe measures both in a window; this suite keeps the bitmap, the
 * invariants and the prose a reader plans from pointing at the same numbers.
 *
 * The bug this guards is the fixture's own claim: the picture's bytes and the
 * marks the probe samples are two copies of one bitmap, so a mark that moves in
 * the fixture but not in the PNG would have the probe sample the background.
 * The cases decode the embedded bytes and compare them with the declarations, in
 * both directions.
 *
 * `node:fs` is deliberate, as in the other live fixtures: this reads the
 * repository's own probe and prose, never a runtime path.
 */
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";
import { describe, expect, it } from "vitest";
import {
  ZOOM_BACKGROUND,
  ZOOM_CHECKS,
  ZOOM_FRAME,
  ZOOM_HOVERS,
  ZOOM_IDS,
  ZOOM_IMAGE,
  ZOOM_MARKS,
  ZOOM_PICTURE_DATA_URL,
  ZOOM_SCALE,
  covers,
  expectedPaint,
  framePointOf,
  magnified,
  markCentre,
  pictureColour,
  picturePoint,
  pinned,
  rgbaOf,
  sameBox,
  sameZoomBox,
  zoomBoxIn,
  zoomMark,
  zoomMarks,
  zoomReadout,
  type ZoomBox,
} from "./image-zoom.js";
import { liveRegistry } from "./registry.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const probe = read("./image-zoom-probe.tsx");
const scenarios = read("./scenarios.tsx");
const readme = read("../../README.md");
const component = read("../../../../packages/components/src/image-zoom.tsx");

/** The embedded picture, decoded; a byte the decoder refuses fails by name. */
const picture = (): Pixels.Pixels => {
  const bytes = new Uint8Array(
    Buffer.from(ZOOM_PICTURE_DATA_URL.split(",")[1] ?? "", "base64"),
  );
  const frame = Pixels.decodePng(
    bytes,
    (chunk) => new Uint8Array(inflateSync(chunk)),
  );
  if (frame instanceof Pixels.PngDecodeError) throw frame;
  return frame;
};

/** The colour of the decoded picture at one of its own points. */
const pictureAt = (point: { readonly x: number; readonly y: number }) =>
  Pixels.pixelAt(picture(), point.x, point.y);

/** The box the shipped component paints at a hover point, at its own scale. */
const followBox = (point: {
  readonly x: number;
  readonly y: number;
}): ZoomBox => ({
  left:
    -(point.x / ZOOM_FRAME.width) *
    (ZOOM_FRAME.width * ZOOM_SCALE - ZOOM_FRAME.width),
  top:
    -(point.y / ZOOM_FRAME.height) *
    (ZOOM_FRAME.height * ZOOM_SCALE - ZOOM_FRAME.height),
  width: ZOOM_FRAME.width * ZOOM_SCALE,
  height: ZOOM_FRAME.height * ZOOM_SCALE,
});

describe("the picture", () => {
  it("decodes to the size the frame paints it in", () => {
    expect(picture().width).toBe(ZOOM_IMAGE.width);
    expect(picture().height).toBe(ZOOM_IMAGE.height);
    expect(ZOOM_FRAME).toEqual({
      width: ZOOM_IMAGE.width,
      height: ZOOM_IMAGE.height,
    });
  });

  it("carries every mark the fixture declares, at its own box", () => {
    Arr.forEach(zoomMarks(), (mark) => {
      const declared = Pixels.hexToRgba(mark.colour.hex);
      expect(declared).not.toBeNull();
      expect(declared).toEqual({
        r: mark.colour.r,
        g: mark.colour.g,
        b: mark.colour.b,
        a: 0xff,
      });
      // Every corner of the declared box is the mark's paint.
      Arr.forEach(
        [
          { x: mark.box.x, y: mark.box.y },
          { x: mark.box.x + mark.box.width - 1, y: mark.box.y },
          { x: mark.box.x, y: mark.box.y + mark.box.height - 1 },
          {
            x: mark.box.x + mark.box.width - 1,
            y: mark.box.y + mark.box.height - 1,
          },
        ],
        (corner) => expect(pictureAt(corner)).toEqual(declared),
      );
      // A point two pixels outside the box is not: a box drawn too wide fails.
      const outside = pictureAt({
        x: mark.box.x - 2,
        y: mark.box.y + mark.box.height / 2,
      });
      expect(outside).not.toEqual(declared);
    });
  });

  it("paints its background everywhere a mark is not", () => {
    const background = Pixels.hexToRgba(ZOOM_BACKGROUND.hex);
    expect(pictureAt({ x: 0, y: 0 })).toEqual(background);
    expect(pictureAt({ x: 120, y: 80 })).toEqual(background);
    expect(
      pictureAt({ x: ZOOM_IMAGE.width - 1, y: ZOOM_IMAGE.height - 1 }),
    ).toEqual(background);
  });

  it("hovers a mark's own centre, so the pointer is on a colour no page imitates", () => {
    expect(ZOOM_HOVERS.mark).toEqual(markCentre(zoomMark("mark")));
    expect(ZOOM_HOVERS.other).not.toEqual(ZOOM_HOVERS.mark);
    // Both points are inside the frame the probe aims them at.
    Arr.forEach([ZOOM_HOVERS.mark, ZOOM_HOVERS.other], (point) => {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThan(ZOOM_FRAME.width);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThan(ZOOM_FRAME.height);
    });
  });
});

describe("the invariants", () => {
  it("magnifies the picture by the scale it was given, and the rest box does not", () => {
    const zoomed = followBox(ZOOM_HOVERS.mark);
    expect(zoomed).toEqual({ left: -36, top: -72, width: 384, height: 256 });
    expect(magnified(zoomed)).toBe(true);
    expect(
      magnified({
        left: 0,
        top: 0,
        width: ZOOM_FRAME.width,
        height: ZOOM_FRAME.height,
      }),
    ).toBe(false);
    // A box that grew by the wrong factor fails, so the scale is measured.
    expect(magnified(zoomed, 2)).toBe(false);
  });

  it("covers the frame only when the box holds it", () => {
    expect(covers(followBox(ZOOM_HOVERS.mark))).toBe(true);
    expect(covers({ left: 40, top: 40, width: 384, height: 256 })).toBe(false);
    expect(covers({ left: -36, top: -72, width: 200, height: 256 })).toBe(
      false,
    );
  });

  it("keeps the pointed spot's share under the pointer, and refuses a still or centred box", () => {
    expect(pinned(followBox(ZOOM_HOVERS.mark), ZOOM_HOVERS.mark)).toBe(true);
    expect(pinned(followBox(ZOOM_HOVERS.other), ZOOM_HOVERS.other)).toBe(true);
    // A picture that grew without panning drifts the spot the reader points at.
    expect(
      pinned(
        {
          left: 0,
          top: 0,
          width: ZOOM_FRAME.width * ZOOM_SCALE,
          height: ZOOM_FRAME.height * ZOOM_SCALE,
        },
        ZOOM_HOVERS.mark,
      ),
    ).toBe(false);
    // So does a box that magnifies about the frame's centre.
    expect(
      pinned(
        {
          left: -72,
          top: -48,
          width: ZOOM_FRAME.width * ZOOM_SCALE,
          height: ZOOM_FRAME.height * ZOOM_SCALE,
        },
        ZOOM_HOVERS.mark,
      ),
    ).toBe(false);
    // The invariant is per axis: a correct across pan with no down pan fails.
    expect(
      pinned({ ...followBox(ZOOM_HOVERS.mark), top: 0 }, ZOOM_HOVERS.mark),
    ).toBe(false);
  });

  it("maps a picture point to the frame point it paints at, and back", () => {
    const box = followBox(ZOOM_HOVERS.other);
    Arr.forEach(zoomMarks(), (mark) => {
      const centre = markCentre(mark);
      const framePoint = framePointOf(centre, box);
      const back = picturePoint(framePoint, box);
      expect(back.x).toBeCloseTo(centre.x, 6);
      expect(back.y).toBeCloseTo(centre.y, 6);
    });
  });

  it("predicts the mark under a following box and the background under a still one", () => {
    const mark = zoomMark("mark");
    expect(
      expectedPaint(ZOOM_HOVERS.mark, followBox(ZOOM_HOVERS.mark)),
    ).toEqual(Option.some(rgbaOf(mark.colour)));
    expect(
      expectedPaint(ZOOM_HOVERS.mark, {
        left: 0,
        top: 0,
        width: ZOOM_FRAME.width * ZOOM_SCALE,
        height: ZOOM_FRAME.height * ZOOM_SCALE,
      }),
    ).toEqual(Option.some(rgbaOf(ZOOM_BACKGROUND)));
  });

  it("refuses a picture point outside the bitmap instead of naming a colour", () => {
    expect(Option.isNone(pictureColour({ x: -1, y: 10 }))).toBe(true);
    expect(Option.isNone(pictureColour({ x: ZOOM_IMAGE.width, y: 10 }))).toBe(
      true,
    );
    expect(Option.isSome(pictureColour({ x: 120, y: 80 }))).toBe(true);
  });

  it("compares boxes as paint, to half a pixel, and painted boxes to one point", () => {
    const box = { left: 12.25, top: 4, width: 100, height: 50 };
    expect(sameZoomBox(box, { ...box, left: 12.75 })).toBe(true);
    expect(sameZoomBox(box, { ...box, left: 13 })).toBe(false);
    expect(
      sameBox(
        { x: 10, y: 20, width: 30, height: 40 },
        { x: 11, y: 19.5, width: 30.5, height: 39 },
      ),
    ).toBe(true);
    expect(
      sameBox(
        { x: 10, y: 20, width: 30, height: 40 },
        { x: 12, y: 20, width: 30, height: 40 },
      ),
    ).toBe(false);
  });

  it("reads a picture box out of the frame's own origin", () => {
    expect(
      zoomBoxIn(
        { x: 132, y: 192, width: 384, height: 256 },
        { x: 116, y: 120 },
      ),
    ).toEqual({ left: 16, top: 72, width: 384, height: 256 });
  });

  it("prints the pointer and the counters a reader checks", () => {
    expect(zoomReadout({ point: ZOOM_HOVERS.mark, moves: 2, leaves: 0 })).toBe(
      "point=60,120 moves=2 leaves=0",
    );
  });
});

describe("the probe and the registry", () => {
  it("registers the probe as a content measurement", () => {
    expect(liveRegistry).toContainEqual({
      id: "image-zoom-lifecycle",
      title:
        "Content: the shipped image zoom paints the marked spot under the pointer where the pointer is, magnifies the picture into a box larger than its frame, and returns to rest when the pointer leaves",
      capability: "content",
    });
  });

  it("mounts the probe in the live registry", () => {
    expect(scenarios).toContain(
      'import { ImageZoomProbe, imageZoomSteps } from "./image-zoom-probe.js";',
    );
    expect(scenarios).toContain('"image-zoom-lifecycle": {');
    expect(scenarios).toContain("view: () => <ImageZoomProbe />,");
    expect(scenarios).toContain("steps: imageZoomSteps,");
  });

  it("drives the shipped component through the fixture's points and invariants", () => {
    // A probe that re-implemented the zoom could pass while the README taught
    // the fixture's numbers, so the composition is the claim.
    expect(probe).toContain("<ImageZoom");
    expect(probe).toContain("src={ZOOM_PICTURE_DATA_URL}");
    expect(probe).toContain("ctx.host.hoverAt(ZOOM_IDS.frame, point)");
    expect(probe).toContain("magnified(zoomed)");
    expect(probe).toContain("covers(zoomed)");
    expect(probe).toContain("pinned(zoomed, ZOOM_HOVERS.mark)");
    expect(probe).toContain("Pixels.boundsOfColour(");
    expect(probe).toContain(
      'framePointOf(markCentre(zoomMark("far")), pushed)',
    );
  });

  it("publishes the picture id the component paints", () => {
    // The probe samples the picture's box, so a renamed element would leave it
    // sampling nothing at all.
    expect(component).toContain(`testId="${ZOOM_IDS.picture}"`);
  });

  it("counts the checks the probe can assert", () => {
    // The printed count is the run's own, so it cannot be derived statically;
    // the assertion sites are the floor a hollow probe cannot fall below.
    const steps = probe.slice(probe.indexOf("export const imageZoomSteps"));
    const sites = Arr.length(
      Arr.fromIterable(steps.matchAll(/ctx\.expect[A-Za-z]+\(/g)),
    );
    expect(sites).toBeGreaterThan(0);
    expect(ZOOM_CHECKS).toBeGreaterThanOrEqual(sites);
  });
});

describe("the README", () => {
  it("documents the measurement under the version it was made on", () => {
    expect(readme).toContain(
      "### `image-zoom-lifecycle` — measured on 0.11.0 here",
    );
    expect(readme).toContain(`${ZOOM_CHECKS} checks`);
    expect(readme).toContain("`src/live/image-zoom.ts`");
    expect(readme).toContain("image-zoom.test.ts");
  });

  it("prints the values the fixture computes", () => {
    const flat = readme.replace(/\s+/g, " ");
    expect(flat).toContain("240×160");
    expect(flat).toContain("384×256");
    expect(flat).toContain("−36");
    expect(flat).toContain("60,120");
    expect(flat).toContain("200,120");
    expect(flat).toContain(String(ZOOM_SCALE));
    expect(flat).toContain(zoomMark("mark").colour.hex);
    expect(flat).toContain("30×30");
    expect(flat).toContain("48×48");
  });

  it("states the corner limitation it measured rather than implying a rounded frame", () => {
    const flat = readme.replace(/\s+/g, " ");
    expect(flat).toContain("square");
    expect(flat).toContain("clips an overflowing child");
  });

  it("names the marks a reader can look for in the captures", () => {
    Arr.forEach(zoomMarks(), (mark) =>
      expect(ZOOM_MARKS[mark.name]).toBe(mark),
    );
  });
});
