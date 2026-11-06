import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Order from "effect/Order";
import * as Str from "effect/String";

export interface ContentFrame {
  readonly frame: number;
  readonly milliseconds: number;
  readonly pixels: number;
}

export interface Summary {
  readonly median: number;
  readonly lowerQuartile: number;
  readonly upperQuartile: number;
}

const parseFrame = (
  line: string,
  spawnedAtUs: number,
): Option.Option<ContentFrame> => {
  const [tag, frame, at, pixels] = Str.split(line, " ");
  return tag === "frame" &&
    frame !== undefined &&
    at !== undefined &&
    pixels !== undefined
    ? Option.some({
        frame: Number(frame),
        milliseconds: (Number(at) - spawnedAtUs) / 1000,
        pixels: Number(pixels),
      })
    : Option.none();
};

export const firstContentFrame = (
  lines: ReadonlyArray<string>,
  spawnedAtUs: number,
): Option.Option<ContentFrame> =>
  Arr.findFirst(
    Arr.getSomes(Arr.map(lines, (line) => parseFrame(line, spawnedAtUs))),
    (frame) => frame.pixels > 0,
  );

const at = (sorted: ReadonlyArray<number>, fraction: number): number =>
  Option.getOrElse(
    Arr.get(sorted, Math.floor((sorted.length - 1) * fraction)),
    () => Number.NaN,
  );

export const summarize = (samples: ReadonlyArray<number>): Summary => {
  const sorted = Arr.sort(samples, Order.Number);
  return {
    median: at(sorted, 0.5),
    lowerQuartile: at(sorted, 0.25),
    upperQuartile: at(sorted, 0.75),
  };
};
