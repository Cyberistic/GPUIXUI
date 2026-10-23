/**
 * The `find-highlight` probe's fixtures: the wash a window paints behind a
 * find's matches, read out of the captured frame.
 *
 * `@gpuixui/tokens` ships `findHighlight(theme)` — two translucent washes and a
 * corner — and a host handed no colour paints its own accent at 30% and 65%
 * instead (`packages/native/src/text/search.rs` at `@gpuix/native@0.11.0`). The
 * handover is a source read; what a window can prove is the composite a reader
 * sees, because a wash is a quad behind the glyphs and carries no text of its
 * own.
 *
 * A wash is translucent, so the colour that lands in the frame is the theme's
 * `primary` blended into the strip the block fills. A block with exactly one
 * match has exactly one wash colour, and the most-painted colour that is
 * neither the strip nor the ink is that wash: glyph cores and their antialiased
 * edges are excluded or far rarer, so a block that painted nothing cannot pass
 * as a wash.
 */
import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as MutableHashMap from "effect/MutableHashMap";
import { alphaOf, blend, findHighlight, type Theme } from "@gpuixui/tokens";
import { Pixels } from "@gpuixui/testing";

/** The query every block searches for. */
export const FIND_QUERY = "highlight";

/** The line every block paints; it holds the query exactly once. */
export const FIND_LINE = "a highlight here";

/** The three blocks and the caption, by test id. */
export const FIND_IDS = {
  caption: "findhl-caption",
  rest: "findhl-rest",
  active: "findhl-active",
  runtime: "findhl-runtime",
} as const;

/**
 * How far a painted byte may sit from the composite this probes expects.
 *
 * The runtime composites its translucent wash into the framebuffer, and the
 * round trip through premultiplied alpha can move a channel by a byte. The
 * runtime's own accent is a different hue, so this gap cannot hide it.
 */
export const FIND_TOLERANCE = 2;

/**
 * The fewest pixels one block's wash must cover.
 *
 * A single match is one word at the block's body size — hundreds of solid
 * pixels — while the antialiased band between the glyphs and the wash is a few
 * dozen. A block that painted only glyphs leaves nothing above this floor.
 */
export const FIND_INK_FLOOR = 120;

/**
 * The checks the probe asserts, so its documentation cannot drift.
 *
 * The capture scale is one; each of the three blocks reads its own wash, one
 * each. The state, the two one-state reads, the two cover reads, the three
 * control reads, the shared box and the three painted lines add fifteen, and
 * the composite the token contract names is the last.
 */
export const FIND_CHECKS = 19;

/** A logical box, as the runtime's layout report gives it. */
export interface WashBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** The capture pixels a logical box covers. */
export const pixelRegion = (box: WashBox, scale: number): Pixels.PixelRegion =>
  new Pixels.PixelRegion({
    x: Math.round(box.x * scale),
    y: Math.round(box.y * scale),
    width: Math.round(box.width * scale),
    height: Math.round(box.height * scale),
  });

/**
 * The colour a translucent wash paints over an opaque strip.
 *
 * `findHighlight` hands over a wash with its own alpha share, and the window
 * composites it onto whatever the block fills; this is that composite computed
 * from the same two colours, which is the value the frame must carry.
 */
export const paintedWash = (strip: string, wash: string): string =>
  blend(strip, wash, alphaOf(wash));

/** Whether a colour read out of the frame is the one a contract names. */
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

/** Whether a measured count is a wash rather than an antialiased edge. */
export const isWashPainted = (count: number): boolean => count > FIND_INK_FLOOR;

/** The most-painted colour in a block that is neither its strip nor its ink. */
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

/**
 * The wash a block painted: its most frequent colour that is neither the fill
 * it sits on nor the ink of its glyphs.
 *
 * `None` when the box lies outside the capture or a colour cannot be parsed —
 * a crop that was never read is not evidence that a wash is absent — and
 * `Some` with a small count when the block painted only edges, which
 * {@link isWashPainted} then refuses.
 */
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

/** The theme's find wash, as the three blocks are mounted. */
export interface FindWashes {
  readonly rest: string;
  readonly active: string;
}

/** The two composites the themed blocks paint, from the theme's own pair. */
export const themedWashes = (theme: Theme): FindWashes => {
  const highlight = findHighlight(theme);
  const strip = theme.colors.card;
  return {
    rest: paintedWash(strip, highlight.color),
    active: paintedWash(strip, highlight.activeColor),
  };
};
