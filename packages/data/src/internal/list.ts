import * as Arr from "effect/Array";
import * as P from "effect/Predicate";
import * as Str from "effect/String";

export const listOf = <A>(
  value: ReadonlyArray<A> | null | undefined,
): ReadonlyArray<A> => (Arr.isArray(value) ? value : []);

export const recordsOf = <A extends { readonly key: string }>(
  value: ReadonlyArray<A> | undefined,
): ReadonlyArray<A> =>
  Arr.filter(
    listOf(value),
    (entry) => P.isObject(entry) && P.isString(entry.key),
  );

export const textsOf = (
  value: ReadonlyArray<string> | undefined,
): ReadonlyArray<string> =>
  Arr.map(listOf(value), (entry) => (P.isString(entry) ? entry : ""));

const namesRow = (value: unknown): boolean =>
  P.isString(value) && Str.isNonEmpty(Str.trim(value));

export const rowsOf = <A>(
  value: ReadonlyArray<A> | null | undefined,
  keyOf: (row: A) => string,
): ReadonlyArray<A> =>
  Arr.filter(listOf(value), (row) => P.isObject(row) && namesRow(keyOf(row)));
