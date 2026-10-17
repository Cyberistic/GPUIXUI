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

/** Append the tokens that pass the rules; a refused addition leaves the list. */
export const addTokens = (
  current: ReadonlyArray<string>,
  incoming: ReadonlyArray<string>,
  rules: AddRules = {},
): ReadonlyArray<string> =>
  Arr.reduce(incoming, current, (tokens, token) => {
    if (rules.max !== undefined && Arr.length(tokens) >= rules.max) {
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
