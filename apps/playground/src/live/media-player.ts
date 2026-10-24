/**
 * What the shipped `MediaPlayer` paints, and the readings a window can prove.
 *
 * The `media-frame-lifecycle` probe measured what a clip can be **composed**
 * from on this runtime: an image buffer the app re-pushes, an interval the app
 * owns and a transport the app draws. That is the route, not the wrapper — the
 * library ships `MediaPlayer` (`@gpuixui/media`), and nothing had ever painted
 * it in a window, so every claim the package made about its own transport was
 * held only by the package's own renderer suite.
 *
 * This fixture gives the shipped player the **same clip** the composition
 * probe measures, so the two routes can be compared: the frame schedule, the
 * buffer and the four frame colours come from `media-frame.ts`, and what is
 * new here is the shipped component's own ids, the waveform's samples and the
 * report the player makes to its caller.
 *
 * Every rule the probe asserts is the **package's** rule: the clock and the
 * fill's share come from `@gpuixui/media/player/logic`, so the window is read
 * against the arithmetic the component ships rather than a copy of it.
 */
import * as Option from "effect/Option";
import type { MediaFrame } from "@gpuixui/media/media-player";
import {
  frameColour,
  frameHex,
  framePixels,
  MEDIA_BUFFER,
  MEDIA_CLIP_MS,
  MEDIA_POSTER,
  MEDIA_SEEK_STEP_MS,
  MEDIA_TRACK,
} from "./media-frame.js";

/**
 * The ids the shipped `MediaPlayer` paints, and the two the probe owns.
 *
 * The component hard-codes its own ids, so they are named here once and the
 * guard holds them against the package's source: a rename there has to fail
 * the probe's own test rather than time out in a window.
 */
export const PLAYER_IDS = {
  root: "media-player",
  poster: "media-poster",
  waveform: "media-waveform",
  play: "media-play",
  track: "media-track",
  fill: "media-fill",
  time: "media-time",
  seek: "media-seek",
  readout: "media-player-readout",
  disable: "media-player-disable",
} as const;

/** The ids the shipped component paints, without the probe's own two. */
export const PLAYER_COMPONENT_IDS = [
  PLAYER_IDS.poster,
  PLAYER_IDS.waveform,
  PLAYER_IDS.play,
  PLAYER_IDS.track,
  PLAYER_IDS.fill,
  PLAYER_IDS.time,
  PLAYER_IDS.seek,
] as const;

/** The clip the shipped player plays. */
export const PLAYER_CLIP_MS = MEDIA_CLIP_MS;

/** How far one Left/Right press seeks. */
export const PLAYER_SEEK_STEP_MS = MEDIA_SEEK_STEP_MS;

/** The picture's painted box. */
export const PLAYER_POSTER = MEDIA_POSTER;

/** The progress track the shipped player draws. */
export const PLAYER_TRACK = MEDIA_TRACK;

/**
 * The player's own tick: the component advances the playhead by this much on
 * every interval, and the interval is this long.
 *
 * 250 ms rather than the shipped 100 ms default, so the clip's first frame
 * boundary (a second) arrives inside the probe's poll budget on this host,
 * where the window's paint rate paces the interval.
 */
export const PLAYER_TICK_MS = 250;

/**
 * The waveform's painted box: the track's width and the height the component
 * draws its silhouette in.
 */
export const PLAYER_WAVEFORM = { width: 200, height: 32 } as const;

/**
 * The clip's amplitude samples, drawn as the waveform's silhouette.
 *
 * The loudest sample is below 1 on purpose: the silhouette's own outline then
 * stays inside its box, so a waveform that painted a filled rectangle would
 * fail the reading of the box's first and last rows.
 */
export const PLAYER_PEAKS: ReadonlyArray<number> = [
  0.15, 0.55, 0.8, 0.3, 0.65, 0.2, 0.45, 0.1,
];

/**
 * The ink the waveform paints: the live window's dark palette's
 * `mutedForeground`, which is the colour the shipped component tints the mask
 * with. The guard holds it against the token package, so a palette change
 * cannot leave the probe counting a colour the window stopped painting.
 */
export const PLAYER_WAVEFORM_INK = "#C1C7D1";

/** The page behind the player, in the same palette. */
export const PLAYER_PAGE = "#11141A";

/** The frame each playhead stands on: the clip's own schedule, as bytes. */
export const frameAt = (playhead: number): Option.Option<MediaFrame> =>
  Option.some({
    width: MEDIA_BUFFER.width,
    height: MEDIA_BUFFER.height,
    pixels: framePixels(frameColour(playhead)),
  });

/** The colour the frame a playhead stands on paints. */
export { frameHex };

/** What the probe's page records of the player's own reports. */
export interface PlayerReport {
  readonly playing: boolean;
  readonly playhead: number;
  readonly reports: number;
}

/** The transport before it has moved. */
export const PLAYER_REST: PlayerReport = {
  playing: false,
  playhead: 0,
  reports: 0,
} as const;

/** The readout's one spelling, so the probe and its record print the same line. */
export const playerReadout = (report: PlayerReport): string =>
  `playing=${report.playing} playhead=${report.playhead} reports=${report.reports}`;

/** The report a readout names, or `None` when it prints something else. */
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

/**
 * The checks the window run made, on 0.11.0 here.
 *
 * The probe's helpers assert per call, so the sites in its steps are fewer than
 * the checks a run reports; this is the number the run printed and the README
 * teaches.
 */
export const PLAYER_CHECKS = 51;
