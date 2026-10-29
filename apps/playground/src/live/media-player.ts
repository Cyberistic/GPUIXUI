/**
 * What the shipped `MediaPlayer` paints, and the readings a window can prove.
 *
 * The `media-frame-lifecycle` probe measured what a clip can be **composed**
 * from on this runtime: an image buffer the app re-pushes, an interval the app
 * owns and a transport the app draws. That is the route, not the wrapper — the
 * library ships `MediaPlayer` (`@gpuixui/media`), and nothing had ever painted
 * it in a window, so every claim the package made about its own chrome was held
 * only by the package's own renderer suite.
 *
 * This fixture gives the shipped player the **same clip** the composition
 * probe measures, so the two routes can be compared: the frame schedule, the
 * buffer and the four frame colours come from `media-frame.ts`, and what is new
 * here is the shipped component's own ids, its buffered range and the report
 * the player makes to its caller.
 *
 * Every rule the probe asserts is the **package's** rule: the clock, the
 * fill's share, the buffered share and the rate label come from
 * `@gpuixui/media/player/logic`, so the window is read against the arithmetic
 * the component ships rather than a copy of it.
 */
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
  /** The chrome's bottom bar and the scrim behind it. */
  controls: "media-controls",
  scrim: "media-scrim",
  /** The large centred action, and the small one in the bar. */
  play: "media-play",
  playBar: "media-play-bar",
  /** The 24-point band around the rail; the rail itself is pointer-transparent. */
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

/** The ids the shipped component paints, without the probe's own two. */
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

/** The clip the shipped player plays. */
export const PLAYER_CLIP_MS = MEDIA_CLIP_MS;

/** How far one Left/Right press seeks. */
export const PLAYER_SEEK_STEP_MS = MEDIA_SEEK_STEP_MS;

/** How far `J`, `L` and Shift + arrow seek. */
export const PLAYER_LARGE_SEEK_STEP_MS = 10_000;

/** The picture's painted box: 16:9, wide enough for Mux's whole bar. */
export const PLAYER_POSTER = { width: 512, height: 288 } as const;

/** The insets the bar paints at, from the live theme's own spacing. */
export const PLAYER_INSET = 8;

/**
 * The bottom strip the chrome covers: the scrim plus the bar. The picture is
 * counted above it, where the frame is not under a control.
 */
export const PLAYER_CHROME_HEIGHT = 80;

/** The timeline the shipped player draws: the frame less the bar's two insets. */
export const PLAYER_TRACK = {
  width: PLAYER_POSTER.width - PLAYER_INSET * 2,
  height: 4,
} as const;

/** The part of the clip the app has in hand, painted as the buffered range. */
export const PLAYER_BUFFERED = PLAYER_CLIP_MS / 2;

/**
 * Where the scrub's press lands, in points from the band's centre.
 *
 * The band is the clip's whole length, so its centre is half the clip and a
 * quarter more is three quarters — the same playhead the transport's three
 * `Right` presses reach, so the scrub is read against a share the same window
 * already painted. The drag reuses the offset as its travel, ending on the
 * band's trailing edge, which is the clip's end.
 */
export const PLAYER_SCRUB_OFFSET = PLAYER_TRACK.width / 4;

/**
 * The player's own tick: the component advances the playhead by this much on
 * every interval, and the interval is this long.
 *
 * 250 ms rather than the shipped 100 ms default, so the clip's first frame
 * boundary (a second) arrives inside the probe's poll budget on this host,
 * where the window's paint rate paces the interval.
 */
export const PLAYER_TICK_MS = 250;

/** How long the chrome stays after the last activity in the probe. */
export const PLAYER_IDLE_MS = 400;

/** The ink the bar paints its clock in: the live window's dark `foreground`. */
export const PLAYER_INK = "#EEF1F5";

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
export const PLAYER_CHECKS = 49;
