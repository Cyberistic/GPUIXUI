import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as Str from "effect/String";

export const AVATAR_STATUSES = ["online", "away", "busy", "offline"] as const;

export const AvatarStatus = Schema.Literals(AVATAR_STATUSES);

export type AvatarStatus = typeof AvatarStatus.Type;

export const isAvatarStatus = Schema.is(AvatarStatus);

const SEPARATORS = /[\s-]+/;

const parts = (name: string): ReadonlyArray<string> =>
  pipe(Str.trim(name), Str.split(SEPARATORS), Arr.filter(Str.isNonEmpty));

const leadingLetters = (name: string): ReadonlyArray<string> =>
  Arr.getSomes(
    Arr.map(parts(name), (part) =>
      Option.map(Arr.head(Arr.fromIterable(part)), Str.toUpperCase),
    ),
  );

export const initials = (name: string): string => {
  const letters = leadingLetters(name);

  const last = Option.getOrElse(Arr.last(letters), () => "");

  return Option.match(Arr.head(letters), {
    onNone: () => "?",
    onSome: (first) => (first === last ? first : `${first}${last}`),
  });
};
