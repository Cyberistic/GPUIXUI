import * as Option from "effect/Option";
import type { MediaFrame } from "@gpuixui/media/media-player";
import {
  frameColour,
  frameHex,
  framePixels,
  MEDIA_BUFFER,
  MEDIA_CLIP_MS,
  MEDIA_SEEK_STEP_MS,
} from "./media-frame.js";

export const PLAYER_IDS = {
  root: "media-player",
  poster: "media-poster",

  controls: "media-controls",
  scrim: "media-scrim",

  play: "media-play",
  playBar: "media-play-bar",

  trackHit: "media-track-hit",
  track: "media-track",
  fill: "media-fill",
  buffered: "media-buffered",
  thumb: "media-thumb",
  time: "media-time",
  mute: "media-mute",
  rate: "media-rate",
  settings: "media-settings",
  volume: "media-volume",
  fullscreen: "media-fullscreen",
  readout: "media-player-readout",
  disable: "media-player-disable",
} as const;

export const PLAYER_COMPONENT_IDS = [
  PLAYER_IDS.poster,
  PLAYER_IDS.controls,
  PLAYER_IDS.scrim,
  PLAYER_IDS.play,
  PLAYER_IDS.playBar,
  PLAYER_IDS.trackHit,
  PLAYER_IDS.track,
  PLAYER_IDS.fill,
  PLAYER_IDS.buffered,
  PLAYER_IDS.thumb,
  PLAYER_IDS.time,
  PLAYER_IDS.mute,
  PLAYER_IDS.rate,
  PLAYER_IDS.settings,
  PLAYER_IDS.volume,
  PLAYER_IDS.fullscreen,
] as const;

export const PLAYER_CLIP_MS = MEDIA_CLIP_MS;

export const PLAYER_SEEK_STEP_MS = MEDIA_SEEK_STEP_MS;

export const PLAYER_LARGE_SEEK_STEP_MS = 10_000;

export const PLAYER_POSTER = { width: 512, height: 288 } as const;

export const PLAYER_INSET = 8;

export const PLAYER_CHROME_HEIGHT = 80;

export const PLAYER_TRACK = {
  width: PLAYER_POSTER.width - PLAYER_INSET * 2,
  height: 4,
} as const;

export const PLAYER_BUFFERED = PLAYER_CLIP_MS / 2;

export const PLAYER_SCRUB_OFFSET = PLAYER_TRACK.width / 4;

export const PLAYER_TICK_MS = 250;

export const PLAYER_IDLE_MS = 400;

export const PLAYER_INK = "#EEF1F5";

export const PLAYER_PAGE = "#11141A";

export const frameAt = (playhead: number): Option.Option<MediaFrame> =>
  Option.some({
    width: MEDIA_BUFFER.width,
    height: MEDIA_BUFFER.height,
    pixels: framePixels(frameColour(playhead)),
  });

export { frameHex };

export interface PlayerReport {
  readonly playing: boolean;
  readonly playhead: number;
  readonly reports: number;
}

export const PLAYER_REST: PlayerReport = {
  playing: false,
  playhead: 0,
  reports: 0,
} as const;

export const playerReadout = (report: PlayerReport): string =>
  `playing=${report.playing} playhead=${report.playhead} reports=${report.reports}`;

export const playerReportOf = (
  readout: string,
): Option.Option<PlayerReport> => {
  const match = /^playing=(true|false) playhead=(\d+) reports=(\d+)$/.exec(
    readout,
  );
  if (match === null) return Option.none();
  const playhead = Number.parseInt(match[2] ?? "", 10);
  const reports = Number.parseInt(match[3] ?? "", 10);
  if (!Number.isInteger(playhead) || !Number.isInteger(reports)) {
    return Option.none();
  }
  return Option.some({
    playing: match[1] === "true",
    playhead,
    reports,
  });
};

export const PLAYER_CHECKS = 49;
