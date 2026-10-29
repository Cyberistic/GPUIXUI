/**
 * The tag input preview's rules and its publish gate.
 *
 * A tag field's interesting half is invisible in a drawing: whether a typed
 * comma commits the words before it and keeps the rest, whether a duplicate is
 * refused silently, and whether the fifth keyword refuses the sixth. The rules
 * are the component's (`packages/components/src/tag-input/logic.ts`);
 * `tag-input-preview.test.ts` holds these copies to the component's own
 * functions over a sweep, so a preview cannot paint a field the shipped one
 * would have answered differently.
 *
 * The publish gate is the app's, not the component's: a draft is not a keyword
 * until it is committed, so a form must not save while a typed token is still
 * sitting in the field.
 */

import * as Option from "effect/Option";

/** What the field accepts: the cap and whether a repeat is a token. */
export interface KeywordRules {
  /** The most tokens the list holds; additions past it are refused. */
  readonly max: number;
  /** Whether a token already present may be added again. */
  readonly allowDuplicates: boolean;
}

/** The publishing form's rules: five keywords, no repeats. */
export const keywordRules: KeywordRules = { max: 5, allowDuplicates: false };

/** The field's two halves: the tokens the caller owns and the draft. */
export interface Keywords {
  readonly tokens: ReadonlyArray<string>;
  /** The text in the field, not yet a token. */
  readonly draft: string;
}

/** An untouched field. */
export const emptyKeywords: Keywords = { tokens: [], draft: "" };

/**
 * The tokens in a draft: split on commas, trimmed, empties dropped.
 *
 * The component's `splitDraft`, and the reason `"design, , docs"` is two
 * tokens rather than three.
 */
export const splitDraft = (draft: string): ReadonlyArray<string> =>
  draft
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "");

/**
 * Append the tokens the rules accept; a refused addition leaves the list.
 *
 * The cap is checked before the duplicate, exactly as `addTokens` orders the
 * two, so a sixth token is refused whether or not it repeats.
 */
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

/** Remove the first exact match; an absent token is a no-op. */
export const removeToken = (
  tokens: ReadonlyArray<string>,
  value: string,
): ReadonlyArray<string> => {
  const at = tokens.indexOf(value);
  return at === -1 ? tokens : [...tokens.slice(0, at), ...tokens.slice(at + 1)];
};

/**
 * A typed edit.
 *
 * A comma makes the edit a batch: everything before the **last** comma is
 * committed and the remainder stays the draft, which is why pasting
 * `"design,docs"` adds two tokens and typing `","` adds the word before it.
 * While the group is disabled no edit path moves the tokens or the draft.
 */
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

/**
 * `Enter` or the host's submit event: commit the whole draft, then clear it.
 *
 * The draft clears whether or not every token landed, so a refused duplicate
 * does not sit in the field inviting a second try. A disabled group answers
 * nothing at all — not even a cleared draft.
 */
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

/** A chip's removal control, which also reports nothing while disabled. */
export const removed = (
  state: Keywords,
  value: string,
  disabled = false,
): Keywords =>
  disabled
    ? state
    : { tokens: removeToken(state.tokens, value), draft: state.draft };

/** The name the removal control carries, `Remove <token>`. */
export const removeLabel = (value: string): string => `Remove ${value}`;

/** How many tokens still fit. */
export const remaining = (state: Keywords, rules: KeywordRules): number =>
  Math.max(0, rules.max - state.tokens.length);

/** Whether another token would be refused. */
export const atLimit = (state: Keywords, rules: KeywordRules): boolean =>
  remaining(state, rules) === 0;

/**
 * The budget line the form prints, as a sentence.
 *
 * It used to be a readout — `2 of 5 keywords · 3 left · refused=1` — which read
 * like a debug counter beside the field. The refusal is the next sentence, and
 * only when there is one.
 */
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

/**
 * What a refused commit means, in a sentence, or nothing when none was refused.
 *
 * A commit clears the draft whether or not it landed, so the form has to say
 * why the word disappeared: at the cap the list is full, and below it the only
 * refusal `addTokens` can make is a repeat.
 */
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

/**
 * The line under the publish action.
 *
 * The gate reads the tokens only. The component keeps the field's draft
 * privately, so a caller cannot tell that a keyword is half-typed — a form that
 * has to gate on the draft must ask the reader to commit it first, or own the
 * field itself.
 */
export const describeGate = (state: Keywords): string =>
  state.tokens.length === 0
    ? "Add a keyword before publishing."
    : `Ready to publish ${state.tokens.length} ${
        state.tokens.length === 1 ? "keyword" : "keywords"
      }.`;

/** Whether the publish action may run: at least one committed token. */
export const canPublish = (state: Keywords): boolean => state.tokens.length > 0;
