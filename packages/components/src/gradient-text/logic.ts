import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import * as Str from "effect/String";

export interface HexColor {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
  readonly alpha: number;
}

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

const byteAt = (digits: string, index: number, width: number): number => {
  const start = index * width;
  const part = Str.slice(start, start + width)(digits);
  return Number.parseInt(width === 1 ? `${part}${part}` : part, 16);
};

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

const hexByte = (value: number): string =>
  Str.padStart(2, "0")(Math.round(value).toString(16));

const writeHex = (color: HexColor): string =>
  `#${hexByte(color.red)}${hexByte(color.green)}${hexByte(color.blue)}${
    color.alpha === 255 ? "" : hexByte(color.alpha)
  }`;

const clamped = (t: number): number =>
  Number.isFinite(t) ? Math.min(Math.max(t, 0), 1) : 0;

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

export interface GradientGlyph {
  readonly key: string;
  readonly text: string;
  readonly color: string;

  readonly position: number;

  readonly label: Option.Option<string>;
}

export interface GradientWord {
  readonly key: string;
  readonly label: string;
  readonly glyphs: ReadonlyArray<GradientGlyph>;
}

export interface GradientLine {
  readonly key: string;
  readonly words: ReadonlyArray<GradientWord>;
}

const wordGlyphs = (
  word: string,
  line: number,
  start: number,
  total: number,
  colorAt: (position: number) => string,
): ReadonlyArray<GradientGlyph> =>
  Arr.map(Arr.fromIterable(word), (text, local) => {
    const index = start + local;
    const position = total <= 1 ? 0 : index / (total - 1);
    return {
      key: `${line}:${index}:${text}`,
      text,
      color: colorAt(position),
      position,
      label: local === 0 ? Option.some(word) : Option.none(),
    };
  });

export const glyphLines = (
  text: string,
  colorAt: (position: number) => string,
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
              glyphs: wordGlyphs(word, index, start, total, colorAt),
            },
          ]);
          return Result.succeed({ key: String(index), words: placed[1] });
        },
      }),
  );

export const gradientLines = (
  text: string,
  from: string,
  to: string,
): ReadonlyArray<GradientLine> =>
  glyphLines(text, (position) => gradientColor(from, to, position));

export const glyphCount = (lines: ReadonlyArray<GradientLine>): number =>
  Arr.reduce(
    lines,
    0,
    (count, line) =>
      count +
      Arr.reduce(line.words, 0, (inLine, word) => inLine + word.glyphs.length),
  );
