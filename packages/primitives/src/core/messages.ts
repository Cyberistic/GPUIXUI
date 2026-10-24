/**
 * The words a primitive announces, in one table a caller can replace.
 *
 * A state word is not a value: a checkbox announces "checked" through
 * `aria-valuetext` because the runtime has no `aria-checked`, so the word is
 * interface copy that a localised app has to own. A per-control prop would put
 * one word on every instance (a form with twenty checkboxes would repeat the
 * vocabulary twenty times) and a `messages` map on the provider is one seam for
 * the whole tree, which is why this table is the shape. The pure `render*`
 * functions take the resolved table as an argument instead of reading context,
 * so their unit tests still call them with no renderer.
 *
 * The defaults are the words the library shipped, and the table is **complete**
 * per group rather than word by word: a caller replacing `selection.checked`
 * also owns `unchecked` and `mixed`, because a half-translated state set reads
 * as a bug. A group a caller leaves out keeps the default. A row a table does
 * leave blank is absence, not a silence — a control's state word is the only
 * channel this runtime gives it, so `spokenWord` keeps the shipped word (see
 * `docs/theme-provider.mdx` §Words).
 *
 * A rating speaks a second vocabulary: a star is `checked`, `half` or
 * `unchecked` (how much of the glyph is filled, not what the rating says), and
 * its name is a template over its position and the star count. Both are
 * sentences, so they are their own group rather than selection words.
 *
 * The loading words are their own group: a busy action has no `aria-busy`
 * channel here, so the word is its description and the busy spinner's name, and
 * an indeterminate bar has no percentage to report. A per-instance prop still
 * wins (`loadingLabel`, `label`, `loadingText`), but the table is what stops a
 * localised tree from repeating the word on every action.
 */

import * as P from "effect/Predicate";
import { accessibleName, spokenSentence, spokenWord } from "./a11y.js";
import type { StarState } from "./rating.js";
import type { SelectionState } from "./selection.js";

/** The words a checkbox, checkbox group, radio row or switch announces. */
export interface SelectionWords {
  readonly checked: string;
  readonly unchecked: string;
  readonly mixed: string;
}

/** The words a toggle or a toggle-group row announces. */
export interface PressWords {
  readonly pressed: string;
  readonly notPressed: string;
}

/** The words one star of a rating announces: how much of it is filled. */
export interface StarWords {
  readonly checked: string;
  readonly half: string;
  readonly unchecked: string;
}

/**
 * The words a loading state announces.
 *
 * A busy action has no `aria-busy` in this runtime, so `busy` is both its
 * `aria-description` and the busy spinner's name; `indeterminate` is what a
 * progress bar says when it has no percentage to report. A localised interface
 * that names them here does not have to repeat one word on every action, which
 * is the same reason the state words above live in this table.
 */
export interface LoadingWords {
  readonly busy: string;
  readonly indeterminate: string;
}

/**
 * The two ends of a range slider are named from the group's own name.
 *
 * A suffix is not copy in every language — German and Japanese put the end
 * before the subject — so this is a sentence over the caller's name and the end
 * it belongs to rather than two more fields read with a space between them.
 */
export type RangeEndWords = (label: string, end: "start" | "end") => string;

/**
 * The interface copy the primitives announce.
 *
 * `codeDigit` receives the caller's own `label` (already blank-filtered) or
 * `undefined`, so a field named "Verification code" can keep that name in front
 * of its cell number without the caller rebuilding the whole sentence.
 * `starName` receives the star's one-based position and the star count, so a
 * caller owns the whole sentence rather than a suffix.
 */
export interface PrimitiveMessages {
  readonly selection: SelectionWords;
  readonly press: PressWords;
  readonly star: StarWords;
  /** One star of a rating. `index` is one-based; `max` is the star count. */
  readonly starName: (index: number, max: number) => string;
  /** The name a focusable scroll region gives itself. */
  readonly scrollRegion: string;
  /** One cell of a code field. `index` is zero-based. */
  readonly codeDigit: (index: number, label: string | undefined) => string;
  /** The words a busy action and an indeterminate bar announce. */
  readonly loading: LoadingWords;
  /** A range slider's two thumbs, named from the group's own name. */
  readonly rangeEnd: RangeEndWords;
}

