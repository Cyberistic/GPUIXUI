import * as Option from "effect/Option";

export interface KeywordRules {
  readonly max: number;

  readonly allowDuplicates: boolean;
}

export const keywordRules: KeywordRules = { max: 5, allowDuplicates: false };

export interface Keywords {
  readonly tokens: ReadonlyArray<string>;

  readonly draft: string;
}

export const emptyKeywords: Keywords = { tokens: [], draft: "" };

export const splitDraft = (draft: string): ReadonlyArray<string> =>
  draft
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "");

export const addTokens = (
  current: ReadonlyArray<string>,
  incoming: ReadonlyArray<string>,
  rules: KeywordRules,
): ReadonlyArray<string> =>
  incoming.reduce<ReadonlyArray<string>>((tokens, token) => {
    if (tokens.length >= rules.max) return tokens;
    if (!rules.allowDuplicates && tokens.includes(token)) return tokens;
    return [...tokens, token];
  }, current);

export const removeToken = (
  tokens: ReadonlyArray<string>,
  value: string,
): ReadonlyArray<string> => {
  const at = tokens.indexOf(value);
  return at === -1 ? tokens : [...tokens.slice(0, at), ...tokens.slice(at + 1)];
};

export const typed = (
  state: Keywords,
  text: string,
  rules: KeywordRules,
  disabled = false,
): Keywords => {
  if (disabled) return state;
  const parts = text.split(",");
  if (parts.length < 2) return { ...state, draft: text };
  const head = parts.slice(0, -1).join(",");
  const tail = parts[parts.length - 1] ?? "";
  return {
    tokens: addTokens(state.tokens, splitDraft(head), rules),
    draft: tail,
  };
};

export const committed = (
  state: Keywords,
  rules: KeywordRules,
  disabled = false,
): Keywords =>
  disabled
    ? state
    : {
        tokens: addTokens(state.tokens, splitDraft(state.draft), rules),
        draft: "",
      };

export const removed = (
  state: Keywords,
  value: string,
  disabled = false,
): Keywords =>
  disabled
    ? state
    : { tokens: removeToken(state.tokens, value), draft: state.draft };

export const removeLabel = (value: string): string => `Remove ${value}`;

export const remaining = (state: Keywords, rules: KeywordRules): number =>
  Math.max(0, rules.max - state.tokens.length);

export const atLimit = (state: Keywords, rules: KeywordRules): boolean =>
  remaining(state, rules) === 0;

export const describeBudget = (
  state: Keywords,
  rules: KeywordRules,
): string => {
  const counted = `${state.tokens.length} of ${rules.max} keywords added`;
  const left = remaining(state, rules);
  return left === 0
    ? `${counted}: the list is full.`
    : `${counted}, ${left} more will fit.`;
};

export const describeRefusal = (
  state: Keywords,
  rules: KeywordRules,
  refused: number,
): Option.Option<string> =>
  refused === 0
    ? Option.none()
    : Option.some(
        atLimit(state, rules)
          ? "That keyword was refused: the list is full."
          : "That keyword was refused: it is already on the list.",
      );

export const describeGate = (state: Keywords): string =>
  state.tokens.length === 0
    ? "Add a keyword before publishing."
    : `Ready to publish ${state.tokens.length} ${
        state.tokens.length === 1 ? "keyword" : "keywords"
      }.`;

export const canPublish = (state: Keywords): boolean => state.tokens.length > 0;
