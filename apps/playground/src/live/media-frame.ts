import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { hexOf, type Rgb } from "./content.js";

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

export const MEDIA_CLIP_MS = 4000;

export const MEDIA_TICK_MS = 100;

export const MEDIA_SEEK_STEP_MS = 1000;

export const MEDIA_POSTER = { width: 240, height: 135 } as const;

export const MEDIA_BUFFER = { width: 120, height: 68 } as const;

export const MEDIA_TRACK = { width: 200, height: 6 } as const;

export const MEDIA_FILL = "#FFD60A";

const FIRST: Rgb = { r: 0x1e, g: 0x3a, b: 0x8a };

export const MEDIA_FRAMES: ReadonlyArray<Rgb> = [
  FIRST,
  { r: 0x7c, g: 0x3a, b: 0xed },
  { r: 0xb4, g: 0x53, b: 0x09 },
  { r: 0x04, g: 0x78, b: 0x57 },
];

export const frameIndex = (playhead: number): number =>
  Math.min(
    MEDIA_FRAMES.length - 1,
    Math.max(0, Math.floor((playhead / MEDIA_CLIP_MS) * MEDIA_FRAMES.length)),
  );

export const frameColour = (playhead: number): Rgb =>
  MEDIA_FRAMES[frameIndex(playhead)] ?? FIRST;

export const frameHex = (playhead: number): string =>
  hexOf(frameColour(playhead));

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

export const advancePlayhead = (playhead: number, delta: number): number =>
  Math.min(MEDIA_CLIP_MS, Math.max(0, playhead + delta));

export const isFinished = (playhead: number): boolean =>
  playhead >= MEDIA_CLIP_MS;

export const formatTime = (ms: number): string => {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};

export const timeLabel = (playhead: number): string =>
  `${formatTime(playhead)} / ${formatTime(MEDIA_CLIP_MS)}`;

export const fillWidth = (
  playhead: number,
  track: number = MEDIA_TRACK.width,
): number =>
  Math.round(
    (track * Math.min(Math.max(playhead, 0), MEDIA_CLIP_MS)) / MEDIA_CLIP_MS,
  );

export interface MediaState {
  readonly playing: boolean;
  readonly playhead: number;
}

export const mediaReadout = (state: MediaState): string =>
  `playing=${state.playing} playhead=${state.playhead}`;

export const MEDIA_REST: MediaState = { playing: false, playhead: 0 } as const;

export const playheadOf = (readout: string): Option.Option<number> =>
  pipe(
    Option.fromNullishOr(/playhead=(\d+)/.exec(readout)?.[1]),
    Option.flatMap((digits) => {
      const value = Number.parseInt(digits, 10);
      return Number.isInteger(value) ? Option.some(value) : Option.none();
    }),
  );

export const MEDIA_CHECKS = 48;
