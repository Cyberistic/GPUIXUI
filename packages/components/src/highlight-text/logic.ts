/**
 * HighlightText's rules: which ranges a phrase marks, and how far the wash has
 * swept at one step.
 *
 * The runtime paints a highlight from `[start, end)` pairs in UTF-16 code units
 * against the declaring subtree's text, so the ranges are the component's
 * contract. A sweep grows one mark at a time rather than one quad per character:
 * the wash is translucent, and abutting quads would show their seams where the
 * kerning overlaps them.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Result from "effect/Result";

/** One `[start, end)` pair in UTF-16 code units. */
export type Range = readonly [number, number];

/** How to find the marks when the caller does not supply ranges. */
export interface MatchOptions {
  /** Default `false`. */
  readonly caseSensitive?: boolean;
  /** Only match when neither neighbour is a letter, a number, a mark or `_`. Default `false`. */
  readonly wholeWord?: boolean;
}

/** A character the whole-word rule refuses as a neighbour. */
const WORD_CHARACTER = /[\p{L}\p{N}\p{M}_]/u;

/** A literal `query` as a regular expression, so every character is itself. */
const escape = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The code points of `text.slice(start, end)`, so an emoji counts once. */
const codePoints = (
  text: string,
  start: number,
  end: number,
): ReadonlyArray<string> => Arr.fromIterable(text.slice(start, end));

/** The code points a range spans. */
const spanOf = (text: string, range: Range): number =>
  Arr.length(codePoints(text, range[0], range[1]));

/** Whether a code unit begins a character the whole-word rule refuses as a neighbour. */
const isWordCode = (code: number | undefined): boolean =>
  Option.match(Option.fromNullishOr(code), {
    onNone: () => false,
    onSome: (value) => WORD_CHARACTER.test(String.fromCodePoint(value)),
  });

/** Whether the character before `index` is part of a word. */
const wordBefore = (text: string, index: number): boolean => {
  if (index <= 0) return false;
  const low = text.codePointAt(index - 1);
  const start =
    low !== undefined && low >= 0xdc00 && low <= 0xdfff ? index - 2 : index - 1;
  return isWordCode(text.codePointAt(start));
};

/** Whether the character at `index` is part of a word. */
const wordAfter = (text: string, index: number): boolean =>
  index < text.length && isWordCode(text.codePointAt(index));

/**
 * Every non-overlapping match of `query` in `text`, in document order.
 *
 * The runtime finds ranges from a `query` with `indexOf` semantics; a literal
 * pattern with the `g` flag is the same rule expressed in one pass, and the
 * `i` flag does the case folding. A locale whose case mapping changes the string
 * length needs the caller's own `ranges`. An empty query marks nothing.
 */
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

/** The marks `text` carries: the caller's ranges, else the query's matches. */
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
    onSome: (ranges) => ranges,
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

/** A step of the sweep, and the code points it still has to spend. */
interface Sweep {
  readonly budget: number;
  readonly ranges: ReadonlyArray<Range>;
}

/**
 * The ranges painted after `step` code points of the sweep.
 *
 * A step is one code point: the first mark grows from its start and the ones
 * behind it stay whole, so the wash reads as a pen crossing the phrase. `step`
 * at or past the total returns every range.
 */
export const sweptRanges = (
  text: string,
  ranges: ReadonlyArray<Range>,
  step: number,
): ReadonlyArray<Range> => {
  const start: Sweep = { budget: Math.max(0, Math.floor(step)), ranges: [] };
  const sweep = Arr.reduce(ranges, start, (state, range) => {
    if (state.budget <= 0) return state;
    const points = codePoints(text, range[0], range[1]);
    const visible = Arr.take(points, state.budget);
    const width = Arr.reduce(visible, 0, (sum, point) => sum + point.length);
    return {
      budget: state.budget - visible.length,
      ranges: [...state.ranges, [range[0], range[0] + width] as const],
    };
  });

  return sweep.ranges;
};

/** How many code points every mark spans together. */
export const sweepLength = (
  text: string,
  ranges: ReadonlyArray<Range>,
): number =>
  Arr.reduce(ranges, 0, (total, range) => total + spanOf(text, range));

/** The house pace of a sweep, in milliseconds per code point. */
const STEP_MS = 60;

/** A usable pace, or the house one; `0` is kept as "paint the whole wash". */
export const stepOf = (value: Option.Option<number>): number =>
  Option.getOrElse(
    Option.filter(value, (ms) => Number.isFinite(ms) && ms >= 0),
    () => STEP_MS,
  );

/**
 * The ranges in the mutable shape the runtime's `highlight` reads.
 *
 * `Range` is read-only because a caller's array is not ours to mutate; the host
 * prop is the boundary, and this is the one copy across it.
 */
export const hostRanges = (
  ranges: ReadonlyArray<Range>,
): Array<[number, number]> =>
  Arr.map(ranges, (range): [number, number] => [range[0], range[1]]);
