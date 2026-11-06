import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import { Pixels } from "@gpuixui/testing";
import {
  BUFFER_COLOUR,
  CANVAS_PARENT,
  CHART_SVG,
  hexOf,
  IMAGE_COLOUR,
  IMAGE_DATA_URL,
  IMAGE_SIZE,
  imagePixels,
  LAYER_SHAPES,
  layerColour,
  layerSvg,
  SOURCE_FILL,
  SVG_TINT,
  type Rgb,
} from "./content.js";

const payload = (url: string): Uint8Array =>
  Buffer.from(url.slice(url.indexOf(",") + 1), "base64");

const rgba = (colour: Rgb): Pixels.Rgba =>
  new Pixels.Rgba({ ...colour, a: 0xff });

const offsets = (): ReadonlyArray<number> =>
  Arr.map(Arr.range(0, IMAGE_SIZE * IMAGE_SIZE - 1), (index) => index * 4);

const isColour = (
  frame: Pixels.Pixels,
  at: number,
  colour: Pixels.Rgba,
): boolean =>
  frame.data[at] === colour.r &&
  frame.data[at + 1] === colour.g &&
  frame.data[at + 2] === colour.b &&
  frame.data[at + 3] === colour.a;

const PALETTE = [
  SVG_TINT,
  SOURCE_FILL,
  ...Arr.map(LAYER_SHAPES, layerColour),
  IMAGE_COLOUR,
  BUFFER_COLOUR,
  CANVAS_PARENT,
] as const;

describe("the content-surface fixtures", () => {
  it("pins every fixture colour to the hex the probe's evidence names", () => {
    expect(Arr.map(PALETTE, hexOf)).toEqual([
      "#ff00ff",
      "#123456",
      "#2ecc71",
      "#3498db",
      "#e74c3c",
      "#f1c40f",
      "#e67e22",
      "#9b59b6",
      "#00ff00",
      "#16a085",
    ]);
  });

  it("carries a PNG that decodes to the colour the probe asserts", () => {
    const frame = Pixels.decodePng(payload(IMAGE_DATA_URL), (bytes) =>
      inflateSync(bytes),
    );
    if (frame instanceof Pixels.PngDecodeError) {
      throw new Error(frame.message);
    }
    expect([frame.width, frame.height]).toEqual([IMAGE_SIZE, IMAGE_SIZE]);
    expect(hexOf(IMAGE_COLOUR)).toBe("#9b59b6");
    const colour = rgba(IMAGE_COLOUR);
    expect(offsets().filter((at) => !isColour(frame, at, colour))).toEqual([]);
  });

  it("builds the in-memory buffer as straight RGBA in the asserted colour", () => {
    const pixels = imagePixels();

    const rgbaBytes = [0x00, 0xff, 0x00, 0xff] as const;
    expect(pixels.length).toBe(IMAGE_SIZE * IMAGE_SIZE * 4);
    const wrong = offsets().filter((at) =>
      rgbaBytes.some((byte, channel) => pixels[at + channel] !== byte),
    );
    expect(wrong).toEqual([]);
  });

  it("writes every chart shape into the single-source markup", () => {
    const tags = Arr.map(
      ["rect", "circle", "path", "line", "text"],
      (tag) => `<${tag} `,
    );
    expect(tags.filter((tag) => !CHART_SVG.includes(tag))).toEqual([]);

    expect(CHART_SVG.split(hexOf(SOURCE_FILL)).length - 1).toBe(tags.length);
  });

  it("gives each layer one shape and one tint no other layer uses", () => {
    const tints: ReadonlySet<string> = new Set(
      Arr.map(LAYER_SHAPES, (shape) => hexOf(layerColour(shape))),
    );
    expect(tints.size).toBe(LAYER_SHAPES.length);
    expect(tints.has(hexOf(SVG_TINT))).toBe(false);
    expect(tints.has(hexOf(CANVAS_PARENT))).toBe(false);
    const misplaced = Arr.filter(LAYER_SHAPES, (shape) => {
      const source = layerSvg(shape);
      const others = Arr.filter(LAYER_SHAPES, (other) => other !== shape);
      return (
        !source.includes(hexOf(layerColour(shape))) ||
        Arr.some(others, (other) => source.includes(hexOf(layerColour(other))))
      );
    });
    expect(misplaced).toEqual([]);
  });
});
