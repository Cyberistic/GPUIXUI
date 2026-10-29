/**
 * The media player's arithmetic and its transport vocabulary.
 *
 * The bugs these guard: a transport that divides by a zero-length clip, a
 * playhead that leaves its clip on a seek, a clock that prints `NaN`, a rate
 * that is not a rate, a buffered range that paints past the played one, and a
 * key that a focused control also activates so one press moves twice.
 *
 * The runtime has no `video` or `audio` host and no playback verb (the
 * playground's `media-frame-lifecycle` probe measured that), so a player is
 * composition: the caller supplies the picture each playhead stands on, and the
 * component owns the clock, the transport and the frame paint. This module
 * keeps every rule the chrome reads in one place, so the component, its
 * behaviour suite and the docs drawing cannot disagree.
 */

import { Match } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import * as Str from "effect/String";

/** The interval a playing clip advances its playhead by. */
export const MEDIA_TICK_MS = 100;

/** How far one arrow press seeks, and what the bar's two seek actions use. */
export const MEDIA_SEEK_STEP_MS = 1000;

/** How far `J`, `L` and Shift + arrow seek. */
export const MEDIA_LARGE_SEEK_STEP_MS = 10_000;

/** The playback rates the settings and rate menus offer, in order. */
export const MEDIA_RATES: ReadonlyArray<number> = [0.5, 1, 1.5, 2];

/** How much one volume key press moves the level. */
export const MEDIA_VOLUME_STEP = 0.05;

/** The popup the bar has open; only one can own the dismiss layer. */
export type MediaPopup = "volume" | "rate" | "settings";

/** What the transport is doing, and what the chrome says about it. */
export interface MediaState {
  readonly playing: boolean;
  readonly playhead: number;
  /** `0…1`, the level a player would hand its mixer. */
  readonly volume: number;
  readonly muted: boolean;
  readonly rate: number;
  /** The rendition the app last chose; empty until the app offers them. */
  readonly quality: string;
  readonly fullscreen: boolean;
  /** Whether the bar is painted, which the idle timer owns. */
  readonly controls: boolean;
  /** The popup that is open, if any. */
  readonly popup: MediaPopup | null;
}

/** One frame of the clip: the bytes the picture paints and their box. */
export interface MediaFrame {
  readonly width: number;
  readonly height: number;
  /** Straight RGBA bytes, `width * height * 4` of them. */
  readonly pixels: Uint8Array;
}

/** The frame a playhead stands on; `None` paints no new picture. */
export type MediaFrameAt = (playhead: number) => Option.Option<MediaFrame>;

/**
 * The frame source a saved player carries, or no source at all.
 *
 * Only a **function** is a frame source: a record writes `null` for a field it
 * never carried, so a restored player paints the audio-style surface instead of
 * throwing `frameAt is not a function` from the layout effect that paints each
 * playhead.
 */
export const frameAtOf = (
  value: MediaFrameAt | null | undefined,
): MediaFrameAt | undefined =>
  typeof value === "function" ? value : undefined;

/**
 * Whether a value is a frame the picture can paint.
 *
 * A frame is a decoder's output — a file's bytes, a generated sequence, a
 * record read back from storage — so it is read structurally rather than
 * trusted: a frame without bytes, with a partial buffer or with a box that
 * cannot be laid out paints no picture. Reading `pixels.length` first is the
 * bug this guard exists for: it threw out of the layout effect and took the
 * whole player down.
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

/** A stored volume as a share: unreadable reads as silence, and 1 is full. */
export const volumeOf = (volume: number): number =>
  Number.isFinite(volume) ? Math.min(Math.max(volume, 0), 1) : 0;

/** A stored playback rate; a value that is not a positive number reads as 1×. */
export const rateOf = (rate: number): number =>
  Number.isFinite(rate) && rate > 0 ? rate : 1;

/** A stored rendition the app still offers, or its first; empty when it offers none. */
export const qualityOf = (
  quality: string,
  qualities: ReadonlyArray<string>,
): string => {
  const trimmed = Str.trim(quality);
  if (Arr.length(qualities) === 0) return "";
  return Arr.contains(qualities, trimmed) ? trimmed : (qualities[0] ?? "");
};

