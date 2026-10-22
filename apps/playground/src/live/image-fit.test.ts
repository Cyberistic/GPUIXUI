/**
 * Holds the placement arithmetic the `image-fit` probe reads a window with, and
 * the claims its README section prints.
 *
 * The probe's whole evidence is a frame: a band paints somewhere, or the page
 * does. Those coordinates come from `fitRect`/`bandSamples`/`edgeSamples`, so
 * this file pins them — a wrong placement would make the probe assert the wrong
 * pixel and still pass if the runtime painted what the fixture mispredicted.
 *
 * `node:fs` is deliberate, as in `registry.test.ts`: this checks the
 * repository's own probe and prose, not a runtime path.
 */
import { readFileSync } from "node:fs";
import { Match } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  bandRect,
  bandSamples,
  caseRect,
  edgeSamples,
  FIT_BANDS,
  FIT_CASES,
  FIT_CHECKS,
  FIT_IDS,
  FIT_SMALL_BOX,
  FIT_SOURCE_HEIGHT,
  FIT_SOURCE_WIDTH,
  fitPixels,
  fitRect,
  placementLabel,
  roundCase,
  roundSamples,
  visibleBands,
  type FitCase,
  type FitMode,
} from "./image-fit.js";
import { liveRegistry } from "./registry.js";

const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);

const scenarios = readFileSync(
  new URL("./scenarios.tsx", import.meta.url),
  "utf8",
);

/** The `imageFitSteps` effect, bounded by the next declaration after it. */
const steps = (() => {
  const start = scenarios.indexOf("const imageFitSteps");
  if (start === -1) return "";
  const after = [
    scenarios.indexOf("\nconst ", start + 1),
    scenarios.indexOf("\nexport const ", start + 1),
  ].filter((end) => end > start);
  return scenarios.slice(
    start,
    after.length === 0 ? scenarios.length : Math.min(...after),
  );
})();

/** The probe view, bounded the same way. */
const view = (() => {
  const start = scenarios.indexOf("const ImageFitProbe");
  if (start === -1) return "";
  const end = scenarios.indexOf("\nconst imageFitSteps", start);
  return scenarios.slice(start, end === -1 ? scenarios.length : end);
})();

const caseOf = (id: string): FitCase =>
  Option.match(
    Arr.findFirst(FIT_CASES, (image) => image.id === id),
    {
      onNone: () => expect.unreachable(`the fixture has no ${id} case`),
      onSome: (image) => image,
    },
  );

