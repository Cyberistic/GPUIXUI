/**
 * The diff's word-level wash: the run of pixels that changes between a
 * `wordDiff` off frame and its on frame (plan `707`).
 *
 * The runtime paints a 28 % tint of `diff_add`/`diff_del` under only the
 * changed token, so the two frames differ in one contiguous horizontal run on
 * each changed row and nowhere else. The finder reports the run's strongest
 * sample, never an ink pixel. It never needs the runtime's private blend: the
 * caller asserts the tint's direction and its extent.
 */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";

/** A logical row band in window coordinates. */
export interface RowBand {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** One horizontal run that changed between two frames. */
export interface WashRun {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly before: Pixels.Rgba;
  readonly after: Pixels.Rgba;
}

/** The change per channel, `after - before`. */
export const channelDeltas = (
  before: Pixels.Rgba,
  after: Pixels.Rgba,
): { readonly r: number; readonly g: number; readonly b: number } => ({
  r: after.r - before.r,
  g: after.g - before.g,
  b: after.b - before.b,
});

interface Sample {
  readonly x: number;
  readonly before: Pixels.Rgba;
  readonly after: Pixels.Rgba;
}

const sampleRow = (
  before: Pixels.Pixels,
  after: Pixels.Pixels,
  window: Pixels.FrameSize,
  row: RowBand,
  y: number,
): ReadonlyArray<Sample> =>
  Arr.getSomes(
    Arr.map(Arr.range(row.x, row.x + row.width - 1), (x) =>
      Option.flatMap(Pixels.framePoint(before, window, x, y), (left) =>
        Option.flatMap(Pixels.framePoint(after, window, x, y), (right) =>
          Option.map(
            Option.all([
              Pixels.pixelAt(before, left.x, left.y),
              Pixels.pixelAt(after, right.x, right.y),
            ]),
            ([beforePixel, afterPixel]) => ({
              x,
              before: beforePixel,
              after: afterPixel,
            }),
          ),
        ),
      ),
    ),
  );

const magnitude = (sample: Sample): number => {
  const deltas = channelDeltas(sample.before, sample.after);
  return Math.abs(deltas.r) + Math.abs(deltas.g) + Math.abs(deltas.b);
};

const strongest = (run: ReadonlyArray<Sample>): Option.Option<Sample> =>
  Option.map(Arr.head(run), (first) =>
    Arr.reduce(run, first, (best, sample) =>
      magnitude(sample) > magnitude(best) ? sample : best,
    ),
  );

/** Group changed samples into maximal runs of consecutive columns. */
const groupRuns = (
  samples: ReadonlyArray<Sample>,
): ReadonlyArray<ReadonlyArray<Sample>> =>
  Arr.reduce(samples, Arr.empty<ReadonlyArray<Sample>>(), (runs, sample) => {
    const previous = Arr.last(runs);
    return Option.match(previous, {
      onNone: () => [[sample]],
      onSome: (run) =>
        Option.match(Arr.last(run), {
          onNone: () => Arr.append(runs, [sample]),
          onSome: (last) =>
            sample.x - last.x === 1
              ? Arr.append(Arr.dropRight(runs, 1), Arr.append(run, sample))
              : Arr.append(runs, [sample]),
        }),
    });
  });

const onUniformBackground = (run: ReadonlyArray<Sample>): boolean =>
  Option.match(Arr.head(run), {
    onNone: () => false,
    onSome: (first) =>
      Arr.every(run, (sample) =>
        Pixels.rgbaNear(sample.before, first.before, 2),
      ),
  });

const toRun = (
  group: ReadonlyArray<Sample>,
  y: number,
): Option.Option<WashRun> =>
  Option.map(
    Option.all([Arr.head(group), Arr.last(group), strongest(group)]),
    ([first, last, sample]) => ({
      x: first.x,
      y,
      width: last.x - first.x + 1,
      before: sample.before,
      after: sample.after,
    }),
  );

const wider = (
  best: Option.Option<WashRun>,
  candidate: WashRun,
): Option.Option<WashRun> =>
  Option.match(best, {
    onNone: () => Option.some(candidate),
    onSome: (current) =>
      Option.some(candidate.width > current.width ? candidate : current),
  });

/**
 * The widest horizontal run inside `row` whose pixels changed between the two
 * frames while sitting on one uniform background.
 *
 * `None` when no run reaches `minWidth`. Both frames must come from the same
 * window; the caller has already captured them from one render.
 */
export const findWashRun = (
  before: Pixels.Pixels,
  after: Pixels.Pixels,
  window: Pixels.FrameSize,
  row: RowBand,
  options: { readonly minWidth?: number; readonly minDelta?: number } = {},
): Option.Option<WashRun> => {
  const minWidth = options.minWidth ?? 3;
  const minDelta = options.minDelta ?? 9;
  return Arr.reduce(
    Arr.range(row.y, row.y + row.height - 1),
    Option.none<WashRun>(),
    (best, y) =>
      Arr.reduce(
        groupRuns(
          Arr.filter(
            sampleRow(before, after, window, row, y),
            (sample) => magnitude(sample) >= minDelta,
          ),
        ),
        best,
        (found, group) =>
          Option.match(toRun(group, y), {
            onNone: () => found,
            onSome: (run) =>
              run.width >= minWidth && onUniformBackground(group)
                ? wider(found, run)
                : found,
          }),
      ),
  );
};
