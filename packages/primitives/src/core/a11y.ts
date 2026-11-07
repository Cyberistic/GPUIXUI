import * as Option from "effect/Option";
import * as Str from "effect/String";

export const accessibleName = (label: string | undefined): string | undefined =>
  Option.getOrUndefined(
    Option.filter(
      Option.map(Option.fromNullishOr(label), Str.trim),
      Str.isNonEmpty,
    ),
  );

export const visibleCopy = (text: string | undefined): string | undefined =>
  accessibleName(text) === undefined ? undefined : text;

export const captionCopy = <Child>(
  children: Child | undefined,
  label: string | undefined,
): Child | string | undefined =>
  typeof children === "string"
    ? (visibleCopy(children) ?? visibleCopy(label))
    : (children ?? visibleCopy(label));

export const spokenText = (
  words: Option.Option<string>,
  fallback: string,
): string =>
  Option.getOrElse(
    Option.flatMap(words, (word) => Option.fromNullishOr(accessibleName(word))),
    () => fallback,
  );

export const spokenSentence = (answer: string, fallback: string): string =>
  spokenText(Option.fromNullishOr(answer), fallback);

export const spokenWord = (
  word: string | undefined,
  fallback: string,
): string => spokenText(Option.fromNullishOr(word), fallback);

export const fieldHelp = (
  props: { readonly description?: string; readonly placeholder?: string },
  value: string,
): string | undefined =>
  Option.match(Option.fromNullishOr(accessibleName(props.description)), {
    onSome: (help) => help,
    onNone: () =>
      value.length === 0 ? accessibleName(props.placeholder) : undefined,
  });