describe("the image-fit fixture", () => {
  it("builds the bitmap from its bands, in order", () => {
    // The bands tile the source, or a pixel would belong to none of them.
    const starts = Arr.map(FIT_BANDS, (band) => band.start);
    const ends = Arr.map(FIT_BANDS, (band) => band.start + band.width);
    expect(starts).toEqual([0, 14, 26]);
    expect(ends).toEqual([14, 26, FIT_SOURCE_WIDTH]);
    expect(FIT_SOURCE_HEIGHT).toBe(20);

    const pixels = fitPixels();
    expect(pixels.length).toBe(FIT_SOURCE_WIDTH * FIT_SOURCE_HEIGHT * 4);
    // Row 0 is the three runs, and every row is that row again.
    const firstRow = Arr.map(FIT_BANDS, (band) =>
      Arr.makeBy(band.width, () => [
        band.colour.r,
        band.colour.g,
        band.colour.b,
        0xff,
      ]),
    );
    const row = Arr.flatten(Arr.flatten(firstRow));
    expect(Arr.fromIterable(pixels.subarray(0, row.length))).toEqual(row);
    expect(
      Arr.every(
        Arr.makeBy(FIT_SOURCE_HEIGHT, (y) => y),
        (y) =>
          Arr.every(
            row,
            (byte, index) => pixels[y * row.length + index] === byte,
          ),
      ),
    ).toBe(true);
  });

  it("places every mode where the runtime's own fit arithmetic says", () => {
    expect(placementLabel(fitRect("fill", caseOf(FIT_IDS.fill).box))).toBe(
      "0,0 160×160",
    );
    expect(placementLabel(caseRect(caseOf(FIT_IDS.contain)))).toBe(
      "0,40 160×80",
    );
    expect(placementLabel(caseRect(caseOf(FIT_IDS.cover)))).toBe(
      "-80,0 320×160",
    );
    expect(placementLabel(caseRect(caseOf(FIT_IDS.scaleDown)))).toBe(
      "60,70 40×20",
    );
    // `none` keeps the bitmap's size at the box's origin, not its centre.
    expect(placementLabel(caseRect(caseOf(FIT_IDS.none)))).toBe("0,0 40×20");
    expect(placementLabel(caseRect(caseOf(FIT_IDS.scaleDownSmall)))).toBe(
      "0,5 20×10",
    );
    expect(placementLabel(caseRect(caseOf(FIT_IDS.noneSmall)))).toBe(
      "0,0 40×20",
    );
  });

  it("keeps the five modes apart, and the two documented pairs together", () => {
    const signature = (mode: FitMode): string =>
      placementLabel(fitRect(mode, caseOf(FIT_IDS.fill).box));
    const signatures = Arr.map(
      ["fill", "contain", "cover", "scaleDown", "none"] as const,
      signature,
    );
    expect(new Set(signatures).size).toBe(5);
    // An absent prop is the runtime's default, which is `contain`.
    expect(caseRect(caseOf(FIT_IDS.default))).toEqual(
      caseRect(caseOf(FIT_IDS.contain)),
    );
    // For a bitmap smaller than its box, `scaleDown` and `none` differ only in
    // the anchor; a larger bitmap is the only place their scale differs too.
    expect(placementLabel(caseRect(caseOf(FIT_IDS.scaleDownSmall)))).not.toBe(
      placementLabel(caseRect(caseOf(FIT_IDS.noneSmall))),
    );
  });

  it("samples the middle of each band the box shows", () => {
    expect(
      Arr.map(bandSamples(caseOf(FIT_IDS.contain)), (sample) => [
        sample.band.name,
        sample.x,
        sample.y,
      ]),
    ).toEqual([
      ["red", 28, 80],
      ["green", 80, 80],
      ["blue", 132, 80],
    ]);
    // The `cover` crop starts 80 points into the 320-point scale, so the outer
    // bands are narrower than they are in the source.
    const cover = visibleBands(caseOf(FIT_IDS.cover));
    expect(
      Arr.map(cover, ({ band, span }) => [band.name, span.start, span.end]),
    ).toEqual([
      ["red", 0, 32],
      ["green", 32, 128],
      ["blue", 128, 160],
    ]);
    // The small `none` box crops the blue band away entirely.
    expect(
      Arr.map(
        bandSamples(caseOf(FIT_IDS.noneSmall)),
        (sample) => sample.band.name,
      ),
    ).toEqual(["red", "green"]);
  });

  it("reads the page at each edge the bitmap misses", () => {
    const edges = (id: string) =>
      Arr.map(edgeSamples(caseOf(id)), (sample) => [
        sample.edge,
        sample.expected,
      ]);
    expect(edges(FIT_IDS.fill)).toEqual([
      ["left", "bitmap"],
      ["right", "bitmap"],
      ["top", "bitmap"],
      ["bottom", "bitmap"],
    ]);
    // `contain` covers the width and letterboxes the height.
    expect(edges(FIT_IDS.contain)).toEqual([
      ["left", "bitmap"],
      ["right", "bitmap"],
      ["top", "page"],
      ["bottom", "page"],
    ]);
    // `none` anchors at the origin, so the page shows to its right and below.
    expect(edges(FIT_IDS.none)).toEqual([
      ["left", "bitmap"],
      ["right", "page"],
      ["top", "bitmap"],
      ["bottom", "page"],
    ]);
    // A larger bitmap is scaled down inside the small box: the page shows above
    // and below, while `none` keeps its own size and is cropped instead.
    expect(edges(FIT_IDS.scaleDownSmall)).toEqual([
      ["left", "bitmap"],
      ["right", "bitmap"],
      ["top", "page"],
      ["bottom", "page"],
    ]);
    expect(edges(FIT_IDS.noneSmall)).toEqual([
      ["left", "bitmap"],
      ["right", "bitmap"],
      ["top", "bitmap"],
      ["bottom", "bitmap"],
    ]);
  });

  it("clips one corner of the rounded case and leaves its middle painted", () => {
    const rounded = Option.match(roundCase, {
      onNone: () => expect.unreachable("the fixture has no rounded case"),
      onSome: (image) => image,
    });
    expect(rounded.id).toBe(FIT_IDS.round);
    expect(rounded.box).toEqual(caseOf(FIT_IDS.cover).box);
    expect(
      Arr.map(roundSamples(rounded), (sample) => [
        sample.what,
        sample.x,
        sample.y,
        sample.expected,
      ]),
    ).toEqual([
      ["corner", 4, 4, "page"],
      ["top", 80, 4, "bitmap"],
      ["centre", 80, 80, "bitmap"],
    ]);
  });

  it("counts every check the probe asserts", () => {
    // 161 as measured: two header reads, three per case, two per sample, and
    // the rounded case's declaration and second box read.
    expect(FIT_CHECKS).toBe(161);
    expect(FIT_SMALL_BOX).toEqual({ width: 20, height: 20 });
    const red = Option.match(Arr.head(FIT_BANDS), {
      onNone: () => expect.unreachable("the fixture has no red band"),
      onSome: (band) => band,
    });
    expect(bandRect(red, fitRect("none", FIT_SMALL_BOX))).toEqual({
      x: 0,
      y: 0,
      width: 14,
      height: FIT_SOURCE_HEIGHT,
    });
  });
});