/** The English words the library ships. */
export const defaultMessages: PrimitiveMessages = {
  selection: { checked: "checked", unchecked: "unchecked", mixed: "mixed" },
  press: { pressed: "pressed", notPressed: "not pressed" },
  star: { checked: "checked", half: "half", unchecked: "unchecked" },
  starName: (index, max) => `${index} of ${max}`,
  scrollRegion: "Scroll region",
  codeDigit: (index, label) => `${label ?? "Code"} digit ${index + 1}`,
  loading: { busy: "Loading", indeterminate: "loading" },
  rangeEnd: (label, end) =>
    `${label} ${end === "start" ? "minimum" : "maximum"}`,
};

/** One end's name: the caller's sentence, or the shipped one when it says nothing. */
const spokenEnd = (
  label: string,
  end: RangeEndWords,
  side: "start" | "end",
): string =>
  spokenSentence(end(label, side), defaultMessages.rangeEnd(label, side));

/**
 * The two names a range slider's thumbs announce.
 *
 * A blank group name names nothing, so both ends stay unnamed rather than
 * announcing " minimum" and " maximum" — the same rule the group itself follows
 * (`accessibleName`, not `=== undefined`, decides it). A sentence that answers
 * nothing is the other blank: a localised table with a missing row would name
 * each thumb with nothing, so the shipped sentence stands, the rule every
 * sentence a component calls follows.
 */
export const rangeThumbNames = (
  label: string | undefined,
  end: RangeEndWords = defaultMessages.rangeEnd,
): readonly [string | undefined, string | undefined] => {
  const name = accessibleName(label);
  return name === undefined
    ? [undefined, undefined]
    : [spokenEnd(name, end, "start"), spokenEnd(name, end, "end")];
};

/**
 * A slot as a store hands it back.
 *
 * The table is data once an application keeps its copy in a settings record, so
 * a slot may hold anything the decoder produced: JSON has no `undefined`, a
 * row can be written as a number, and a sentence an app stores as a template
 * string arrives as text. The reads below decide what each slot can be
 * (`row`, `sentence`), so the shape states the truth at the boundary and a
 * decoded table reaches the provider without a cast.
 */
type Stored<T> = T extends (...args: never[]) => unknown
  ? unknown
  : T extends object
    ? { readonly [K in keyof T]?: Stored<T[K]> } | null
    : unknown;

/**
 * A words table as a store hands it back.
 *
 * The words are interface copy, and an application that keeps its copy in a
 * settings record reads the table back from `JSON.parse` — a value whose groups
 * and rows may be `null`. A provider accepts this shape so a decoded table
 * reaches the seam **without a cast** (`AGENTS.md` §2), the rule
 * `ThemeOverridesSource` follows for a stored theme.
 */
export type MessagesSource = {
  readonly [K in keyof PrimitiveMessages]?: Stored<PrimitiveMessages[K]>;
};

/**
 * A row of a words table as a store hands it back: text, or the row above it.
 *
 * The table is interface copy, and an application that keeps its copy in a
 * settings record reads it back as data: a row a decoder wrote as a number, a
 * flag or an object is not a word, and `??` kept it — the paint then trimmed a
 * number (`TypeError: self.trim is not a function`) while every control that
 * announced that state went with the window. Only text is a word; a blank one
 * is still kept, because `spokenWord` reads it as "no translation" and keeps the
 * shipped word.
 */
const row = (stored: unknown, inherited: string): string =>
  P.isString(stored) ? stored : inherited;

/** A sentence slot a table calls, or `true` for a value that is not one. */
const isSentence = <A>(value: unknown): value is A => P.isFunction(value);

/**
 * A sentence slot as a store hands it back: a function, or the one above it.
 *
 * `starName`, `codeDigit` and `rangeEnd` are called with the component's own
 * data, and a stored table is data: an app that keeps its copy as a template
 * string wrote text where a function belongs, and the render called it —
 * `TypeError: messages.starName is not a function` out of Rating, OTPField and
 * RangeSlider — which a window paints as an empty area, not an error. A slot
 * that is not a function inherits the table above the provider.
 */
const sentence = <A>(stored: unknown, inherited: A): A =>
  isSentence<A>(stored) ? stored : inherited;

/** The rows of one words group, read row by row against the table above. */
const selectionRows = (
  stored: Stored<SelectionWords> | undefined,
  inherited: SelectionWords,
): SelectionWords => ({
  checked: row(stored?.checked, inherited.checked),
  unchecked: row(stored?.unchecked, inherited.unchecked),
  mixed: row(stored?.mixed, inherited.mixed),
});

const pressRows = (
  stored: Stored<PressWords> | undefined,
  inherited: PressWords,
): PressWords => ({
  pressed: row(stored?.pressed, inherited.pressed),
  notPressed: row(stored?.notPressed, inherited.notPressed),
});

