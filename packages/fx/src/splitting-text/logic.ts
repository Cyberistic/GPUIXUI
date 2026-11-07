import { stagger, type StaggerFrom } from "@gpuixui/motion/timeline";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";

export type SplitMode = "words" | "characters";

export interface SplitUnit {
  readonly key: string;
  readonly text: string;

  readonly delayMs: number;
}

export interface SplitLine {
  readonly key: string;
  readonly units: ReadonlyArray<SplitUnit>;
}

export interface SplitOptions {
  readonly mode?: SplitMode;

  readonly stepMs?: number;

  readonly from?: StaggerFrom;
}

const WORD_GAP = "\u00A0";

const STEP_MS = 40;

const OFFSET_PX = 8;

const stepOf = (value: Option.Option<number>): number =>
  Option.getOrElse(
    Option.filter(value, (ms) => Number.isFinite(ms) && ms >= 0),
    () => STEP_MS,
  );

export const offsetOf = (value: Option.Option<number>): number =>
  Option.getOrElse(Option.filter(value, Number.isFinite), () => OFFSET_PX);

const lineTexts = (line: string, mode: SplitMode): ReadonlyArray<string> =>
  mode === "words"
    ? Arr.filter(Str.split(line, /\s+/), Str.isNonEmpty)
    : Arr.map(Arr.fromIterable(line), (unit) =>
        unit === " " ? WORD_GAP : unit,
      );

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
