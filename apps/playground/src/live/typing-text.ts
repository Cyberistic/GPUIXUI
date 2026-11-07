import * as Arr from "effect/Array";

export const TYPING_IDS = {
  probe: "typing-probe",
  slow: "typing-slow",
  instant: "typing-instant",
  reduced: "typing-reduced",
  emoji: "typing-emoji",
} as const;

export const TYPING_TEXT = {
  slow: "A window shapes each letter.",
  instant: "Instant",
  reduced: "Reduced paints at once",
  emoji: "🦊🦊🦊",
} as const;

export const TYPING_SPEED = { slowMs: 90, emojiMs: 140 } as const;

export const TYPING_POLL_MS = 120;

export const TYPING_SAMPLES = 4;

export const codePoints = (text: string): ReadonlyArray<string> =>
  Arr.fromIterable(text);

export const codePointCount = (text: string): number =>
  Arr.length(codePoints(text));

export const codePointPrefixes = (text: string): ReadonlyArray<string> => {
  const characters = codePoints(text);
  return Arr.map(Arr.range(0, Arr.length(characters)), (count) =>
    Arr.join(Arr.take(characters, count), ""),
  );
};

export const isCodePointPrefix = (candidate: string, text: string): boolean =>
  Arr.contains(codePointPrefixes(text), candidate);

export const isPartialReveal = (candidate: string, text: string): boolean =>
  candidate.length > 0 &&
  isCodePointPrefix(candidate, text) &&
  candidate !== text;

export const wholeLines = (
  lines: ReadonlyArray<string>,
  text: string,
): number => Arr.length(Arr.filter(lines, (line) => line === text));

export const partialLines = (
  lines: ReadonlyArray<string>,
  text: string,
): number =>
  Arr.length(Arr.filter(lines, (line) => isPartialReveal(line, text)));

export const sawPartial = (
  samples: ReadonlyArray<string>,
  text: string,
): boolean => Arr.some(samples, (sample) => isPartialReveal(sample, text));

export const allPrefixes = (
  samples: ReadonlyArray<string>,
  text: string,
): boolean => Arr.every(samples, (sample) => isCodePointPrefix(sample, text));

export const TYPING_CHECKS = 23;
