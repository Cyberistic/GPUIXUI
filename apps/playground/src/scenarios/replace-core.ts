/**
 * The replacement rule behind the `replace-contract` probe (plan 333).
 *
 * A find bar replaces a literal query left to right. It is not a regex API:
 * `$&` in the replacement is text, and a replacement that contains the query is
 * never re-scanned. An empty query is inert — `"".split` would otherwise return
 * one segment per character.
 */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";

/** The rewritten text and how many occurrences changed. */
export interface Replacement {
  readonly text: string;
  readonly count: number;
}

/** Replaces the first literal occurrence of `query`. */
export const replaceFirst = (
  source: string,
  query: string,
  replacement: string,
): Replacement => {
  if (Str.isEmpty(query)) return { text: source, count: 0 };
  return Option.match(Str.indexOf(query)(source), {
    onNone: () => ({ text: source, count: 0 }),
    onSome: (index) => ({
      text: `${Str.substring(0, index)(source)}${replacement}${Str.substring(
        index + Str.length(query),
      )(source)}`,
      count: 1,
    }),
  });
};

/** Replaces every literal, non-overlapping occurrence of `query`, once. */
export const replaceAll = (
  source: string,
  query: string,
  replacement: string,
): Replacement => {
  if (Str.isEmpty(query)) return { text: source, count: 0 };
  const parts = Str.split(source, query);
  return {
    text: Arr.join(parts, replacement),
    count: Arr.length(parts) - 1,
  };
};
