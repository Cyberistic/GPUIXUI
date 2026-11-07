import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";

export const phrasesOf = (value: unknown): ReadonlyArray<string> =>
  Arr.isArray(value) ? Arr.filter(value, P.isString) : [];

const lengthOf = (count: number): number =>
  Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 0;

export const nextIndex = (index: number, count: number): number => {
  const size = lengthOf(count);
  if (size === 0) return 0;
  const current = Number.isFinite(index) ? Math.trunc(index) : 0;
  return (((current + 1) % size) + size) % size;
};

export const at = (index: number, count: number): number => {
  const size = lengthOf(count);
  if (size === 0) return 0;
  const current = Number.isFinite(index) ? Math.trunc(index) : 0;
  return ((current % size) + size) % size;
};

export const phraseAt = (
  phrases: ReadonlyArray<string>,
  index: number,
): Option.Option<string> => Arr.get(phrases, at(index, phrases.length));
