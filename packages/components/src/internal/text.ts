import { pipe } from "effect";
import * as Option from "effect/Option";
import * as Str from "effect/String";

export const textOf = (value: unknown): string =>
  typeof value === "string" ? value : "";

export const nameOf = (value: unknown): string | undefined =>
  pipe(
    Option.some(textOf(value)),
    Option.map(Str.trim),
    Option.filter(Str.isNonEmpty),
    Option.getOrUndefined,
  );
