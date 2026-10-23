/**
 * What a clip can be on this runtime, and the arithmetic the
 * `media-frame-lifecycle` probe reads a window with.
 *
 * Tier 5's *Video / audio player + waveform* row says playback "needs a
 * platform surface — **unverified**". The typings answer half of it: there is
 * no `video` or `audio` intrinsic element, so there is no playback surface to
 * mount. The other half is what a player can still be built from, and no probe
 * had painted it: an `<img>` whose pixels are re-pushed frame by frame, an
 * app-owned clock, and a transport the app draws. That composition is what a
 * media card in this library would be, so the probe measures it rather than
 * leaving the row as a guess.
 *
 * The clip is four seconds divided into four frames of one colour each, so a
 * frame's colour names the playhead the picture is on: a still poster and a
 * moving picture are different measurements, and a buffer that never arrived
 * reads as the previous frame's colour rather than as "some pixels".
 */
import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { hexOf, type Rgb } from "./content.js";

/** The `testId`s the view and the steps share. */
export const MEDIA_IDS = {
  probe: "media-probe",
  poster: "media-poster",
  play: "media-play",
  seek: "media-seek",
  track: "media-track",
  fill: "media-fill",
  time: "media-time",
  readout: "media-readout",
} as const;

/** The clip the transport scrubs, in milliseconds. */
export const MEDIA_CLIP_MS = 4000;

/** The interval the app advances its own playhead by while playing. */
export const MEDIA_TICK_MS = 100;

/** How far one Left/Right press seeks. */
export const MEDIA_SEEK_STEP_MS = 1000;

/** The poster's painted box, in points. */
export const MEDIA_POSTER = { width: 240, height: 135 } as const;

/** The buffer behind it: a clip frame, not a screenshot. */
export const MEDIA_BUFFER = { width: 120, height: 68 } as const;

/** The progress track, and the fill a playhead paints on it. */
export const MEDIA_TRACK = { width: 200, height: 6 } as const;

/**
 * The fill's literal.
 *
 * A theme role could equal a frame's colour in a brand, and a count of it would
 * then read two paints as one; no shipped role or frame is this amber.
 */
export const MEDIA_FILL = "#FFD60A";

const FIRST: Rgb = { r: 0x1e, g: 0x3a, b: 0x8a };

/**
 * The four frames, one per second of the clip.
 *
 * Disjoint colours on purpose: the frame the window paints after a seek is only
 * proof if it cannot be the frame the reader already had.
 */
export const MEDIA_FRAMES: ReadonlyArray<Rgb> = [
  FIRST,
  { r: 0x7c, g: 0x3a, b: 0xed },
  { r: 0xb4, g: 0x53, b: 0x09 },
  { r: 0x04, g: 0x78, b: 0x57 },
];

/** The frame a playhead sits on: one colour per equal slice of the clip. */
export const frameIndex = (playhead: number): number =>
  Math.min(
    MEDIA_FRAMES.length - 1,
    Math.max(0, Math.floor((playhead / MEDIA_CLIP_MS) * MEDIA_FRAMES.length)),
  );

/** The colour of the frame a playhead paints. */
export const frameColour = (playhead: number): Rgb =>
  MEDIA_FRAMES[frameIndex(playhead)] ?? FIRST;

/** The same frame as the `#rrggbb` a capture is counted with. */
export const frameHex = (playhead: number): string =>
  hexOf(frameColour(playhead));

/** One frame as the straight-RGBA bytes `setImagePixels` takes. */
export const framePixels = (colour: Rgb): Uint8Array =>
  Uint8Array.from(
    Arr.flatten(
      Arr.makeBy(MEDIA_BUFFER.width * MEDIA_BUFFER.height, () => [
        colour.r,
        colour.g,
        colour.b,
        0xff,
      ]),
    ),
  );

/** A playhead moved by `delta`, clamped to the clip at both ends. */
export const advancePlayhead = (playhead: number, delta: number): number =>
  Math.min(MEDIA_CLIP_MS, Math.max(0, playhead + delta));

/** Whether the clip has run out, the point the transport stops itself at. */
export const isFinished = (playhead: number): boolean =>
  playhead >= MEDIA_CLIP_MS;

/** The transport's clock: whole seconds, floored, `m:ss`. */
export const formatTime = (ms: number): string => {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};

/** The readout a transport prints: the position and the clip's own length. */
export const timeLabel = (playhead: number): string =>
  `${formatTime(playhead)} / ${formatTime(MEDIA_CLIP_MS)}`;

/** The painted share of the track, in points. */
export const fillWidth = (
  playhead: number,
  track: number = MEDIA_TRACK.width,
): number =>
  Math.round(
    (track * Math.min(Math.max(playhead, 0), MEDIA_CLIP_MS)) / MEDIA_CLIP_MS,
  );

/** What the transport's own readout prints. */
export interface MediaState {
  readonly playing: boolean;
  readonly playhead: number;
}

/** The readout's one spelling, so the probe and its record print the same line. */
export const mediaReadout = (state: MediaState): string =>
  `playing=${state.playing} playhead=${state.playhead}`;

/** The transport before any press. */
export const MEDIA_REST: MediaState = { playing: false, playhead: 0 } as const;

/** The playhead a readout names, or `None` when it prints something else. */
export const playheadOf = (readout: string): Option.Option<number> =>
  pipe(
    Option.fromNullishOr(/playhead=(\d+)/.exec(readout)?.[1]),
    Option.flatMap((digits) => {
      const value = Number.parseInt(digits, 10);
      return Number.isInteger(value) ? Option.some(value) : Option.none();
    }),
  );

/**
 * The checks the probe asserts, as the run reports them.
 *
 * Larger than the steps' own assertion sites because three closures assert once
 * per call: `boxOf` (one box), `paintOf` (one capture + one count) and
 * `seekKey` (one seek + one label read).
 */
export const MEDIA_CHECKS = 48;
