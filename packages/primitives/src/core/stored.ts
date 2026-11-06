import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";

export const storedText = (value: unknown): string | undefined =>
  P.isString(value) ? value : undefined;

export const storedList = <A>(
  value: unknown,
  read: (entry: unknown) => Option.Option<A>,
): ReadonlyArray<A> =>
  Arr.isArray(value) ? Arr.getSomes(Arr.map(value, read)) : [];

export const storedTextList = (
  value: unknown,
): Option.Option<ReadonlyArray<string>> =>
  Arr.isArray(value)
    ? Option.some(Arr.filter(value, P.isString))
    : Option.none();

export const storedNumber = (value: unknown): Option.Option<number> =>
  typeof value === "number" ? Option.some(value) : Option.none();