/** The words a rate button prints: `1×`, `1.5×`. */
export const rateLabel = (rate: number): string => `${rateOf(rate)}×`;

/**
 * The whole state a caller's props describe, with every field read through the
 * rule its own type asks for. The component starts here and the tests build a
 * tree here, so neither can paint a state the other could not produce.
 */
export const restingState = (options: {
  readonly duration: number;
  readonly playhead?: number;
  readonly playing?: boolean;
  readonly volume?: number;
  readonly muted?: boolean;
  readonly rate?: number;
  readonly quality?: string;
  readonly qualities?: ReadonlyArray<string>;
  readonly fullscreen?: boolean;
  readonly controls?: boolean;
  readonly popup?: MediaPopup | null;
}): MediaState => ({
  playing: options.playing === true && durationOf(options.duration) > 0,
  playhead: clampPlayhead(options.playhead ?? 0, options.duration),
  volume: volumeOf(options.volume ?? 1),
  muted: options.muted === true,
  rate: rateOf(options.rate ?? 1),
  quality: qualityOf(options.quality ?? "", options.qualities ?? []),
  fullscreen: options.fullscreen === true,
  controls: options.controls !== false,
  popup: options.popup ?? null,
});

/**
 * Every move the chrome makes, held as data so the keyboard map and the
 * controls can read one vocabulary.
 */
export type MediaIntent =
  | { readonly kind: "toggle" }
  | { readonly kind: "seek"; readonly delta: number }
  | { readonly kind: "seekTo"; readonly edge: "start" | "end" }
  | { readonly kind: "volume"; readonly delta: number }
  | { readonly kind: "mute" }
  | { readonly kind: "fullscreen" };

/** The one action a play control performs. */
export const toggleIntent: MediaIntent = { kind: "toggle" };

/** A seek by `delta` milliseconds, held inside the clip when it is applied. */
export const seekIntent = (delta: number): MediaIntent => ({
  kind: "seek",
  delta,
});

/**
 * The intent a transport key names, or `None` for a key the player does not own.
 *
 * The map is Mux's: arrows seek by the caller's step, `J`/`L` (and Shift with
 * an arrow) by the large step, `Home`/`End` reach the ends, `Space`/`K` toggle,
 * `M` mutes, `F` goes fullscreen and `Up`/`Down` move the volume.
 */
export const playerIntent = (
  key: string,
  shift: boolean,
  seekStep: number,
  largeStep: number,
): Option.Option<MediaIntent> => {
  const small = stepOf(seekStep, MEDIA_SEEK_STEP_MS);
  const large = stepOf(largeStep, MEDIA_LARGE_SEEK_STEP_MS);
  return Match.value(key).pipe(
    Match.when("space", () => Option.some(toggleIntent)),
    Match.when("k", () => Option.some(toggleIntent)),
    Match.when("left", () => Option.some(seekIntent(shift ? -large : -small))),
    Match.when("right", () => Option.some(seekIntent(shift ? large : small))),
    Match.when("j", () => Option.some(seekIntent(-large))),
    Match.when("l", () => Option.some(seekIntent(large))),
    Match.when("home", () =>
      Option.some<MediaIntent>({ kind: "seekTo", edge: "start" }),
    ),
    Match.when("end", () =>
      Option.some<MediaIntent>({ kind: "seekTo", edge: "end" }),
    ),
    Match.when("up", () =>
      Option.some<MediaIntent>({ kind: "volume", delta: MEDIA_VOLUME_STEP }),
    ),
    Match.when("down", () =>
      Option.some<MediaIntent>({ kind: "volume", delta: -MEDIA_VOLUME_STEP }),
    ),
    Match.when("m", () => Option.some<MediaIntent>({ kind: "mute" })),
    Match.when("f", () => Option.some<MediaIntent>({ kind: "fullscreen" })),
    Match.orElse(() => Option.none()),
  );
};

