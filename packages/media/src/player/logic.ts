/**
 * The media player's arithmetic: the playhead a clock can hold, the step a
 * transport key asks for, the words it prints and the waveform it draws.
 *
 * The runtime has no `video` or `audio` host and no playback verb (the
 * playground's `media-frame-lifecycle` probe measured that), so a player is
 * composition: the caller supplies the picture each playhead stands on and the
 * clip's amplitude samples, and the component owns the clock, the transport and
 * the frame paint. This module keeps the arithmetic out of the component so the
 * interval, the keys, the painted fill and the waveform read one rule.
 */

import { Match } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";

/** The interval a playing clip advances its playhead by. */
export const MEDIA_TICK_MS = 100;

/** How far one Left/Right press seeks. */
export const MEDIA_SEEK_STEP_MS = 1000;

/** What the transport is doing: its clock and whether it is running. */
export interface MediaState {
  readonly playing: boolean;
  readonly playhead: number;
}

/** One frame of the clip: the bytes the picture paints and their box. */
export interface MediaFrame {
  readonly width: number;
  readonly height: number;
  /** Straight RGBA bytes, `width * height * 4` of them. */
  readonly pixels: Uint8Array;
}

/**
 * Whether a value is a frame the picture can paint.
 *
 * A frame is a decoder's output — a file's bytes, a generated sequence, a
 * record read back from storage — so it is read structurally rather than
 * trusted: a decoder that answered no bytes, a partial buffer, a box that
 * cannot be laid out or a value that is not a frame at all paints no picture.
 * Reading `pixels.length` first is the bug this guard exists for: a frame
 * without bytes threw out of the layout effect and took the whole player down.
 */
export const isFrame = (frame: unknown): frame is MediaFrame => {
  if (!P.isObject(frame)) return false;
  const width: unknown = frame.width;
  const height: unknown = frame.height;
  const pixels: unknown = frame.pixels;
  return (
    P.isNumber(width) &&
    width > 0 &&
    P.isNumber(height) &&
    height > 0 &&
    pixels instanceof Uint8Array &&
    pixels.length >= width * height * 4
  );
};

/**
 * The clip's length a clock can hold. A stored duration that is not a positive
 * number reads as zero, so a saved record cannot poison every share the
 * transport divides by it.
 */
export const durationOf = (duration: number): number =>
  Number.isFinite(duration) && duration > 0 ? duration : 0;

/** A duration or interval a stored value names, or the default. */
export const stepOf = (value: number, fallback: number): number =>
  Number.isFinite(value) && value > 0 ? value : fallback;

/** A playhead held inside the clip; a value that is not a number reads as its start. */
export const clampPlayhead = (playhead: number, duration: number): number => {
  const end = durationOf(duration);
  const at = Number.isFinite(playhead) ? playhead : 0;
  return Math.min(Math.max(at, 0), end);
};

/** A playhead moved by `delta`, held inside the clip at both ends. */
export const advancePlayhead = (
  playhead: number,
  delta: number,
  duration: number,
): number =>
  clampPlayhead(
    clampPlayhead(playhead, duration) + (Number.isFinite(delta) ? delta : 0),
    duration,
  );

/** Whether the clip has run out — the point the transport stops itself at. */
export const isFinished = (playhead: number, duration: number): boolean =>
  durationOf(duration) > 0 && clampPlayhead(playhead, duration) >= duration;

/**
 * The transport's clock: whole seconds, floored, `m:ss`.
 *
 * A value that is not a number reads as the clip's start rather than as `NaN:NaN`
 * on a transport whose only job is to say where the reader is.
 */
export const formatClock = (milliseconds: number): string => {
  const seconds = Number.isFinite(milliseconds)
    ? Math.max(0, Math.floor(milliseconds / 1000))
    : 0;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};

/** The readout a transport prints: where it is, and the clip's own length. */
export const timeLabel = (playhead: number, duration: number): string =>
  `${formatClock(clampPlayhead(playhead, duration))} / ${formatClock(durationOf(duration))}`;

