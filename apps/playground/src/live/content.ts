/**
 * Fixtures for the `content-surfaces` probe: the shapes a chart needs, an
 * in-memory image, and a PNG small enough to carry as a data URL.
 *
 * A colour is an sRGB tuple here, not a hex string: the probe asserts exact
 * bytes in a captured frame, so the same tuple builds the markup's `#rrggbb`
 * and the value the frame is counted for. Nothing is parsed back from text.
 */
import * as Arr from "effect/Array";

/** One sRGB colour, as the bytes a frame stores. */
export interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

const rgb = (r: number, g: number, b: number): Rgb => ({ r, g, b });

const byte = (value: number): string => value.toString(16).padStart(2, "0");

/** The `#rrggbb` a markup attribute carries. */
export const hexOf = (colour: Rgb): string =>
  `#${[colour.r, colour.g, colour.b].map(byte).join("")}`;

/** The tint one `<svg>` paints, and a colour no shape uses. */
export const SVG_TINT = rgb(0xff, 0x00, 0xff);

/**
 * A fill no chart would ship: the single-source chart writes it into every
 * shape and the probe asserts the frame never shows it, because GPUI paints an
 * `<svg>` as a tinted mask.
 */
export const SOURCE_FILL = rgb(0x12, 0x34, 0x56);

/** One layer's colour, named by the shape it draws. */
export const SURFACE_COLOURS = {
  bar: rgb(0x2e, 0xcc, 0x71),
  bubble: rgb(0x34, 0x98, 0xdb),
  line: rgb(0xe7, 0x4c, 0x3c),
  axis: rgb(0xf1, 0xc4, 0x0f),
  label: rgb(0xe6, 0x7e, 0x22),
} as const;

/** Every layer, in the order a chart stacks them. */
export const LAYER_SHAPES = [
  "bar",
  "bubble",
  "line",
  "axis",
  "label",
] as const;

/** One layer's shape. */
export type LayerShape = (typeof LAYER_SHAPES)[number];

/** The shape a layer draws, in the shared 280×100 view box. */
const SHAPES = {
  bar: `<rect x="4" y="40" width="36" height="56" fill="FILL"/>`,
  bubble: `<circle cx="72" cy="70" r="14" fill="FILL"/>`,
  line: `<path d="M100 80 L130 40 L160 62 L190 18" fill="none" stroke="FILL" stroke-width="4"/>`,
  axis: `<line x1="4" y1="96" x2="276" y2="96" stroke="FILL" stroke-width="2"/>`,
  label: `<text x="208" y="60" font-size="20" fill="FILL">42</text>`,
} as const satisfies Readonly<Record<LayerShape, string>>;

const SVG_OPEN =
  '<svg xmlns="http://www.w3.org/2000/svg" width="280" height="100" viewBox="0 0 280 100">';

/** One shape, in one colour: `FILL` is replaced by the caller's. */
const shapeSource = (shape: LayerShape, colour: Rgb): string =>
  `${SVG_OPEN}${SHAPES[shape].replaceAll("FILL", hexOf(colour))}</svg>`;

/**
 * The chart the probe mounts: one of each shape a bar, line or scatter chart
 * draws, every one filled with `SOURCE_FILL`. `source` is raw markup because a
 * generated chart has no file.
 */
export const CHART_SVG = `${SVG_OPEN}${Arr.join(
  Arr.map(LAYER_SHAPES, (shape) => shapeSource(shape, SOURCE_FILL)),
  "",
)}</svg>`;

/** One shape per layer, so a stacked chart can carry a colour per series. */
export const layerSvg = (shape: LayerShape): string =>
  shapeSource(shape, SURFACE_COLOURS[shape]);

/** The colour a layer's tint paints. */
export const layerColour = (shape: LayerShape): Rgb => SURFACE_COLOURS[shape];

/** The colour of the in-memory image; nothing else in the probe paints it. */
export const IMAGE_COLOUR = rgb(0x9b, 0x59, 0xb6);

/** The colour the in-memory pixel buffer paints; no other surface uses it. */
export const BUFFER_COLOUR = rgb(0x00, 0xff, 0x00);

/** The colour the transparent canvas lets its parent paint through. */
export const CANVAS_PARENT = rgb(0x16, 0xa0, 0x85);

/** The in-memory image's edge, in pixels. */
export const IMAGE_SIZE = 8;

/**
 * An 8×8 solid `IMAGE_COLOUR` PNG, 76 bytes.
 *
 * Generated with a one-off Node script that wrote the signature, IHDR, a
 * deflated all-zero-filter scanline per row and IEND; `content.test.ts` decodes
 * it and holds it to `IMAGE_COLOUR`, so the bytes cannot drift from the colour
 * the probe asserts.
 */
export const IMAGE_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAE0lEQVR4nGOYHbntPz7MMDIUAACeAapBVGHBIwAAAABJRU5ErkJggg==";

/**
 * `IMAGE_SIZE`² straight-RGBA pixels of `BUFFER_COLOUR`.
 *
 * This is the route an app takes for an image it already holds in memory (a
 * photo, a rendered frame): `ImgInstance.setImagePixels` takes bytes, not a
 * path. The buffer is built here so the byte order and the stride are asserted
 * by `content.test.ts` rather than trusted by the probe.
 */
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
