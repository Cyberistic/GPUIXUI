/**
 * Tag input rules: which tokens an edit adds, and which it removes.
 *
 * The rules are pure so the component only wires them to an `<input>`: trim,
 * drop empties, refuse duplicates unless asked, cap at `max`.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import * as Str from "effect/String";

/** How additions are filtered. */
export interface AddRules {
  /** Keep repeated tokens. Default `false`. */
  readonly allowDuplicates?: boolean;
  /** The maximum number of tokens; additions past it are refused. */
  readonly max?: number;
}

/** The tokens in a draft: split on commas, trimmed, empties dropped. */
export const splitDraft = (draft: string): ReadonlyArray<string> =>
  Arr.filterMap(Str.split(",")(draft), (part) => {
    const token = Str.trim(part);
    return token === "" ? Result.failVoid : Result.succeed(token);
  });

/**
 * The cap as a whole number of tokens.
 *
 * `max` is a count, so it is floored: a budget of `2.7` allows two tokens, not
 * three. A cap the rules cannot read — `NaN` from a measurement that never
 * arrived, an infinity from arithmetic against a zero width — is not a cap at
 * all, the same reading `AvatarGroup` gives its unreadable `max` rather than
 * hiding every member.
 */
const capOf = (max: number | undefined): Option.Option<number> =>
  Option.map(
    Option.filter(Option.fromNullishOr(max), Number.isFinite),
    (value) => Math.max(0, Math.floor(value)),
  );

/** Append the tokens that pass the rules; a refused addition leaves the list. */
export const addTokens = (
  current: ReadonlyArray<string>,
  incoming: ReadonlyArray<string>,
  rules: AddRules = {},
): ReadonlyArray<string> => {
  const cap = capOf(rules.max);
  return Arr.reduce(incoming, current, (tokens, token) => {
    if (Option.exists(cap, (limit) => Arr.length(tokens) >= limit)) {
      return tokens;
    }
    if (
      rules.allowDuplicates !== true &&
      Arr.some(tokens, (existing) => existing === token)
    ) {
      return tokens;
    }
    return Arr.append(tokens, token);
  });
};

/** Remove the first exact match; an absent token is a no-op. */
export const removeToken = (
  current: ReadonlyArray<string>,
  value: string,
): ReadonlyArray<string> =>
  Option.match(
    Arr.findFirstIndex(current, (token) => token === value),
    {
      onNone: () => current,
      onSome: (index) =>
        Arr.appendAll(Arr.take(current, index), Arr.drop(current, index + 1)),
    },
  );
