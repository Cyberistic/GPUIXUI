/**
 * Where a bitmap's pixels land in a box of a different ratio.
 *
 * `<img>` is the one host whose intrinsic size the runtime owns, and
 * `objectFit` is the only control a component has over how a photo, a
 * thumbnail or a crop preview fills its box. The prop is declared in
 * `@gpuix/native` and every claim about it so far is the typings: `image-box`
 * measures the *box*, never the pixels inside it. `cover` crops, `contain`
 * letterboxes, `fill` stretches — and a theme cannot prove any of them, because
 * a window reports no style and the image is a paint.
 *
 * The fixture is one bitmap with three unequal bands, so a mode's answer is
 * read from the frame rather than inferred: where each band starts, how wide it
 * paints, and whether the page shows at an edge. The arithmetic below is the
 * single source for the probe, its unit test and the README's placements.
 */
import { Match } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { hexOf, type Rgb } from "./content.js";

/** One vertical band of the source bitmap. */
export interface FitBand {
  readonly name: string;
  readonly start: number;
  readonly width: number;
  readonly colour: Rgb;
}

/** The bitmap's width in source pixels. */
export const FIT_SOURCE_WIDTH = 40;

/** The bitmap's height in source pixels. */
export const FIT_SOURCE_HEIGHT = 20;

/**
 * Three unequal bands: 14 red, 12 green, 14 blue.
 *
 * Unequal on purpose — a `cover` crop centred in the box shows part of the
 * outer bands, and that part is only distinguishable from a stretch when the
 * band's painted width is a number the fixture predicted.
 */
export const FIT_BANDS: ReadonlyArray<FitBand> = [
  { name: "red", start: 0, width: 14, colour: { r: 0xff, g: 0x3b, b: 0x30 } },
  {
    name: "green",
    start: 14,
    width: 12,
    colour: { r: 0x34, g: 0xc7, b: 0x59 },
  },
  { name: "blue", start: 26, width: 14, colour: { r: 0x0a, g: 0x84, b: 0xff } },
];

/** The `#rrggbb` a band paints. */
export const bandHex = (band: FitBand): string => hexOf(band.colour);

const pixelOf = (colour: Rgb): ReadonlyArray<number> => [
  colour.r,
  colour.g,
  colour.b,
  0xff,
];

/**
 * The bitmap as straight RGBA, band by band.
 *
 * A row is every band's run in order, which is the same row the unit test holds
 * to the bands' `start` fields.
 */
export const fitPixels = (): Uint8Array =>
  Uint8Array.from(
    Arr.flatten(
      Arr.makeBy(FIT_SOURCE_HEIGHT, () =>
        Arr.flatten(
          Arr.map(FIT_BANDS, (band) =>
            Arr.flatten(Arr.makeBy(band.width, () => pixelOf(band.colour))),
          ),
        ),
      ),
    ),
  );

/** The five values of `objectFit` the runtime declares. */
export type FitMode = "fill" | "contain" | "cover" | "scaleDown" | "none";

/** The mode a case declares; `None` is an absent prop, which the runtime defaults. */
export type DeclaredFit = Option.Option<FitMode>;

/** A box the caller asks for, in logical pixels. */
export interface FitBox {
  readonly width: number;
  readonly height: number;
}

/** The bitmap's placement inside its box, in box coordinates. */
export interface FitRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** The mode a case paints with: an absent prop is the runtime's own default. */
export const effectiveFit = (fit: DeclaredFit): FitMode =>
  Option.getOrElse(fit, () => "contain");

const centred = (box: FitBox, scale: number): FitRect => ({
  x: (box.width - FIT_SOURCE_WIDTH * scale) / 2,
  y: (box.height - FIT_SOURCE_HEIGHT * scale) / 2,
  width: FIT_SOURCE_WIDTH * scale,
  height: FIT_SOURCE_HEIGHT * scale,
});

