import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Result from "effect/Result";

export type Range = readonly [number, number];

export interface MatchOptions {
  readonly caseSensitive?: boolean;

  readonly wholeWord?: boolean;
}

const WORD_CHARACTER = /[\p{L}\p{N}\p{M}_]/u;

const escape = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const codePoints = (
  text: string,
  start: number,
  end: number,
): ReadonlyArray<string> => Arr.fromIterable(text.slice(start, end));

const spanOf = (text: string, range: Range): number =>
  Arr.length(codePoints(text, range[0], range[1]));

const readRange = (text: string, range: Range): Result.Result<Range, void> => {
  const [start, end] = range;
  if (!Number.isFinite(start) || !Number.isFinite(end)) return Result.failVoid;
  const first = Math.min(Math.max(Math.trunc(start), 0), text.length);
  const last = Math.min(Math.max(Math.trunc(end), 0), text.length);
  return last > first
    ? Result.succeed([first, last] as const)
    : Result.failVoid;
};

const paintableRanges = (
  text: string,
  ranges: ReadonlyArray<Range>,
): ReadonlyArray<Range> =>
  Arr.filterMap(ranges, (range) => readRange(text, range));

const isWordCode = (code: number | undefined): boolean =>
  Option.match(Option.fromNullishOr(code), {
    onNone: () => false,
    onSome: (value) => WORD_CHARACTER.test(String.fromCodePoint(value)),
  });

const wordBefore = (text: string, index: number): boolean => {
  if (index <= 0) return false;
  const low = text.codePointAt(index - 1);
  const start =
    low !== undefined && low >= 0xdc00 && low <= 0xdfff ? index - 2 : index - 1;
  return isWordCode(text.codePointAt(start));
};

const wordAfter = (text: string, index: number): boolean =>
  index < text.length && isWordCode(text.codePointAt(index));

export const matchRanges = (
  text: string,
  query: string,
  options: MatchOptions = {},
): ReadonlyArray<Range> => {
  if (query.length === 0) return [];
  const pattern = new RegExp(escape(query), options.caseSensitive ? "g" : "gi");

  return Arr.filterMap(Arr.fromIterable(text.matchAll(pattern)), (match) => {
    const start = match.index;
    const end = start + (match[0] ?? "").length;
    const whole =
      !options.wholeWord || (!wordBefore(text, start) && !wordAfter(text, end));
    return whole ? Result.succeed([start, end] as const) : Result.failVoid;
  });
};

export const marksFor = (
  text: string,
  input: {
    readonly query?: string | undefined;
    readonly ranges?: ReadonlyArray<Range> | undefined;
    readonly caseSensitive?: boolean | undefined;
    readonly wholeWord?: boolean | undefined;
  },
): ReadonlyArray<Range> =>
  Option.match(Option.fromNullishOr(input.ranges), {
    onSome: (ranges) => paintableRanges(text, ranges),
    onNone: () =>
      Option.match(Option.fromNullishOr(input.query), {
        onNone: () => [],
        onSome: (query) =>
          matchRanges(text, query, {
            caseSensitive: input.caseSensitive,
            wholeWord: input.wholeWord,
          }),
      }),
  });

interface Sweep {
  readonly budget: number;
  readonly ranges: ReadonlyArray<Range>;
}

export const sweptRanges = (
  text: string,
  ranges: ReadonlyArray<Range>,
  step: number,
): ReadonlyArray<Range> => {
  const start: Sweep = { budget: Math.max(0, Math.floor(step)), ranges: [] };
  const sweep = Arr.reduce(
    paintableRanges(text, ranges),
    start,
    (state, range) => {
      if (state.budget <= 0) return state;
      const points = codePoints(text, range[0], range[1]);
      const visible = Arr.take(points, state.budget);
      const width = Arr.reduce(visible, 0, (sum, point) => sum + point.length);
      return {
        budget: state.budget - visible.length,
        ranges: [...state.ranges, [range[0], range[0] + width] as const],
      };
    },
  );

  return sweep.ranges;
};

export const sweepLength = (
  text: string,
  ranges: ReadonlyArray<Range>,
): number =>
  Arr.reduce(
    paintableRanges(text, ranges),
    0,
    (total, range) => total + spanOf(text, range),
  );

const STEP_MS = 60;

export const stepOf = (value: Option.Option<number>): number =>
  Option.getOrElse(
    Option.filter(value, (ms) => Number.isFinite(ms) && ms >= 0),
    () => STEP_MS,
  );

export const hostRanges = (
  ranges: ReadonlyArray<Range>,
): Array<[number, number]> =>
  Arr.map(ranges, (range): [number, number] => [range[0], range[1]]);