/**
 * The transport's clock: whole seconds, floored, `m:ss`.
 *
 * A value that is not a number reads as the clip's start rather than as
 * `NaN:NaN` on a transport whose only job is to say where the reader is.
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

/** The painted share of a track, in points; a share of a box that cannot hold one is 0. */
const shareWidth = (share: number, track: number): number =>
  Number.isFinite(track) && track > 0 && Number.isFinite(share)
    ? Math.round(track * Math.min(Math.max(share, 0), 1))
    : 0;

/**
 * The painted share of the track the playhead has reached, in points.
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
  if (end === 0) return 0;
  return shareWidth(clampPlayhead(playhead, end) / end, track);
};

/**
 * The painted extent of the clip the app has in hand, in points.
 *
 * The buffered range is the caller's answer, not a guess: a player with no
 * source paints none, and a range past the clip's end is the clip's end.
 */
export const bufferedWidth = (
  buffered: number,
  duration: number,
  track: number,
): number => {
  const end = durationOf(duration);
  if (end === 0) return 0;
  return shareWidth(clampPlayhead(buffered, end) / end, track);
};

/** A transport key's payload, read structurally so a fixture can supply one. */
export interface MediaKey {
  readonly key?: string | null;
  readonly elementId?: number | null;
  readonly modifiers?: { readonly shift?: boolean } | null;
  readonly preventDefault?: () => void;
}

/** A pointer payload, read structurally so a fixture can supply one. */
export interface MediaPointer {
  readonly x?: number | null;
  /** Which button went down; `0` is the primary one. Absent reads as primary. */
  readonly button?: number | null;
  /** Which button a move is holding; a move holding none ends the scrub. */
  readonly pressedButton?: number | null;
}

/** The box a track paints, in window points. */
export interface MediaTrackBox {
  readonly x: number;
  readonly width: number;
}

/**
 * Whether a press may begin a scrub.
 *
 * A secondary press on the track is the reader asking for a context menu, not a
 * seek — the rule the crop frame follows. A payload that names no button is the
 * primary one, the only press a gesture begins on.
 */
export const isScrubPress = (button: number | null | undefined): boolean =>
  button === undefined || button === null || button === 0;

/** A press's share of a track, `0…1`, clamped to its ends; `None` for a box that cannot hold one. */
export const scrubShare = (
  x: number,
  track: MediaTrackBox,
): Option.Option<number> => {
  const width =
    Number.isFinite(track.width) && track.width > 0 ? track.width : 0;
  if (width === 0) return Option.none();
  const origin = Number.isFinite(track.x) ? track.x : 0;
  const at = Number.isFinite(x) ? x : origin;
  return Option.some(Math.min(Math.max((at - origin) / width, 0), 1));
};

/**
 * The playhead a press at `x` on the progress track asks for.
 *
 * The track is the clip's whole length, so a press's share of its width is the
 * share of the clip: a press outside the track clamps to its ends, and `None`
 * answers when the track or the clip cannot be laid out.
 */
export const scrubPlayhead = (
  x: number,
  track: MediaTrackBox,
  duration: number,
): Option.Option<number> => {
  const end = durationOf(duration);
  if (end === 0) return Option.none();
  return Option.map(scrubShare(x, track), (share) =>
    clampPlayhead(share * end, end),
  );
};

/** The rendered picture of the transport: the fill, the thumb and the clock. */
export interface MediaPaint {
  readonly played: number;
  readonly buffered: number;
  readonly thumb: number;
  readonly clock: string;
}

/** Everything the chrome paints for one state on one track. */
export const mediaPaint = (
  state: MediaState,
  buffered: number,
  duration: number,
  track: number,
  thumbSize: number,
): MediaPaint => {
  const played = progressWidth(state.playhead, duration, track);
  const thumb =
    Number.isFinite(track) && track > 0
      ? Math.min(
          Math.max(played - thumbSize / 2, 0),
          Math.max(track - thumbSize, 0),
        )
      : 0;
  return {
    played,
    buffered: Math.max(
      bufferedWidth(buffered, duration, track),
      progressWidth(state.playhead, duration, track),
    ),
    thumb,
    clock: timeLabel(state.playhead, duration),
  };
};
