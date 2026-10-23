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
 * as a bug. A group a caller leaves out keeps the default.
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
};

/**
 * The table a provider paints: the caller's keys over the table above it.
 *
 * A group named whole replaces its inherited group whole; a group left out
 * keeps it, so `messages={{ press: … }}` does not silence a checkbox. **A key
 * written `undefined` inherits too**, the rule `extendTheme` applies to a
 * theme's groups: a caller forwarding an optional group it never received must
 * not erase it. Two of these keys are sentences a component calls
 * (`starName`, `codeDigit`), so a hole there is a render that throws, and a
 * hole in `selection` silently speaks the shipped English inside a localised
 * tree.
 *
 * The defaults are returned **as they are** when nothing is overridden, so the
 * shipped table has one identity rather than a copy per provider.
 */
export const resolveMessages = (
  messages?: Partial<PrimitiveMessages>,
  inherited: PrimitiveMessages = defaultMessages,
): PrimitiveMessages =>
  messages === undefined
    ? inherited
    : {
        selection: messages.selection ?? inherited.selection,
        press: messages.press ?? inherited.press,
        star: messages.star ?? inherited.star,
        starName: messages.starName ?? inherited.starName,
        scrollRegion: messages.scrollRegion ?? inherited.scrollRegion,
        codeDigit: messages.codeDigit ?? inherited.codeDigit,
        loading: messages.loading ?? inherited.loading,
      };

/**
 * The word a selection announces.
 *
 * `mixed` is the indeterminate box: a third state rather than a value, and the
 * one a screen reader has no `aria-checked` channel for either.
 */
export const selectionWord = (
  state: SelectionState,
  words: SelectionWords = defaultMessages.selection,
): string =>
  state === "indeterminate"
    ? words.mixed
    : state === "checked"
      ? words.checked
      : words.unchecked;

/** The word a toggle announces: there is no `aria-pressed` to carry it. */
export const pressWord = (
  pressed: boolean,
  words: PressWords = defaultMessages.press,
): string => (pressed ? words.pressed : words.notPressed);

/** The word one star announces: how much of the glyph is painted. */
export const starWord = (
  state: StarState,
  words: StarWords = defaultMessages.star,
): string =>
  state === "checked"
    ? words.checked
    : state === "half"
      ? words.half
      : words.unchecked;