/**
 * The placement GPUI's `ObjectFit::get_bounds` gives the bitmap.
 *
 * `fill` is the box; `contain` and `scaleDown` scale uniformly and centre the
 * result; `cover` scales past the box and centres the overflow. `none` keeps
 * the bitmap's own size at the box's **origin** — GPUI anchors it top-left
 * rather than centring it, which is the one case the fixture treats differently
 * from its neighbours.
 */
export const fitRect = (mode: FitMode, box: FitBox): FitRect =>
  Match.value(mode).pipe(
    Match.when("fill", () => ({
      x: 0,
      y: 0,
      width: box.width,
      height: box.height,
    })),
    Match.when("contain", () =>
      centred(
        box,
        Math.min(box.width / FIT_SOURCE_WIDTH, box.height / FIT_SOURCE_HEIGHT),
      ),
    ),
    Match.when("cover", () =>
      centred(
        box,
        Math.max(box.width / FIT_SOURCE_WIDTH, box.height / FIT_SOURCE_HEIGHT),
      ),
    ),
    Match.when("scaleDown", () =>
      centred(
        box,
        Math.min(
          1,
          box.width / FIT_SOURCE_WIDTH,
          box.height / FIT_SOURCE_HEIGHT,
        ),
      ),
    ),
    Match.when("none", () => ({
      x: 0,
      y: 0,
      width: FIT_SOURCE_WIDTH,
      height: FIT_SOURCE_HEIGHT,
    })),
    Match.exhaustive,
  );

/** One case: a box, the fit it declares, and an optional clip radius. */
export interface FitCase {
  readonly id: string;
  /** The row label the README prints for this case. */
  readonly label: string;
  readonly fit: DeclaredFit;
  readonly box: FitBox;
  readonly radius: Option.Option<number>;
}

/** The ids the window reports. */
export const FIT_IDS = {
  fill: "imagefit-fill",
  contain: "imagefit-contain",
  cover: "imagefit-cover",
  default: "imagefit-default",
  scaleDown: "imagefit-scale-down",
  none: "imagefit-none",
  scaleDownSmall: "imagefit-scale-down-small",
  noneSmall: "imagefit-none-small",
  round: "imagefit-round",
} as const;

/** The box every full-size case asks for. */
export const FIT_BOX: FitBox = { width: 160, height: 160 };

/** A box smaller than the bitmap, which splits `scaleDown` from `none`. */
export const FIT_SMALL_BOX: FitBox = { width: 20, height: 20 };

/** The radius the rounded case clips with: a circle in its box. */
export const FIT_ROUND_RADIUS = 80;

/**
 * The cases the probe mounts.
 *
 * `default` declares no prop at all, so it measures the runtime's fallback
 * rather than restating it. The two small-box cases are the only place
 * `scaleDown` and `none` can disagree: a bitmap larger than its box is scaled
 * by one and cropped by the other.
 */
export const FIT_CASES: ReadonlyArray<FitCase> = [
  {
    id: FIT_IDS.fill,
    label: "`fill`",
    fit: Option.some("fill"),
    box: FIT_BOX,
    radius: Option.none(),
  },
  {
    id: FIT_IDS.contain,
    label: "`contain`",
    fit: Option.some("contain"),
    box: FIT_BOX,
    radius: Option.none(),
  },
  {
    id: FIT_IDS.cover,
    label: "`cover`",
    fit: Option.some("cover"),
    box: FIT_BOX,
    radius: Option.none(),
  },
  {
    id: FIT_IDS.default,
    label: "absent",
    fit: Option.none(),
    box: FIT_BOX,
    radius: Option.none(),
  },
  {
    id: FIT_IDS.scaleDown,
    label: "`scaleDown`",
    fit: Option.some("scaleDown"),
    box: FIT_BOX,
    radius: Option.none(),
  },
  {
    id: FIT_IDS.none,
    label: "`none`",
    fit: Option.some("none"),
    box: FIT_BOX,
    radius: Option.none(),
  },
  {
    id: FIT_IDS.scaleDownSmall,
    label: "`scaleDown`, 20×20 box",
    fit: Option.some("scaleDown"),
    box: FIT_SMALL_BOX,
    radius: Option.none(),
  },
  {
    id: FIT_IDS.noneSmall,
    label: "`none`, 20×20 box",
    fit: Option.some("none"),
    box: FIT_SMALL_BOX,
    radius: Option.none(),
  },
  {
    id: FIT_IDS.round,
    label: "`cover`, radius 80",
    fit: Option.some("cover"),
    box: FIT_BOX,
    radius: Option.some(FIT_ROUND_RADIUS),
  },
];

