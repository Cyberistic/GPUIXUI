import * as Arr from "effect/Array";
import * as Option from "effect/Option";

export const typingDefaults = {
  speedMs: 45,

  delayMs: 0,
} as const;

export interface TypingTiming {
  readonly delayMs: number;

  readonly speedMs: number;
}

const milliseconds = (value: Option.Option<number>, fallback: number): number =>
  Option.match(
    Option.filter(value, (ms) => Number.isFinite(ms) && ms >= 0),
    {
      onNone: () => fallback,
      onSome: (ms) => Math.round(ms),
    },
  );

export const typingTiming = (
  options: {
    readonly speedMs?: number;
    readonly delayMs?: number;
  } = {},
): TypingTiming => ({
  delayMs: milliseconds(
    Option.fromNullishOr(options.delayMs),
    typingDefaults.delayMs,
  ),
  speedMs: milliseconds(
    Option.fromNullishOr(options.speedMs),
    typingDefaults.speedMs,
  ),
});

export const characters = (text: string): ReadonlyArray<string> =>
  Arr.fromIterable(text);

export const visibleText = (text: string, revealed: number): string =>
  Arr.join(
    Arr.take(
      characters(text),
      Number.isFinite(revealed) ? Math.max(0, Math.trunc(revealed)) : 0,
    ),
    "",
  );
