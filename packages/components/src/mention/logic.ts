/**
 * Mention token rules: where a query starts, what replaces it and how names are
 * ranked.
 *
 * 0.11.0 exposes no caret position, so the query is derived from the text: the
 * last `@` that starts the text or follows whitespace, with no whitespace after
 * it. That is correct while typing at the end; mid-string editing is a recorded
 * limitation.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";

/** The active query and the index of its `@`. */
export interface MentionQuery {
  readonly start: number;
  readonly query: string;
}

/** The last `@` token, when one is open. */
export const mentionQuery = (text: string): Option.Option<MentionQuery> => {
  const at = Str.lastIndexOf("@")(text);
  if (Option.isNone(at)) return Option.none();
  const start = at.value;
  const before = start === 0 ? "" : Str.slice(start - 1, start)(text);
  const query = Str.slice(start + 1)(text);
  if (before !== "" && before !== " " && before !== "\n") return Option.none();
  if (Str.includes(" ")(query) || Str.includes("\n")(query)) {
    return Option.none();
  }
  return Option.some({ start, query });
};

/** Replace the open token with `@value ` and nothing else. */
export const applyMention = (
  text: string,
  start: number,
  value: string,
): string => `${Str.slice(0, start)(text)}@${value} `;

/** The house row budget a suggestion list shows when its caller declares none. */
export const mentionMaxVisible = 6;

/**
 * How many rows a cap can paint.
 *
 * `maxVisible` is usually arithmetic over a measured height, so it reaches this
 * rule as `NaN` until the first layout. A cap that cannot be read is no count:
 * it takes the house budget rather than `Math.max(0, NaN)`, which stayed `NaN`
 * and made `Arr.take` empty — the list then painted no suggestion while the
 * component reported it open. An unbounded cap shows every name and a negative
 * one none, which is what their own limits mean.
 */
export const normalizeMaxVisible = (maxVisible: number): number =>
  Number.isNaN(maxVisible)
    ? mentionMaxVisible
    : Math.max(0, Math.floor(maxVisible));

/** Rank names: prefix matches first, then substrings, each in input order. */
export const rankMentions = (
  values: ReadonlyArray<string>,
  query: string,
  maxVisible: number,
): ReadonlyArray<string> => {
  const needle = Str.toLowerCase(query);
  const matches = Arr.filter(values, (value) =>
    Str.includes(needle)(Str.toLowerCase(value)),
  );
  const prefixes = Arr.filter(matches, (value) =>
    Str.startsWith(needle)(Str.toLowerCase(value)),
  );
  const rest = Arr.filter(
    matches,
    (value) => !Str.startsWith(needle)(Str.toLowerCase(value)),
  );
  return Arr.take(
    Arr.appendAll(prefixes, rest),
    normalizeMaxVisible(maxVisible),
  );
};
