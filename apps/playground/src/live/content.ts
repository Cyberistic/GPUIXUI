import * as Arr from "effect/Array";

export interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

const rgb = (r: number, g: number, b: number): Rgb => ({ r, g, b });

const byte = (value: number): string => value.toString(16).padStart(2, "0");

export const hexOf = (colour: Rgb): string =>
  `#${[colour.r, colour.g, colour.b].map(byte).join("")}`;

export const SVG_TINT = rgb(0xff, 0x00, 0xff);

export const SOURCE_FILL = rgb(0x12, 0x34, 0x56);

export const SURFACE_COLOURS = {
  bar: rgb(0x2e, 0xcc, 0x71),
  bubble: rgb(0x34, 0x98, 0xdb),
  line: rgb(0xe7, 0x4c, 0x3c),
  axis: rgb(0xf1, 0xc4, 0x0f),
  label: rgb(0xe6, 0x7e, 0x22),
} as const;

export const LAYER_SHAPES = ["bar", "bubble", "line", "axis", "label"] as const;

export type LayerShape = (typeof LAYER_SHAPES)[number];

const SHAPES = {
  bar: `<rect x="4" y="40" width="36" height="56" fill="FILL"/>`,
  bubble: `<circle cx="72" cy="70" r="14" fill="FILL"/>`,
  line: `<path d="M100 80 L130 40 L160 62 L190 18" fill="none" stroke="FILL" stroke-width="4"/>`,
  axis: `<line x1="4" y1="96" x2="276" y2="96" stroke="FILL" stroke-width="2"/>`,
  label: `<text x="208" y="60" font-size="20" fill="FILL">42</text>`,
} as const satisfies Readonly<Record<LayerShape, string>>;

const SVG_OPEN =
  '<svg xmlns="http://www.w3.org/2000/svg" width="280" height="100" viewBox="0 0 280 100">';

const shapeSource = (shape: LayerShape, colour: Rgb): string =>
  `${SVG_OPEN}${SHAPES[shape].replaceAll("FILL", hexOf(colour))}</svg>`;

export const CHART_SVG = `${SVG_OPEN}${Arr.join(
  Arr.map(LAYER_SHAPES, (shape) => shapeSource(shape, SOURCE_FILL)),
  "",
)}</svg>`;

export const layerSvg = (shape: LayerShape): string =>
  shapeSource(shape, SURFACE_COLOURS[shape]);

export const layerColour = (shape: LayerShape): Rgb => SURFACE_COLOURS[shape];

export const IMAGE_COLOUR = rgb(0x9b, 0x59, 0xb6);

export const BUFFER_COLOUR = rgb(0x00, 0xff, 0x00);

export const CANVAS_PARENT = rgb(0x16, 0xa0, 0x85);

export const IMAGE_SIZE = 8;

export const IMAGE_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAE0lEQVR4nGOYHbntPz7MMDIUAACeAapBVGHBIwAAAABJRU5ErkJggg==";

export const imagePixels = (): Uint8Array => {
  const pixel = [
    BUFFER_COLOUR.r,
    BUFFER_COLOUR.g,
    BUFFER_COLOUR.b,
    0xff,
  ] as const;
  return Uint8Array.from(
    Arr.flatten(Arr.makeBy(IMAGE_SIZE * IMAGE_SIZE, () => pixel)),
  );
};
