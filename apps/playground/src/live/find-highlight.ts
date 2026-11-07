import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as MutableHashMap from "effect/MutableHashMap";
import { alphaOf, blend, findHighlight, type Theme } from "@gpuixui/tokens";
import { Pixels } from "@gpuixui/testing";

export const FIND_QUERY = "highlight";

export const FIND_LINE = "a highlight here";

export const FIND_IDS = {
  caption: "findhl-caption",
  rest: "findhl-rest",
  active: "findhl-active",
  runtime: "findhl-runtime",
} as const;

export const FIND_TOLERANCE = 2;

export const FIND_INK_FLOOR = 120;

export const FIND_CHECKS = 19;

export interface WashBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export const pixelRegion = (box: WashBox, scale: number): Pixels.PixelRegion =>
  new Pixels.PixelRegion({
    x: Math.round(box.x * scale),
    y: Math.round(box.y * scale),
    width: Math.round(box.width * scale),
    height: Math.round(box.height * scale),
  });

export const paintedWash = (strip: string, wash: string): string =>
  blend(strip, wash, alphaOf(wash));

export const nearColour = (
  colour: string,
  expected: string,
  tolerance = FIND_TOLERANCE,
): boolean =>
  Option.match(
    Option.all([
      Option.fromNullishOr(Pixels.hexToRgba(colour)),
      Option.fromNullishOr(Pixels.hexToRgba(expected)),
    ]),
    {
      onNone: () => false,
      onSome: ([measured, wanted]) =>
        Math.abs(measured.r - wanted.r) <= tolerance &&
        Math.abs(measured.g - wanted.g) <= tolerance &&
        Math.abs(measured.b - wanted.b) <= tolerance,
    },
  );

export const isWashPainted = (count: number): boolean => count > FIND_INK_FLOOR;

export interface WashRead {
  readonly hex: string;
  readonly count: number;
}

const channelsNear = (
  red: number,
  green: number,
  blue: number,
  colour: Pixels.Rgba,
  tolerance: number,
): boolean =>
  Math.abs(red - colour.r) <= tolerance &&
  Math.abs(green - colour.g) <= tolerance &&
  Math.abs(blue - colour.b) <= tolerance;

const hexOf = (red: number, green: number, blue: number): string =>
  `#${[red, green, blue]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase();

export const dominantWash = (
  frame: Pixels.Pixels,
  box: WashBox,
  scale: number,
  strip: string,
  ink: string,
  tolerance = FIND_TOLERANCE,
): Option.Option<WashRead> =>
  pipe(
    Option.all([
      Option.fromNullishOr(Pixels.crop(frame, pixelRegion(box, scale))),
      Option.fromNullishOr(Pixels.hexToRgba(strip)),
      Option.fromNullishOr(Pixels.hexToRgba(ink)),
    ]),
    Option.flatMap(([region, surface, glyph]) => {
      const counts = Arr.reduce(
        Arr.range(0, region.data.length / 4 - 1),
        MutableHashMap.empty<string, number>(),
        (held, pixel) => {
          const at = pixel * 4;
          const red = region.data[at] ?? 0;
          const green = region.data[at + 1] ?? 0;
          const blue = region.data[at + 2] ?? 0;
          if (
            channelsNear(red, green, blue, surface, tolerance) ||
            channelsNear(red, green, blue, glyph, tolerance)
          ) {
            return held;
          }
          const key = hexOf(red, green, blue);
          MutableHashMap.set(
            held,
            key,
            Option.getOrElse(MutableHashMap.get(held, key), () => 0) + 1,
          );
          return held;
        },
      );
      return Arr.reduce(
        Arr.fromIterable(counts),
        Option.none<WashRead>(),
        (best, [hex, count]) =>
          Option.match(best, {
            onNone: () => Option.some({ hex, count }),
            onSome: (held) =>
              Option.some(count > held.count ? { hex, count } : held),
          }),
      );
    }),
  );

export interface FindWashes {
  readonly rest: string;
  readonly active: string;
}

export const themedWashes = (theme: Theme): FindWashes => {
  const highlight = findHighlight(theme);
  const strip = theme.colors.card;
  return {
    rest: paintedWash(strip, highlight.color),
    active: paintedWash(strip, highlight.activeColor),
  };
};
