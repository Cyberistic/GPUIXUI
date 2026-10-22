/**
 * Holds the `syntax-palette` fixtures to the palette the probe asserts.
 *
 * The probe counts exact colours out of a captured frame, so a fixture that
 * drifted from the shipped palette — or a reader that counted the wrong crop —
 * would turn a real regression into a silent pass. The frame tests draw the
 * pixels the probe counts, and the palette tests read `syntaxColors` itself.
 */
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { Pixels } from "@gpuixui/testing";
import { darkTheme, lightTheme, syntaxColors } from "@gpuixui/tokens";
import { differs } from "./frame.js";
import {
  COLOUR_GAP,
  countInk,
  countInkOn,
  DARK_KEYWORD,
  LIGHT_KEYWORD,
  isPainted,
  RUNTIME_KEYWORD,
  RUNTIME_KEYWORD_TOLERANCE,
  SYNTAX_INK_FLOOR,
  SYNTAX_LANGUAGE,
  SYNTAX_SOURCE,
  SYNTAX_TOKEN,
} from "./syntax-palette.js";

/** An opaque colour, as the RGBA a capture stores. */
const rgba = (r: number, g: number, b: number): Pixels.Rgba =>
  new Pixels.Rgba({ r, g, b, a: 0xff });

/** The page fill every sample sits on. */
const PAGE = rgba(0x0b, 0x0d, 0x11);

/** The dark palette's keyword, as bytes a frame holds. */
const KEYWORD = rgba(0xa7, 0xa9, 0xff);

/** A frame filled with `fill`, with `marks` painted at their own coordinates. */
const frameOf = (
  width: number,
  height: number,
  fill: Pixels.Rgba,
  marks: ReadonlyArray<readonly [number, number, Pixels.Rgba]>,
): Pixels.Pixels => {
  const data = new Uint8Array(width * height * 4);
  Arr.forEach(Arr.range(0, width * height - 1), (pixel) => {
    data[pixel * 4] = fill.r;
    data[pixel * 4 + 1] = fill.g;
    data[pixel * 4 + 2] = fill.b;
    data[pixel * 4 + 3] = fill.a;
  });
  Arr.forEach(marks, ([x, y, colour]) => {
    const at = (y * width + x) * 4;
    data[at] = colour.r;
    data[at + 1] = colour.g;
    data[at + 2] = colour.b;
    data[at + 3] = colour.a;
  });
  return new Pixels.Pixels({ width, height, data });
};

/** The 4×3 frame the reader cases share: two keyword pixels on a page fill. */
const sample = (): Pixels.Pixels =>
  frameOf(4, 3, PAGE, [
    [1, 1, KEYWORD],
    [2, 1, KEYWORD],
  ]);

const BOX = { x: 0, y: 0, width: 4, height: 3 } as const;

describe("the syntax-palette reader", () => {
  it("counts an exact run inside the box it is asked for", () => {
    expect(countInk(sample(), BOX, 1, DARK_KEYWORD)).toEqual(Option.some(2));
  });

  it("reads a crop at the capture's device scale", () => {
    const doubled = frameOf(8, 6, PAGE, [
      [2, 2, KEYWORD],
      [3, 2, KEYWORD],
      [4, 2, KEYWORD],
      [5, 2, KEYWORD],
    ]);
    // Two logical pixels at (1, 1) cover the four device pixels at (2–3, 2–3).
    expect(
      countInk(doubled, { x: 1, y: 1, width: 2, height: 1 }, 2, DARK_KEYWORD),
    ).toEqual(Option.some(4));
  });

  it("counts a near colour only inside the tolerance it is given", () => {
    const near = frameOf(4, 3, PAGE, [[1, 1, rgba(0xac, 0xae, 0xff)]]);
    expect(countInk(near, BOX, 1, DARK_KEYWORD)).toEqual(Option.some(0));
    expect(countInk(near, BOX, 1, DARK_KEYWORD, COLOUR_GAP)).toEqual(
      Option.some(1),
    );
  });

  it("counts the ink that is not the block's fill", () => {
    expect(countInkOn(sample(), BOX, 1, "#0B0D11")).toEqual(Option.some(2));
  });

  it("reports an unread region rather than zero", () => {
    // A box the capture does not cover would make "this ink is absent" a lie.
    expect(countInk(sample(), { ...BOX, x: 40 }, 1, DARK_KEYWORD)).toEqual(
      Option.none(),
    );
    expect(countInk(sample(), BOX, 1, "not a colour")).toEqual(Option.none());
  });

  it("needs more than a stray pixel to call a run painted", () => {
    expect(isPainted(SYNTAX_INK_FLOOR)).toBe(false);
    expect(isPainted(SYNTAX_INK_FLOOR + 1)).toBe(true);
    expect(isPainted(0)).toBe(false);
  });
});

describe("the syntax-palette fixtures", () => {
  it("names the keyword each shipped palette paints", () => {
    expect(Option.fromNullishOr(Pixels.hexToRgba(LIGHT_KEYWORD))).toEqual(
      Option.fromNullishOr(Pixels.hexToRgba(syntaxColors(lightTheme).keyword)),
    );
    expect(Option.fromNullishOr(Pixels.hexToRgba(DARK_KEYWORD))).toEqual(
      Option.fromNullishOr(Pixels.hexToRgba(syntaxColors(darkTheme).keyword)),
    );
  });

  it("keeps the runtime's default keyword apart from both shipped inks", () => {
    // The negative control counts this ink in the unthemed block. If it were a
    // shipped colour, the same block would satisfy both sides of the probe.
    const runtime = Option.fromNullishOr(Pixels.hexToRgba(RUNTIME_KEYWORD));
    const light = Option.fromNullishOr(Pixels.hexToRgba(LIGHT_KEYWORD));
    const dark = Option.fromNullishOr(Pixels.hexToRgba(DARK_KEYWORD));
    expect(
      Option.all([runtime, light, dark]).pipe(
        Option.match({
          onNone: () => true,
          onSome: ([defaultInk, lightInk, darkInk]) =>
            differs(defaultInk, lightInk, RUNTIME_KEYWORD_TOLERANCE) &&
            differs(defaultInk, darkInk, RUNTIME_KEYWORD_TOLERANCE),
        }),
      ),
    ).toBe(true);
  });

  it("paints its token on every line, in the language it asks for", () => {
    expect(SYNTAX_LANGUAGE).toBe("ts");
    const lines = Str.split(SYNTAX_SOURCE, "\n");
    expect(
      Arr.every(lines, (line) => line.startsWith(`${SYNTAX_TOKEN} `)),
    ).toBe(true);
    expect(Arr.length(lines)).toBe(4);
  });
});
