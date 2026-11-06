import { Match } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { hexOf, type Rgb } from "./content.js";

export interface FitBand {
  readonly name: string;
  readonly start: number;
  readonly width: number;
  readonly colour: Rgb;
}

export const FIT_SOURCE_WIDTH = 40;

export const FIT_SOURCE_HEIGHT = 20;

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

export const bandHex = (band: FitBand): string => hexOf(band.colour);

const pixelOf = (colour: Rgb): ReadonlyArray<number> => [
  colour.r,
  colour.g,
  colour.b,
  0xff,
];

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

export type FitMode = "fill" | "contain" | "cover" | "scaleDown" | "none";

export type DeclaredFit = Option.Option<FitMode>;

export interface FitBox {
  readonly width: number;
  readonly height: number;
}

export interface FitRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export const effectiveFit = (fit: DeclaredFit): FitMode =>
  Option.getOrElse(fit, () => "contain");

const centred = (box: FitBox, scale: number): FitRect => ({
  x: (box.width - FIT_SOURCE_WIDTH * scale) / 2,
  y: (box.height - FIT_SOURCE_HEIGHT * scale) / 2,
  width: FIT_SOURCE_WIDTH * scale,
  height: FIT_SOURCE_HEIGHT * scale,
});

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

export interface FitCase {
  readonly id: string;

  readonly label: string;
  readonly fit: DeclaredFit;
  readonly box: FitBox;
  readonly radius: Option.Option<number>;
}

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

export const FIT_BOX: FitBox = { width: 160, height: 160 };

export const FIT_SMALL_BOX: FitBox = { width: 20, height: 20 };

export const FIT_ROUND_RADIUS = 80;

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

export const caseRect = (image: FitCase): FitRect =>
  fitRect(effectiveFit(image.fit), image.box);

export const bandRect = (band: FitBand, rect: FitRect): FitRect => {
  const scale = rect.width / FIT_SOURCE_WIDTH;
  return {
    x: rect.x + band.start * scale,
    y: rect.y,
    width: band.width * scale,
    height: rect.height,
  };
};

export interface FitSpan {
  readonly start: number;
  readonly end: number;
}

const clamp = (value: number, low: number, high: number): number =>
  Math.min(Math.max(value, low), high);

export const visibleSpan = (
  band: FitBand,
  image: FitCase,
): Option.Option<FitSpan> => {
  const rect = bandRect(band, caseRect(image));
  const start = clamp(rect.x, 0, image.box.width);
  const end = clamp(rect.x + rect.width, 0, image.box.width);
  return end - start >= 2 ? Option.some({ start, end }) : Option.none();
};

export interface VisibleBand {
  readonly band: FitBand;
  readonly span: FitSpan;
}

export const visibleBands = (image: FitCase): ReadonlyArray<VisibleBand> =>
  Arr.getSomes(
    Arr.map(FIT_BANDS, (band) =>
      Option.map(visibleSpan(band, image), (span) => ({ band, span })),
    ),
  );

export const visibleRows = (image: FitCase): FitSpan => {
  const rect = caseRect(image);
  return {
    start: clamp(rect.y, 0, image.box.height),
    end: clamp(rect.y + rect.height, 0, image.box.height),
  };
};

export interface FitPoint {
  readonly x: number;
  readonly y: number;
}

export interface BandSample extends FitPoint {
  readonly band: FitBand;
}

export const bandSamples = (image: FitCase): ReadonlyArray<BandSample> => {
  const rows = visibleRows(image);
  const y = (rows.start + rows.end) / 2;
  return Arr.map(visibleBands(image), ({ band, span }) => ({
    band,
    x: (span.start + span.end) / 2,
    y,
  }));
};

export interface EdgeSample extends FitPoint {
  readonly edge: "left" | "right" | "top" | "bottom";
  readonly expected: "bitmap" | "page";
}

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

export interface RoundSample extends FitPoint {
  readonly what: "corner" | "top" | "centre";
  readonly expected: "bitmap" | "page";
}

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

export const placementLabel = (rect: FitRect): string =>
  `${rect.x},${rect.y} ${rect.width}×${rect.height}`;

export const roundCase: Option.Option<FitCase> = Arr.findFirst(
  FIT_CASES,
  (image) => Option.isSome(image.radius),
);

const FIT_PREAMBLE_CHECKS = 3;

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
