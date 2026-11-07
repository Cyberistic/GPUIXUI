import { pipe } from "effect";
import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";

export const RTL_FONT_SIZE = 32;

export const RTL_EDGE = 10;

export const RTL_SAMPLES = {
  latin: "nnT",
  hebrew: "ייT",
  hebrewLtr: "aייT",
  arabicJoined: "سلام",
  arabicSeparated: "س\u200Cل\u200Cا\u200Cم",
} as const;

export const RTL_IDS = {
  caption: "rtl-caption",
  latin: "rtl-latin",
  hebrew: "rtl-hebrew",
  hebrewLtr: "rtl-hebrew-ltr",
  arabicJoined: "rtl-arabic-joined",
  arabicSeparated: "rtl-arabic-separated",
} as const;

export type CrossbarSide = "left" | "right" | "unresolved";

export type RunDirection = "rtl" | "ltr" | "unresolved";

export const RTL_TOP_ROWS = 3;

export const RTL_CROSSBAR_FLOOR = 2;

export interface EndInk {
  readonly left: number;

  readonly right: number;

  readonly width: number;
}

export const crossbarSide = (ink: EndInk): CrossbarSide =>
  ink.left === 0 && ink.right === 0
    ? "unresolved"
    : ink.left * RTL_CROSSBAR_FLOOR <= ink.right
      ? "right"
      : ink.right * RTL_CROSSBAR_FLOOR <= ink.left
        ? "left"
        : "unresolved";

export const directionOf = (ink: EndInk): RunDirection =>
  crossbarSide(ink) === "left"
    ? "rtl"
    : crossbarSide(ink) === "right"
      ? "ltr"
      : "unresolved";

export interface ShapingRead {
  readonly joined: number;
  readonly separated: number;

  readonly delta: number;
}

export const shapingOf = (joined: number, separated: number): ShapingRead => ({
  joined,
  separated,
  delta: separated - joined,
});

export const shaped = (read: ShapingRead): boolean =>
  Math.abs(read.delta) >= 0.5;

const regionOf = (
  box: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  },
  scale: number,
): Pixels.PixelRegion =>
  new Pixels.PixelRegion({
    x: Math.round(box.x * scale),
    y: Math.round(box.y * scale),
    width: Math.round(box.width * scale),
    height: Math.round(box.height * scale),
  });

export const readEndInk = (
  frame: Pixels.Pixels,
  region: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  },
  scale: number,
  hex: string,
  edge = RTL_EDGE,
): Option.Option<EndInk> =>
  pipe(
    Option.all([
      Option.fromNullishOr(Pixels.crop(frame, regionOf(region, scale))),
      Option.fromNullishOr(Pixels.hexToRgba(hex)),
    ]),
    Option.flatMap(([crop, ink]) => {
      const inked = Option.fromNullishOr(Pixels.boundsOfColour(crop, ink));
      return Option.map(inked, (bounds) => {
        const width = Math.max(
          1,
          Math.min(Math.round(edge * scale), bounds.width),
        );
        const rows = Math.min(bounds.height, RTL_TOP_ROWS * scale);
        const band = (from: number) =>
          pipe(
            Option.fromNullishOr(
              Pixels.crop(
                crop,
                new Pixels.PixelRegion({
                  x: from,
                  y: bounds.y,
                  width,
                  height: rows,
                }),
              ),
            ),
            Option.map((part) => Pixels.countColour(part, ink)),
            Option.getOrElse(() => 0),
          );
        return {
          left: band(bounds.x),
          right: band(bounds.x + bounds.width - width),
          width: bounds.width / scale,
        };
      });
    }),
  );