const starRows = (
  stored: Stored<StarWords> | undefined,
  inherited: StarWords,
): StarWords => ({
  checked: row(stored?.checked, inherited.checked),
  half: row(stored?.half, inherited.half),
  unchecked: row(stored?.unchecked, inherited.unchecked),
});

const loadingRows = (
  stored: Stored<LoadingWords> | undefined,
  inherited: LoadingWords,
): LoadingWords => ({
  busy: row(stored?.busy, inherited.busy),
  indeterminate: row(stored?.indeterminate, inherited.indeterminate),
});

/**
 * The table a provider paints: the caller's keys over the table above it.
 *
 * A **group** merges row by row, so `messages={{ press: … }}` does not silence
 * a checkbox and a stored group that lost a row keeps the table above it —
 * while a row it wrote blank keeps the shipped word (`spokenWord`). A key a
 * caller forwards as `undefined` inherits, the rule `extendTheme` applies to a
 * theme's groups, and the whole table may be `null` — a record whose `messages`
 * field was never written — which is the same absence. Three of these keys are
 * sentences a component calls (`starName`, `codeDigit`, `rangeEnd`), and a
 * stored table is data: a value there that is not a function — the template
 * string an app keeps its copy as, a number, a flag — inherits the sentence
 * above it rather than being called, and a row that is not text inherits the
 * word above it rather than being trimmed.
 *
 * The defaults are returned **as they are** when nothing is overridden, so the
 * shipped table has one identity rather than a copy per provider.
 */
export const resolveMessages = (
  messages?: MessagesSource | null,
  inherited: PrimitiveMessages = defaultMessages,
): PrimitiveMessages =>
  messages === undefined || messages === null
    ? inherited
    : {
        selection: selectionRows(messages.selection, inherited.selection),
        press: pressRows(messages.press, inherited.press),
        star: starRows(messages.star, inherited.star),
        starName: sentence(messages.starName, inherited.starName),
        scrollRegion: row(messages.scrollRegion, inherited.scrollRegion),
        codeDigit: sentence(messages.codeDigit, inherited.codeDigit),
        loading: loadingRows(messages.loading, inherited.loading),
        rangeEnd: sentence(messages.rangeEnd, inherited.rangeEnd),
      };

/**
 * The word a selection announces.
 *
 * `mixed` is the indeterminate box: a third state rather than a value, and the
 * one a screen reader has no `aria-checked` channel for either. A row the
 * table leaves blank is absence — the rule `spokenSentence` applies to a
 * sentence — because `aria-valuetext` is the only channel a checkbox has.
 */
export const selectionWord = (
  state: SelectionState,
  words: SelectionWords = defaultMessages.selection,
): string =>
  state === "indeterminate"
    ? spokenWord(words.mixed, defaultMessages.selection.mixed)
    : state === "checked"
      ? spokenWord(words.checked, defaultMessages.selection.checked)
      : spokenWord(words.unchecked, defaultMessages.selection.unchecked);

/** The word a toggle announces: there is no `aria-pressed` to carry it. */
export const pressWord = (
  pressed: boolean,
  words: PressWords = defaultMessages.press,
): string =>
  pressed
    ? spokenWord(words.pressed, defaultMessages.press.pressed)
    : spokenWord(words.notPressed, defaultMessages.press.notPressed);

/** The word one star announces: how much of the glyph is painted. */
export const starWord = (
  state: StarState,
  words: StarWords = defaultMessages.star,
): string =>
  state === "checked"
    ? spokenWord(words.checked, defaultMessages.star.checked)
    : state === "half"
      ? spokenWord(words.half, defaultMessages.star.half)
      : spokenWord(words.unchecked, defaultMessages.star.unchecked);

/**
 * The word a busy action and its spinner announce.
 *
 * A busy action has no `aria-busy`, so this word is both the action's
 * description and the indicator's name; a blank row would leave the status
 * silent, so the shipped word stands. A `loadingLabel` prop is the deliberate
 * opt-out and is resolved by the component, not here.
 */
export const busyWord = (
  words: LoadingWords = defaultMessages.loading,
): string => spokenWord(words.busy, defaultMessages.loading.busy);

/** The word an indeterminate bar announces when it has no percentage. */
export const indeterminateWord = (
  words: LoadingWords = defaultMessages.loading,
): string =>
  spokenWord(words.indeterminate, defaultMessages.loading.indeterminate);
