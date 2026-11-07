import * as P from "effect/Predicate";
import { accessibleName, spokenSentence, spokenWord } from "./a11y.js";
import type { StarState } from "./rating.js";
import type { SelectionState } from "./selection.js";

export interface SelectionWords {
  readonly checked: string;
  readonly unchecked: string;
  readonly mixed: string;
}

export interface PressWords {
  readonly pressed: string;
  readonly notPressed: string;
}

export interface StarWords {
  readonly checked: string;
  readonly half: string;
  readonly unchecked: string;
}

export interface LoadingWords {
  readonly busy: string;
  readonly indeterminate: string;
}

export type RangeEndWords = (label: string, end: "start" | "end") => string;

export interface PrimitiveMessages {
  readonly selection: SelectionWords;
  readonly press: PressWords;
  readonly star: StarWords;

  readonly starName: (index: number, max: number) => string;

  readonly scrollRegion: string;

  readonly codeDigit: (index: number, label: string | undefined) => string;

  readonly loading: LoadingWords;

  readonly rangeEnd: RangeEndWords;
}

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

const spokenEnd = (
  label: string,
  end: RangeEndWords,
  side: "start" | "end",
): string =>
  spokenSentence(end(label, side), defaultMessages.rangeEnd(label, side));

export const rangeThumbNames = (
  label: string | undefined,
  end: RangeEndWords = defaultMessages.rangeEnd,
): readonly [string | undefined, string | undefined] => {
  const name = accessibleName(label);
  return name === undefined
    ? [undefined, undefined]
    : [spokenEnd(name, end, "start"), spokenEnd(name, end, "end")];
};

type Stored<T> = T extends (...args: never[]) => unknown
  ? unknown
  : T extends object
    ? { readonly [K in keyof T]?: Stored<T[K]> } | null
    : unknown;

export type MessagesSource = {
  readonly [K in keyof PrimitiveMessages]?: Stored<PrimitiveMessages[K]>;
};

const row = (stored: unknown, inherited: string): string =>
  P.isString(stored) ? stored : inherited;

const isSentence = <A>(value: unknown): value is A => P.isFunction(value);

const sentence = <A>(stored: unknown, inherited: A): A =>
  isSentence<A>(stored) ? stored : inherited;

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

export const selectionWord = (
  state: SelectionState,
  words: SelectionWords = defaultMessages.selection,
): string =>
  state === "indeterminate"
    ? spokenWord(words.mixed, defaultMessages.selection.mixed)
    : state === "checked"
      ? spokenWord(words.checked, defaultMessages.selection.checked)
      : spokenWord(words.unchecked, defaultMessages.selection.unchecked);

export const pressWord = (
  pressed: boolean,
  words: PressWords = defaultMessages.press,
): string =>
  pressed
    ? spokenWord(words.pressed, defaultMessages.press.pressed)
    : spokenWord(words.notPressed, defaultMessages.press.notPressed);

export const starWord = (
  state: StarState,
  words: StarWords = defaultMessages.star,
): string =>
  state === "checked"
    ? spokenWord(words.checked, defaultMessages.star.checked)
    : state === "half"
      ? spokenWord(words.half, defaultMessages.star.half)
      : spokenWord(words.unchecked, defaultMessages.star.unchecked);

export const busyWord = (
  words: LoadingWords = defaultMessages.loading,
): string => spokenWord(words.busy, defaultMessages.loading.busy);

export const indeterminateWord = (
  words: LoadingWords = defaultMessages.loading,
): string =>
  spokenWord(words.indeterminate, defaultMessages.loading.indeterminate);