describe("the image-fit probe's record", () => {
  it("registers the probe and its capability", () => {
    expect(liveRegistry.filter((probe) => probe.id === "image-fit")).toEqual([
      {
        id: "image-fit",
        title: expect.stringContaining("cover"),
        capability: "content",
      },
    ]);
  });

  it("documents it under the version it was measured on", () => {
    expect(readme).toContain("### `image-fit` — measured on 0.11.0 here");
  });

  it("prints the number of checks the probe asserts", () => {
    const printed = Number(
      /(\d+) checks, `--only image-fit`/.exec(readme)?.[1] ?? Number.NaN,
    );
    expect(printed).toBe(FIT_CHECKS);
  });

  it("prints the placement the fixture computes, not a remembered one", () => {
    Arr.forEach(FIT_CASES, (image) => {
      // The whole cell, so a value shifted into a sibling row fails: the
      // default and `contain` rows share a placement, and reading the page as
      // one string would let a wrong row pass.
      Match.value(Option.isSome(image.radius)).pipe(
        Match.when(true, () => {
          expect(readme).toContain(`| ${image.label} | as \`cover\` |`);
        }),
        Match.when(false, () => {
          expect(readme).toContain(
            `| ${image.label} | \`${placementLabel(caseRect(image))}\` |`,
          );
        }),
        Match.exhaustive,
      );
    });
  });

  it("mounts the fixture the section describes", () => {
    expect(view).toContain("setImagePixels");
    expect(view).toContain("FIT_SOURCE_WIDTH");
    expect(view).toContain("Option.getOrUndefined(image.fit)");
    expect(view).toContain("Option.getOrElse(image.radius, () => 0)");
    expect(steps).toContain("Effect.forEach");
    expect(steps).toContain("bandSamples(image)");
    expect(steps).toContain("edgeSamples(image)");
    expect(steps).toContain("roundSamples(rounded)");
    expect(steps).toContain('capture("image-fit")');
  });

  it("keeps the probe ids apart", () => {
    const ids = new Set<string>(Arr.map(liveRegistry, (probe) => probe.id));
    const fixtureIds = Arr.map(FIT_CASES, (image) => image.id);
    expect(Arr.filter(fixtureIds, (id) => ids.has(id))).toEqual([]);
    expect(new Set(fixtureIds).size).toBe(fixtureIds.length);
  });
});
