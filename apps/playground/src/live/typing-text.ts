/**
 * What a `TypingText` reveal really paints, and the arithmetic the
 * `typing-text-lifecycle` probe reads a window with.
 *
 * The catalogue's *Typing text* row claims the reveal is "a timer over the
 * characters the string already has", that a character is a **code point** so a
 * string with an emoji is never split, that `speed={0}` and the reduced
 * preference paint the whole string on the first frame, and that a caret sits
 * after the run until the last character lands. The component's renderer suite
 * reads the text nodes and their children; what a **window** shapes is a
 * different claim — the runtime lays out the run it is handed, so a reveal that
 * painted the whole string into a text host and simply dimmed it, or a caret
 * that never left, would pass there and fail here.
 *
 * The fixture is three text hosts and one reduced twin: a slow reveal with a
 * caret, an instant one, a three-emoji one, and one under
 * `MotionProvider preference="reduced"`.
 *
 * Native-free: the ids, the strings, the paces, the prefix algebra and the check
 * count live here so the view, the steps, the README and the unit test read one
 * source.
 */
import * as Arr from "effect/Array";

/** The `testId`s the view and the steps share. */
export const TYPING_IDS = {
  probe: "typing-probe",
  slow: "typing-slow",
  instant: "typing-instant",
  reduced: "typing-reduced",
  emoji: "typing-emoji",
} as const;

/**
 * The four strings, each asking one question.
 *
 * The slow one is long enough that a read taken after the mount is a **proper**
 * prefix; the instant and reduced ones are short, so a reveal that waited at all
 * would still be short at the first read; the emoji one is three code points,
 * each two UTF-16 units.
 */
export const TYPING_TEXT = {
  slow: "A window shapes each letter.",
  instant: "Instant",
  reduced: "Reduced paints at once",
  emoji: "🦊🦊🦊",
} as const;

/** The reveal paces, in milliseconds per character. */
export const TYPING_SPEED = { slowMs: 90, emojiMs: 140 } as const;

/** The wait between two sampled reads of the emoji reveal. */
export const TYPING_POLL_MS = 120;

/** How many emoji reads are sampled: enough to see a middle frame. */
export const TYPING_SAMPLES = 4;

/** A string's characters, as the component counts them: code points. */
export const codePoints = (text: string): ReadonlyArray<string> =>
  Arr.fromIterable(text);

/** How many code points `text` has. */
export const codePointCount = (text: string): number =>
  Arr.length(codePoints(text));

/**
 * Every code-point prefix of `text`, the empty string included.
 *
 * The reveal can only ever paint one of these: a prefix cut by UTF-16 units
 * would leave half an emoji, which is neither a prefix nor a glyph.
 */
export const codePointPrefixes = (text: string): ReadonlyArray<string> => {
  const characters = codePoints(text);
  return Arr.map(Arr.range(0, Arr.length(characters)), (count) =>
    Arr.join(Arr.take(characters, count), ""),
  );
};

/** Whether `candidate` is one of `text`'s code-point prefixes. */
export const isCodePointPrefix = (candidate: string, text: string): boolean =>
  Arr.contains(codePointPrefixes(text), candidate);

/** Whether `candidate` is a proper, non-empty prefix of `text`. */
export const isPartialReveal = (candidate: string, text: string): boolean =>
  candidate.length > 0 &&
  isCodePointPrefix(candidate, text) &&
  candidate !== text;

/** How many of `lines` are the whole `text`. */
export const wholeLines = (
  lines: ReadonlyArray<string>,
  text: string,
): number => Arr.length(Arr.filter(lines, (line) => line === text));

/** How many of `lines` are a partial reveal of `text`. */
export const partialLines = (
  lines: ReadonlyArray<string>,
  text: string,
): number =>
  Arr.length(Arr.filter(lines, (line) => isPartialReveal(line, text)));

/** Whether any sample shows a reveal still running (shorter than the whole). */
export const sawPartial = (
  samples: ReadonlyArray<string>,
  text: string,
): boolean => Arr.some(samples, (sample) => isPartialReveal(sample, text));

/** Whether every sample is a code-point prefix of `text`. */
export const allPrefixes = (
  samples: ReadonlyArray<string>,
  text: string,
): boolean => Arr.every(samples, (sample) => isCodePointPrefix(sample, text));

/**
 * The checks the probe asserts, as the run reports them.
 *
 * The count is the **executed** number, so it is larger than the source's
 * assertion sites: `box` and `captureFrame` assert once per call.
 */
export const TYPING_CHECKS = 23;