/** The placement one case paints, from its declared fit and box. */
export const caseRect = (image: FitCase): FitRect =>
  fitRect(effectiveFit(image.fit), image.box);

/** A band's run inside the box, before the box clips it. */
export const bandRect = (band: FitBand, rect: FitRect): FitRect => {
  const scale = rect.width / FIT_SOURCE_WIDTH;
  return {
    x: rect.x + band.start * scale,
    y: rect.y,
    width: band.width * scale,
    height: rect.height,
  };
};

/** A horizontal run inside the box. */
export interface FitSpan {
  readonly start: number;
  readonly end: number;
}

const clamp = (value: number, low: number, high: number): number =>
  Math.min(Math.max(value, low), high);

/**
 * The part of a band the box shows.
 *
 * `None` when the box clips the band away (a `cover` crop can lose an outer
 * band entirely) or leaves less than two logical pixels, which is too thin for
 * a point sample to call.
 */
export const visibleSpan = (
  band: FitBand,
  image: FitCase,
): Option.Option<FitSpan> => {
  const rect = bandRect(band, caseRect(image));
  const start = clamp(rect.x, 0, image.box.width);
  const end = clamp(rect.x + rect.width, 0, image.box.width);
  return end - start >= 2 ? Option.some({ start, end }) : Option.none();
};

/** One band and the run of the box it paints. */
export interface VisibleBand {
  readonly band: FitBand;
  readonly span: FitSpan;
}

/** Every band the case shows, in source order. */
export const visibleBands = (image: FitCase): ReadonlyArray<VisibleBand> =>
  Arr.getSomes(
    Arr.map(FIT_BANDS, (band) =>
      Option.map(visibleSpan(band, image), (span) => ({ band, span })),
    ),
  );

/** The vertical run of the bitmap the box shows. */
export const visibleRows = (image: FitCase): FitSpan => {
  const rect = caseRect(image);
  return {
    start: clamp(rect.y, 0, image.box.height),
    end: clamp(rect.y + rect.height, 0, image.box.height),
  };
};

/** A point in box coordinates. */
export interface FitPoint {
  readonly x: number;
  readonly y: number;
}

/** One band sample: the middle of the band's visible run, at the row's middle. */
export interface BandSample extends FitPoint {
  readonly band: FitBand;
}

/** What a case must paint at each visible band's centre. */
export const bandSamples = (image: FitCase): ReadonlyArray<BandSample> => {
  const rows = visibleRows(image);
  const y = (rows.start + rows.end) / 2;
  return Arr.map(visibleBands(image), ({ band, span }) => ({
    band,
    x: (span.start + span.end) / 2,
    y,
  }));
};

/** Which of a box's four edges a sample reads, and what it must show. */
export interface EdgeSample extends FitPoint {
  readonly edge: "left" | "right" | "top" | "bottom";
  readonly expected: "bitmap" | "page";
}

/** A distance below which an edge is covered rather than letterboxed. */
export const FIT_EDGE_MARGIN = 3;

const columnsCentre = (image: FitCase): number => {
  const rect = caseRect(image);
  const start = clamp(rect.x, 0, image.box.width);
  const end = clamp(rect.x + rect.width, 0, image.box.width);
  return (start + end) / 2;
};

const rowsCentre = (image: FitCase): number => {
  const rows = visibleRows(image);
  return (rows.start + rows.end) / 2;
};

