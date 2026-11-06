import * as Arr from "effect/Array";
import * as Option from "effect/Option";

export interface MatchRange {
  readonly start: number;
  readonly end: number;
}

export interface FindOptions {
  readonly caseSensitive?: boolean;

  readonly wholeWord?: boolean;
}

const WordCharacter = /[\p{L}\p{N}_]/u;

const isWordCharacter = (character: string | undefined): boolean =>
  character !== undefined && WordCharacter.test(character);

const isWholeWord = (text: string, range: MatchRange): boolean =>
  !isWordCharacter(text[range.start - 1]) && !isWordCharacter(text[range.end]);

const escapePattern = (query: string): string =>
  query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const findRanges = (
  text: string,
  query: string,
  options: FindOptions = {},
): ReadonlyArray<MatchRange> => {
  if (query.length === 0) return [];
  const candidates = occurrences(text, query, options.caseSensitive !== false);
  const accepted =
    options.wholeWord === true
      ? Arr.filter(candidates, (range) => isWholeWord(text, range))
      : candidates;
  return nonOverlapping(accepted);
};

const occurrences = (
  text: string,
  query: string,
  caseSensitive: boolean,
): ReadonlyArray<MatchRange> =>
  caseSensitive ? findExact(text, query) : findCaseInsensitive(text, query);

const findExact = (text: string, query: string): ReadonlyArray<MatchRange> =>
  Arr.unfold(
    0,
    (from: number): Option.Option<readonly [MatchRange, number]> => {
      const index = text.indexOf(query, from);
      return index === -1
        ? Option.none()
        : Option.some([
            { start: index, end: index + query.length },
            index + 1,
          ] as const);
    },
  );

const findCaseInsensitive = (
  text: string,
  query: string,
): ReadonlyArray<MatchRange> => {
  const pattern = new RegExp(escapePattern(query), "gi");
  return Arr.unfold(
    0,
    (from: number): Option.Option<readonly [MatchRange, number]> => {
      pattern.lastIndex = from;
      const found = pattern.exec(text);
      return found === null
        ? Option.none()
        : Option.some([
            { start: found.index, end: found.index + found[0].length },
            found.index + 1,
          ] as const);
    },
  );
};

const nonOverlapping = (
  ranges: ReadonlyArray<MatchRange>,
): ReadonlyArray<MatchRange> => {
  const [, kept] = Arr.mapAccum(
    ranges,
    -1,
    (end, range): readonly [number, Option.Option<MatchRange>] =>
      range.start >= end
        ? [range.end, Option.some(range)]
        : [end, Option.none()],
  );
  return Arr.getSomes(kept);
};

export const matchReadout = (
  query: string,
  active: number,
  count: number,
): string =>
  query.length === 0
    ? ""
    : count === 0
      ? "No matches"
      : `${active + 1} / ${count}`;

export const replaceAll = (
  text: string,
  query: string,
  replacement: string,
  options: FindOptions = {},
): string => {
  const ranges = findRanges(text, query, options);
  return Arr.length(ranges) === 0
    ? text
    : Arr.reduce(
        Arr.reverse(ranges),
        text,
        (result, range) =>
          result.slice(0, range.start) + replacement + result.slice(range.end),
      );
};
