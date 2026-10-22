/**
 * Ranked subsequence matching for the command palette.
 *
 * A query matches when its characters appear in order in the label, not
 * necessarily together: `opfl` matches "Open file". Matches are scored so word
 * starts beat runs inside a word, and a longer consecutive run beats a shorter
 * one. Ties break by declaration index, so equal labels never swap places.
 *
 * The type-ahead matcher in `typeahead.ts` is a different tool: it
 * cycles rows by prefix as the user types. This one filters and ranks a list
 * once per query.
 */

import { Order, pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";

/** One matching item, with its score and its declaration index. */
export interface FuzzyMatch<A> {
  readonly item: A;
  readonly score: number;
  /** Position in the input list; the stable tie-break. */
  readonly index: number;
}

const normalise = (value: string): string =>
  pipe(value, Str.trim, Str.toLowerCase);

const charAt = (text: string, index: number): string =>
  Option.getOrElse(pipe(text, Str.charAt(index)), () => "");

const WORD_CHARACTER = /[a-z0-9]/;

/** First character of a word: the start of the text, or after a separator. */
const isWordStart = (text: string, index: number): boolean =>
  index === 0 || !WORD_CHARACTER.test(charAt(text, index - 1));

/** Ten for the character, plus a word-start or run bonus. */
const stepScore = (text: string, index: number, streak: number): number =>
  10 + (isWordStart(text, index) ? 8 : streak * 2);

const walk = (
  query: string,
  text: string,
  queryIndex: number,
  textIndex: number,
  score: number,
  streak: number,
): Option.Option<number> => {
  if (queryIndex >= Str.length(query)) return Option.some(score);
  if (textIndex >= Str.length(text)) return Option.none();
  return charAt(text, textIndex) === charAt(query, queryIndex)
    ? walk(
        query,
        text,
        queryIndex + 1,
        textIndex + 1,
        score + stepScore(text, textIndex, streak),
        streak + 1,
      )
    : walk(query, text, queryIndex, textIndex + 1, score, 0);
};

/**
 * A case-insensitive subsequence score for `query` in `text`, or `None` when the
 * query is not a subsequence. An empty or whitespace-only query scores `0`.
 */
export const fuzzyScore = (
  query: string,
  text: string,
): Option.Option<number> => walk(normalise(query), normalise(text), 0, 0, 0, 0);

/** Every matching item, scored and carrying its declaration index. */
export const fuzzyMatches = <A>(
  items: ReadonlyArray<A>,
  query: string,
  textOf: (item: A) => string,
): ReadonlyArray<FuzzyMatch<A>> =>
  pipe(
    Arr.map(items, (item, index) =>
      Option.map(fuzzyScore(query, textOf(item)), (score) => ({
        item,
        score,
        index,
      })),
    ),
    Arr.getSomes,
  );

/** Score descending, then declaration order: a total, stable order. */
const rankOrder = <A>(): Order.Order<FuzzyMatch<A>> =>
  Order.combine(
    Order.mapInput(Order.Number, (match: FuzzyMatch<A>) => -match.score),
    Order.mapInput(Order.Number, (match: FuzzyMatch<A>) => match.index),
  );

/**
 * Order matches by group: groups follow their first appearance, and each
 * group's items sort by score then declaration order. Ungrouped items form one
 * group. A group with no match disappears.
 */
export const rankByGroup = <A>(
  matches: ReadonlyArray<FuzzyMatch<A>>,
  groupOf: (item: A) => string | undefined,
): ReadonlyArray<A> => {
  const groups = Arr.dedupe(Arr.map(matches, (match) => groupOf(match.item)));

  return Arr.flatMap(groups, (group) =>
    pipe(
      Arr.filter(matches, (match) => groupOf(match.item) === group),
      (inGroup) => Arr.sort(inGroup, rankOrder<A>()),
      Arr.map((match) => match.item),
    ),
  );
};
