/**
 * SplittingText's rules: how a string becomes the units a reveal paints.
 *
 * The split is the component's whole contract, so it lives here without a
 * renderer: a character split never breaks an emoji (the unit is a code point),
 * a word gap in character mode is a non-breaking space because the text layout
 * trims a run that is only a space, a blank line contributes no row, and each
 * unit's delay is `@gpuixui/motion`'s stagger rule rather than a second copy of
 * it.
 */

import { stagger, type StaggerFrom } from "@gpuixui/motion/timeline";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";

/** What a string splits into. */
export type SplitMode = "words" | "characters";

/** One painted unit: a word, or a character and the gap beside it. */
export interface SplitUnit {
  /** Stable while the unit at this position keeps its text, so it does not replay. */
  readonly key: string;
  readonly text: string;
  /** The stagger delay, in milliseconds. */
  readonly delayMs: number;
}

/** One row of the reveal: an explicit line of the source text. */
export interface SplitLine {
  readonly key: string;
  readonly units: ReadonlyArray<SplitUnit>;
}

/** How to split a string. */
export interface SplitOptions {
  /** Default `"words"`. */
  readonly mode?: SplitMode;
  /** Milliseconds between two units. Default `40`. */
  readonly stepMs?: number;
  /** Where the stagger starts. Default `"start"`. */
  readonly from?: StaggerFrom;
}

/** A visible word gap the text layout will not trim. */
const WORD_GAP = "\u00A0";

/** The house step: a four-word headline lands inside one `normal` run. */
const STEP_MS = 40;

/** The house travel: far enough to read as a rise, too small to notice as a jump. */
const OFFSET_PX = 8;

const stepOf = (value: Option.Option<number>): number =>
  Option.getOrElse(
    Option.filter(value, (ms) => Number.isFinite(ms) && ms >= 0),
    () => STEP_MS,
  );

/**
 * The vertical distance a unit starts from, in pixels.
 *
 * A non-finite value would reach the runtime as `null` and drop the property, so
 * the unit would not move at all; the house offset is the honest fallback.
 */
export const offsetOf = (value: Option.Option<number>): number =>
  Option.getOrElse(Option.filter(value, Number.isFinite), () => OFFSET_PX);

/** The texts one line contributes, in paint order. */
const lineTexts = (line: string, mode: SplitMode): ReadonlyArray<string> =>
  mode === "words"
    ? Arr.filter(Str.split(line, /\s+/), Str.isNonEmpty)
    : Arr.map(Arr.fromIterable(line), (unit) =>
        unit === " " ? WORD_GAP : unit,
      );

/**
 * The lines and units of `text`, each unit with its stagger delay.
 *
 * The delay counts through the whole reveal, not per line, so a headline split
 * across two lines arrives in reading order.
 */
export const splitUnits = (
  text: string,
  options: SplitOptions = {},
): ReadonlyArray<SplitLine> => {
  const mode = options.mode ?? "words";
  const stepMs = stepOf(Option.fromNullishOr(options.stepMs));
  const from = options.from ?? "start";
  const texts = Arr.filter(
    Arr.map(Str.split(text, "\n"), (line) => lineTexts(line, mode)),
    Arr.isReadonlyArrayNonEmpty,
  );
  const total = Arr.reduce(texts, 0, (count, units) => count + units.length);
  const placed = Arr.mapAccum(texts, 0, (start, units) => [
    start + units.length,
    Arr.map(units, (unit, local) => ({
      key: `${start + local}:${unit}`,
      text: unit,
      delayMs: stagger(stepMs, start + local, total, from),
    })),
  ]);

  return Arr.map(placed[1], (units, index) => ({
    key: String(index),
    units,
  }));
};