/**
 * One sample per edge of the box.
 *
 * An edge the bitmap does not reach is sampled in the middle of the gap it
 * leaves (the page); an edge it does reach is sampled two pixels inside, where
 * the band under it must paint. The distinction is what separates `contain`
 * from `fill` on the vertical axis and `cover` from `scaleDown` on the
 * horizontal one.
 */
export const edgeSamples = (image: FitCase): ReadonlyArray<EdgeSample> => {
  const rect = caseRect(image);
  const columns = columnsCentre(image);
  const rows = rowsCentre(image);
  const sample = (
    edge: EdgeSample["edge"],
    gap: number,
    inside: FitPoint,
    beyond: FitPoint,
    pointsTo: FitPoint,
  ): EdgeSample => ({
    edge,
    expected: gap >= FIT_EDGE_MARGIN ? "page" : "bitmap",
    x: gap >= FIT_EDGE_MARGIN ? beyond.x : inside.x,
    y: gap >= FIT_EDGE_MARGIN ? pointsTo.y : inside.y,
  });
  return [
    sample(
      "left",
      Math.max(0, rect.x),
      { x: 2, y: rows },
      { x: Math.max(0, rect.x) / 2, y: rows },
      { x: 0, y: rows },
    ),
    sample(
      "right",
      Math.max(0, image.box.width - (rect.x + rect.width)),
      { x: image.box.width - 2, y: rows },
      {
        x:
          (clamp(rect.x + rect.width, 0, image.box.width) + image.box.width) /
          2,
        y: rows,
      },
      { x: image.box.width, y: rows },
    ),
    sample(
      "top",
      Math.max(0, rect.y),
      { x: columns, y: 2 },
      { x: columns, y: Math.max(0, rect.y) / 2 },
      { x: columns, y: 0 },
    ),
    sample(
      "bottom",
      Math.max(0, image.box.height - (rect.y + rect.height)),
      { x: columns, y: image.box.height - 2 },
      {
        x: columns,
        y:
          (clamp(rect.y + rect.height, 0, image.box.height) +
            image.box.height) /
          2,
      },
      { x: columns, y: image.box.height },
    ),
  ];
};

/** What a rounded image must paint at three points of its own box. */
export interface RoundSample extends FitPoint {
  readonly what: "corner" | "top" | "centre";
  readonly expected: "bitmap" | "page";
}

/** The three reads a `borderRadius` clip adds. */
export const roundSamples = (image: FitCase): ReadonlyArray<RoundSample> => [
  { what: "corner", x: 4, y: 4, expected: "page" },
  { what: "top", x: image.box.width / 2, y: 4, expected: "bitmap" },
  {
    what: "centre",
    x: image.box.width / 2,
    y: image.box.height / 2,
    expected: "bitmap",
  },
];

/** The placement as the README prints it: `x,y width×height`. */
export const placementLabel = (rect: FitRect): string =>
  `${rect.x},${rect.y} ${rect.width}×${rect.height}`;

/** The case a rounded clip is measured on (`None` if the fixture lost it). */
export const roundCase: Option.Option<FitCase> = Arr.findFirst(
  FIT_CASES,
  (image) => Option.isSome(image.radius),
);

/** The two preamble reads plus the rounded fixture's own declaration. */
const FIT_PREAMBLE_CHECKS = 3;

/**
 * How many checks the probe asserts, derived from the fixture.
 *
 * Each case reads its box three times (the report, the width, the height) and
 * then each sample twice: the point must land inside the capture, and the
 * colour there must be the one the fit predicted. The rounded case is read a
 * second time for its clip, so its box is reported twice.
 */
export const FIT_CHECKS =
  FIT_PREAMBLE_CHECKS +
  Arr.reduce(
    FIT_CASES,
    0,
    (total, image) =>
      total + 3 + 2 * (bandSamples(image).length + edgeSamples(image).length),
  ) +
  Option.match(roundCase, {
    onNone: () => 0,
    onSome: (image) => 1 + 2 * roundSamples(image).length,
  });
