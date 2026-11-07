import { Order, pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import * as Str from "effect/String";

export interface FuzzyMatch<A> {
  readonly item: A;
  readonly score: number;

  readonly index: number;
}

const normalise = (value: string): string =>
  pipe(value, Str.trim, Str.toLowerCase);

const charAt = (text: string, index: number): string =>
  Option.getOrElse(pipe(text, Str.charAt(index)), () => "");

const WORD_CHARACTER = /[a-z0-9]/;

const isWordStart = (text: string, index: number): boolean =>
  index === 0 || !WORD_CHARACTER.test(charAt(text, index - 1));

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

export const fuzzyScore = (
  query: string,
  text: string,
): Option.Option<number> => walk(normalise(query), normalise(text), 0, 0, 0, 0);

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

const rankOrder = <A>(): Order.Order<FuzzyMatch<A>> =>
  Order.combine(
    Order.mapInput(Order.Number, (match: FuzzyMatch<A>) => -match.score),
    Order.mapInput(Order.Number, (match: FuzzyMatch<A>) => match.index),
  );

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

export const commandListOf = <A>(
  value: ReadonlyArray<A> | null | undefined,
): ReadonlyArray<A> => (Arr.isArray(value) ? value : []);

export const recentIdsOf = (value: unknown): ReadonlyArray<string> =>
  Arr.isArray(value) ? Arr.filter(value, P.isString) : [];
