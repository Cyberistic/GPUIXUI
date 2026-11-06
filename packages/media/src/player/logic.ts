import { Match } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import * as Str from "effect/String";

export const MEDIA_TICK_MS = 100;

export const MEDIA_SEEK_STEP_MS = 1000;

export const MEDIA_LARGE_SEEK_STEP_MS = 10_000;

export const MEDIA_RATES: ReadonlyArray<number> = [0.5, 1, 1.5, 2];

export const MEDIA_VOLUME_STEP = 0.05;

export type MediaPopup = "volume" | "rate" | "settings";

export interface MediaState {
  readonly playing: boolean;
  readonly playhead: number;

  readonly volume: number;
  readonly muted: boolean;
  readonly rate: number;

  readonly quality: string;
  readonly fullscreen: boolean;

  readonly controls: boolean;

  readonly popup: MediaPopup | null;
}

export interface MediaFrame {
  readonly width: number;
  readonly height: number;

  readonly pixels: Uint8Array;
}

export type MediaFrameAt = (playhead: number) => Option.Option<MediaFrame>;

export const frameAtOf = (
  value: MediaFrameAt | null | undefined,
): MediaFrameAt | undefined =>
  typeof value === "function" ? value : undefined;

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

export const durationOf = (duration: number): number =>
  Number.isFinite(duration) && duration > 0 ? duration : 0;

export const stepOf = (value: number, fallback: number): number =>
  Number.isFinite(value) && value > 0 ? value : fallback;

export const clampPlayhead = (playhead: number, duration: number): number => {
  const end = durationOf(duration);
  const at = Number.isFinite(playhead) ? playhead : 0;
  return Math.min(Math.max(at, 0), end);
};

export const advancePlayhead = (
  playhead: number,
  delta: number,
  duration: number,
): number =>
  clampPlayhead(
    clampPlayhead(playhead, duration) + (Number.isFinite(delta) ? delta : 0),
    duration,
  );

export const isFinished = (playhead: number, duration: number): boolean =>
  durationOf(duration) > 0 && clampPlayhead(playhead, duration) >= duration;

export const volumeOf = (volume: number): number =>
  Number.isFinite(volume) ? Math.min(Math.max(volume, 0), 1) : 0;

export const rateOf = (rate: number): number =>
  Number.isFinite(rate) && rate > 0 ? rate : 1;

export const qualityOf = (
  quality: string,
  qualities: ReadonlyArray<string>,
): string => {
  const trimmed = Str.trim(quality);
  if (Arr.length(qualities) === 0) return "";
  return Arr.contains(qualities, trimmed) ? trimmed : (qualities[0] ?? "");
};

export const rateLabel = (rate: number): string => `${rateOf(rate)}×`;

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

export type MediaIntent =
  | { readonly kind: "toggle" }
  | { readonly kind: "seek"; readonly delta: number }
  | { readonly kind: "seekTo"; readonly edge: "start" | "end" }
  | { readonly kind: "volume"; readonly delta: number }
  | { readonly kind: "mute" }
  | { readonly kind: "fullscreen" };

export const toggleIntent: MediaIntent = { kind: "toggle" };

export const seekIntent = (delta: number): MediaIntent => ({
  kind: "seek",
  delta,
});

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

export const formatClock = (milliseconds: number): string => {
  const seconds = Number.isFinite(milliseconds)
    ? Math.max(0, Math.floor(milliseconds / 1000))
    : 0;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};

export const timeLabel = (playhead: number, duration: number): string =>
  `${formatClock(clampPlayhead(playhead, duration))} / ${formatClock(durationOf(duration))}`;

const shareWidth = (share: number, track: number): number =>
  Number.isFinite(track) && track > 0 && Number.isFinite(share)
    ? Math.round(track * Math.min(Math.max(share, 0), 1))
    : 0;

export const progressWidth = (
  playhead: number,
  duration: number,
  track: number,
): number => {
  const end = durationOf(duration);
  if (end === 0) return 0;
  return shareWidth(clampPlayhead(playhead, end) / end, track);
};

export const bufferedWidth = (
  buffered: number,
  duration: number,
  track: number,
): number => {
  const end = durationOf(duration);
  if (end === 0) return 0;
  return shareWidth(clampPlayhead(buffered, end) / end, track);
};

export interface MediaKey {
  readonly key?: string | null;
  readonly elementId?: number | null;
  readonly modifiers?: { readonly shift?: boolean } | null;
  readonly preventDefault?: () => void;
}

export interface MediaPointer {
  readonly x?: number | null;

  readonly button?: number | null;

  readonly pressedButton?: number | null;
}

export interface MediaTrackBox {
  readonly x: number;
  readonly width: number;
}

export const isScrubPress = (button: number | null | undefined): boolean =>
  button === undefined || button === null || button === 0;

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

export interface MediaPaint {
  readonly played: number;
  readonly buffered: number;
  readonly thumb: number;
  readonly clock: string;
}

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
