/**
 * The ramp a gradient text paints, without a renderer.
 *
 * `@gpuix/native@0.11.0` has no text fill: a `<text>` host paints one `color`,
 * and a `linear-gradient` is a box background, not a glyph fill. So the ramp is
 * **sampled per glyph** — every code point is its own text host, and its colour
 * is the ramp at that code point's position in the line. The blend is discrete
 * at glyph resolution rather than continuous, which is the honest form the
 * runtime can paint.
 *
 * This module owns the arithmetic the component would otherwise repeat: which
 * code points become glyphs, where each sits in its line, and the colour at
 * each position. It also owns the two boundaries: a line of one glyph paints
 * the start colour instead of dividing by zero, and an end that is not a hex
 * colour paints the whole run in the start colour rather than a hole.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import * as Str from "effect/String";

/** One hex colour read into channels, with alpha as `0…255`. */
export interface HexColor {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
  readonly alpha: number;
}

/** `#rgb`, `#rgba`, `#rrggbb` and `#rrggbbaa`; the runtime's palette is hex. */
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** The `index`th byte of a hex run: a one-digit nibble is doubled, a pair is read whole. */
const byteAt = (digits: string, index: number, width: number): number => {
  const start = index * width;
  const part = Str.slice(start, start + width)(digits);
  return Number.parseInt(width === 1 ? `${part}${part}` : part, 16);
};

/** Read one hex colour; `None` when the value is not a hex colour. */
export const parseHexColor = (value: string): Option.Option<HexColor> =>
  Option.flatMap(Option.fromNullishOr(HEX.exec(value)), (match) => {
    const digits = Str.toLowerCase(match[1] ?? "");
    const width = digits.length <= 4 ? 1 : 2;
    return Option.some({
      red: byteAt(digits, 0, width),
      green: byteAt(digits, 1, width),
      blue: byteAt(digits, 2, width),
      alpha:
        digits.length === 4 || digits.length === 8
          ? byteAt(digits, 3, width)
          : 255,
    });
  });

/** A channel as a two-digit lowercase hex pair. */
const hexByte = (value: number): string =>
  Str.padStart(2, "0")(Math.round(value).toString(16));

/** A sampled colour, `#rrggbb` unless the alpha is below opaque. */
const writeHex = (color: HexColor): string =>
  `#${hexByte(color.red)}${hexByte(color.green)}${hexByte(color.blue)}${
    color.alpha === 255 ? "" : hexByte(color.alpha)
  }`;

/** `t` held to the unit interval; a non-finite value is the start of the ramp. */
const clamped = (t: number): number =>
  Number.isFinite(t) ? Math.min(Math.max(t, 0), 1) : 0;

/**
 * The colour a ramp paints at `t`, from `start` at `0` to `end` at `1`.
 *
 * Both ends must be hex colours. An end that is not one paints the whole run in
 * `start` — the runtime accepts a named colour, but there is no way to
 * interpolate one — rather than emitting a colour the caller never asked for.
 */
export const gradientColor = (start: string, end: string, t: number): string =>
  Option.match(Option.all([parseHexColor(start), parseHexColor(end)]), {
    onNone: () => start,
    onSome: ([from, to]) => {
      const at = clamped(t);
      return writeHex({
        red: from.red + (to.red - from.red) * at,
        green: from.green + (to.green - from.green) * at,
        blue: from.blue + (to.blue - from.blue) * at,
        alpha: from.alpha + (to.alpha - from.alpha) * at,
      });
    },
  });

/** One painted glyph: a code point and the colour the ramp gives it. */
export interface GradientGlyph {
  /** Stable while the glyph at this position keeps its text. */
  readonly key: string;
  readonly text: string;
  readonly color: string;
  /** The word this glyph belongs to, on the first glyph only. */
  readonly label: Option.Option<string>;
}

/** One word: a run of glyphs that never breaks across a line. */
export interface GradientWord {
  readonly key: string;
  readonly label: string;
  readonly glyphs: ReadonlyArray<GradientGlyph>;
}

/** One line: words that wrap between each other, never inside one. */
export interface GradientLine {
  readonly key: string;
  readonly words: ReadonlyArray<GradientWord>;
}

/** The glyphs of one word, coloured by their place in the line. */
const wordGlyphs = (
  word: string,
  line: number,
  start: number,
  total: number,
  from: string,
  to: string,
): ReadonlyArray<GradientGlyph> =>
  Arr.map(Arr.fromIterable(word), (text, local) => {
    const index = start + local;
    const t = total <= 1 ? 0 : index / (total - 1);
    return {
      key: `${line}:${index}:${text}`,
      text,
      color: gradientColor(from, to, t),
      label: local === 0 ? Option.some(word) : Option.none(),
    };
  });

/**
 * The lines, words and glyphs of `text`.
 *
 * An explicit newline starts a new row, every run of whitespace is one word gap,
 * a blank line contributes no row, and the ramp restarts at each line — a
 * two-line headline reads as two complete ramps rather than one ramp split at
 * the break.
 */
export const gradientLines = (
  text: string,
  from: string,
  to: string,
): ReadonlyArray<GradientLine> =>
  Arr.filterMap(
    Arr.map(Str.split(text, "\n"), (line, index) => ({
      index,
      words: Arr.filter(Str.split(line, /\s+/), Str.isNonEmpty),
    })),
    ({ index, words }) =>
      Arr.match(words, {
        onEmpty: () => Result.failVoid,
        onNonEmpty: (present) => {
          const total = Arr.reduce(
            present,
            0,
            (count, word) => count + Arr.length(Arr.fromIterable(word)),
          );
          const placed = Arr.mapAccum(present, 0, (start, word) => [
            start + Arr.length(Arr.fromIterable(word)),
            {
              key: `${index}:${start}:${word}`,
              label: word,
              glyphs: wordGlyphs(word, index, start, total, from, to),
            },
          ]);
          return Result.succeed({ key: String(index), words: placed[1] });
        },
      }),
  );

/** How many glyphs a layout paints, for a state a caller can read. */
export const glyphCount = (lines: ReadonlyArray<GradientLine>): number =>
  Arr.reduce(
    lines,
    0,
    (count, line) =>
      count +
      Arr.reduce(line.words, 0, (inLine, word) => inLine + word.glyphs.length),
  );