/**
 * The painted share of the track, in points.
 *
 * A track that cannot be laid out paints no fill, and a clip with no length has
 * no share to paint: a stored `duration: 0` must not divide the width by zero.
 */
export const progressWidth = (
  playhead: number,
  duration: number,
  track: number,
): number => {
  const end = durationOf(duration);
  const width = Number.isFinite(track) && track > 0 ? track : 0;
  if (end === 0 || width === 0) return 0;
  return Math.round((width * clampPlayhead(playhead, end)) / end);
};

/** A transport key's payload, read structurally so a fixture can supply one. */
export interface MediaKey {
  readonly key?: string | null;
  readonly preventDefault?: () => void;
}

/**
 * The playhead a transport key asks for; `None` for a key the pad does not own.
 *
 * Home and End reach the clip's own ends; Left and Right seek by the step, held
 * inside the clip like every other move. A step that cannot be read falls back
 * to {@link MEDIA_SEEK_STEP_MS} rather than moving the playhead by `NaN`.
 */
export const seekPlayhead = (
  playhead: number,
  key: string,
  step: number,
  duration: number,
): Option.Option<number> => {
  const stride = stepOf(step, MEDIA_SEEK_STEP_MS);
  return Match.value(key).pipe(
    Match.when("home", () => Option.some(0)),
    Match.when("end", () => Option.some(durationOf(duration))),
    Match.when("left", () =>
      Option.some(advancePlayhead(playhead, -stride, duration)),
    ),
    Match.when("right", () =>
      Option.some(advancePlayhead(playhead, stride, duration)),
    ),
    Match.orElse(() => Option.none()),
  );
};

/** A share read as a waveform sample: `0…1`, with anything unreadable at zero. */
const sampleOf = (value: number): number =>
  Number.isFinite(value) ? Math.min(Math.max(value, 0), 1) : 0;

/**
 * The samples a waveform draws, read at the boundary.
 *
 * A clip's `peaks` arrive from a saved record as often as from a decode: a
 * store writes `null` where it carried no samples, and a shape from an older
 * release may be any JSON value at all. The waveform is drawn from a list, so
 * anything else is no waveform — the rule the level, the quiet zone and the
 * duration already follow — and a sample that is not a number draws silence
 * rather than a path full of `NaN` that paints nothing.
 */
export const peaksOf = (value: unknown): ReadonlyArray<number> =>
  Arr.isArray(value)
    ? Arr.map(value, (sample) => (P.isNumber(sample) ? sample : 0))
    : [];

/** A coordinate printed at a hundredth of a point, so a path is stable. */
const round2 = (value: number): number => Math.round(value * 100) / 100;

/**
 * The silhouette of a waveform, as one tinted `<svg>` source.
 *
 * The runtime's `<svg>` takes one mask and one tint (the route
 * `content-surfaces` measured), so the clip's amplitude samples become a closed
 * path mirrored about the middle. An empty sample set, or a box that cannot be
 * laid out, paints nothing — an outline of zero area is not a waveform.
 */
export const waveformSvg = (
  peaks: ReadonlyArray<number>,
  width: number,
  height: number,
): string => {
  const boxWidth = Number.isFinite(width) && width > 0 ? width : 0;
  const boxHeight = Number.isFinite(height) && height > 0 ? height : 0;
  if (Arr.length(peaks) === 0 || boxWidth === 0 || boxHeight === 0) return "";
  const middle = boxHeight / 2;
  const step = boxWidth / peaks.length;
  const tops = Arr.map(peaks, (peak, index) => ({
    x: round2(step * (index + 0.5)),
    y: round2(middle - middle * sampleOf(peak)),
  }));
  const path = [
    `M 0 ${round2(middle)}`,
    ...Arr.map(tops, (point) => `L ${point.x} ${point.y}`),
    `L ${round2(boxWidth)} ${round2(middle)}`,
    ...Arr.map(
      Arr.reverse(tops),
      (point) => `L ${point.x} ${round2(2 * middle - point.y)}`,
    ),
    "Z",
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${round2(boxWidth)} ${round2(boxHeight)}"><path fill="#000" d="${Arr.join(path, " ")}"/></svg>`;
};
