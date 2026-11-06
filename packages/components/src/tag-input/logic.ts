import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import * as Result from "effect/Result";
import * as Str from "effect/String";

export interface AddRules {
  readonly allowDuplicates?: boolean;

  readonly max?: number;
}

export const tokensOf = (value: unknown): ReadonlyArray<string> =>
  Arr.isArray(value) ? Arr.filter(value, P.isString) : [];

export const splitDraft = (draft: string): ReadonlyArray<string> =>
  Arr.filterMap(Str.split(",")(draft), (part) => {
    const token = Str.trim(part);
    return token === "" ? Result.failVoid : Result.succeed(token);
  });

const capOf = (max: number | undefined): Option.Option<number> =>
  Option.map(
    Option.filter(Option.fromNullishOr(max), Number.isFinite),
    (value) => Math.max(0, Math.floor(value)),
  );

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
