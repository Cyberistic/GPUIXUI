/**
 * Holds the `media-player-lifecycle` fixture, the probe that paints it and the
 * section the README records it in.
 *
 * The gap this guards: `@gpuixui/media` ships `MediaPlayer`, and every claim
 * its package makes about the transport — the clock, the fill's share, the seek
 * keys, the disabled refusal — was held only by the offscreen renderer.
 * `media-frame-lifecycle` measured the route a clip can be *composed* from; this
 * probe paints the **shipped wrapper** in a window. The fixture's ids, its clip
 * and its geometry only mean something if they are the component's own, so this
 * suite reads them out of the package sources: a rename there has to fail here
 * rather than time out in a window.
 *
 * `node:fs` is deliberate, as in the other live fixtures: this reads the
 * repository's own probe, package and prose, never a runtime path.
 */
import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  MEDIA_SEEK_STEP_MS,
  MEDIA_TICK_MS,
  timeLabel,
} from "@gpuixui/media/player/logic";
import { darkTheme } from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";
import { liveRegistry } from "./registry.js";
import {
  frameAt,
  frameHex,
  PLAYER_CHECKS,
  PLAYER_CLIP_MS,
  PLAYER_COMPONENT_IDS,
  PLAYER_IDS,
  PLAYER_PAGE,
  PLAYER_PEAKS,
  PLAYER_POSTER,
  PLAYER_REST,
  PLAYER_SEEK_STEP_MS,
  PLAYER_TICK_MS,
  PLAYER_TRACK,
  PLAYER_WAVEFORM,
  PLAYER_WAVEFORM_INK,
  playerReadout,
  playerReportOf,
} from "./media-player.js";
import {
  frameColour,
  framePixels,
  MEDIA_BUFFER,
  MEDIA_POSTER,
  MEDIA_TRACK,
} from "./media-frame.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const probe = read("./media-player-probe.tsx");
const scenarios = read("./scenarios.tsx");
const readme = read("../../README.md");
const component = read("../../../../packages/media/src/media-player.tsx");

/** One `const NAME = <number>;` the shipped component declares. */
const numberIn = (name: string): number => {
  const match = new RegExp(`const ${name} = (\\d+);`).exec(component);
  return Number(match?.[1] ?? Number.NaN);
};

/** The probe's own steps, so a count cannot be read out of another probe. */
const stepsOf = (): string => {
  const start = probe.indexOf("export const mediaPlayerSteps");
  return start === -1 ? "" : probe.slice(start);
};

/** This probe's README section, so a value printed elsewhere cannot pass. */
const sectionOf = (): string => {
  const heading = "### `media-player-lifecycle` — measured on 0.11.0 here";
  const start = readme.indexOf(heading);
  if (start === -1) return "";
  const end = readme.indexOf("\n## ", start + 1);
  return readme.slice(start, end === -1 ? undefined : end);
};

describe("the shipped component's surface", () => {
  it("paints the ids the fixture reads", () => {
    const missing = Arr.filter(
      PLAYER_COMPONENT_IDS,
      (id) => !component.includes(`testId="${id}"`),
    );
    expect(missing).toEqual([]);
    const ids = Object.values(PLAYER_IDS);
    expect(new Set(ids).size).toBe(ids.length);
    // The probe owns its page, its readout and its switch; they are not the
    // component's, so a name collision would read the wrong box.
    expect(PLAYER_COMPONENT_IDS).not.toContain(PLAYER_IDS.readout);
    expect(PLAYER_COMPONENT_IDS).not.toContain(PLAYER_IDS.disable);
  });

  it("declares the geometry and the clock the fixture hands it", () => {
    expect(numberIn("DEFAULT_WIDTH")).toBe(PLAYER_POSTER.width);
    expect(numberIn("DEFAULT_HEIGHT")).toBe(PLAYER_POSTER.height);
    expect(numberIn("DEFAULT_TRACK_WIDTH")).toBe(PLAYER_TRACK.width);
    expect(numberIn("WAVEFORM_HEIGHT")).toBe(PLAYER_WAVEFORM.height);
    // The waveform is drawn at the track's own width, so the two boxes align.
    expect(PLAYER_WAVEFORM.width).toBe(PLAYER_TRACK.width);
    // The fixture overrides the shipped tick on purpose: this host's paint
    // rate paces the interval, so the probe waits longer per tick than the
    // component's default.
    expect(PLAYER_TICK_MS).toBeGreaterThan(MEDIA_TICK_MS);
    // The seek step is *not* overridden: the probe measures the package's own
    // default, so a changed default must fail here rather than in the window.
    expect(PLAYER_SEEK_STEP_MS).toBe(MEDIA_SEEK_STEP_MS);
    expect(probe).toContain("tickMs={PLAYER_TICK_MS}");
    expect(probe).not.toContain("seekStep=");
  });

  it("reads its colours from the palette the live window paints", () => {
    expect(PLAYER_WAVEFORM_INK).toBe(darkTheme.colors.mutedForeground);
    expect(PLAYER_PAGE).toBe(darkTheme.colors.background);
  });
});

describe("the clip the shipped player is given", () => {
  it("hands every playhead the frame the clip's schedule names", () => {
    expect(frameAt(0)).toEqual(
      Option.some({
        width: MEDIA_BUFFER.width,
        height: MEDIA_BUFFER.height,
        pixels: framePixels(frameColour(0)),
      }),
    );
    expect(frameAt(3 * PLAYER_SEEK_STEP_MS)).toEqual(
      Option.some({
        width: MEDIA_BUFFER.width,
        height: MEDIA_BUFFER.height,
        pixels: framePixels(frameColour(3 * PLAYER_SEEK_STEP_MS)),
      }),
    );
    // A playhead past the clip stays on its last frame rather than reading
    // outside the schedule.
    expect(frameAt(PLAYER_CLIP_MS * 2)).toEqual(frameAt(PLAYER_CLIP_MS));
  });

  it("gives the seek a frame it can prove", () => {
    expect(frameHex(3 * PLAYER_SEEK_STEP_MS)).not.toBe(frameHex(0));
    expect(3 * PLAYER_SEEK_STEP_MS).toBeLessThan(PLAYER_CLIP_MS);
    expect(timeLabel(3 * PLAYER_SEEK_STEP_MS, PLAYER_CLIP_MS)).toBe(
      "0:03 / 0:04",
    );
  });

  it("draws a silhouette with an amplitude, not a flat band", () => {
    expect(PLAYER_PEAKS.length).toBeGreaterThan(1);
    expect(Arr.every(PLAYER_PEAKS, (peak) => peak > 0 && peak < 1)).toBe(true);
    expect(Arr.some(PLAYER_PEAKS, (peak) => peak >= 0.5)).toBe(true);
    expect(Arr.some(PLAYER_PEAKS, (peak) => peak <= 0.25)).toBe(true);
  });
});

describe("the report the player hands its caller", () => {
  it("round-trips the readout's one spelling", () => {
    expect(playerReportOf(playerReadout(PLAYER_REST))).toEqual(
      Option.some(PLAYER_REST),
    );
    const moved = { playing: true, playhead: 1250, reports: 7 } as const;
    expect(playerReportOf(playerReadout(moved))).toEqual(Option.some(moved));
  });

  it("refuses a line that is not a report", () => {
    expect(playerReportOf("playing=maybe playhead=0 reports=0")).toEqual(
      Option.none(),
    );
    expect(playerReportOf("playing=true playhead=x reports=0")).toEqual(
      Option.none(),
    );
    expect(playerReportOf("playing=true playhead=0")).toEqual(Option.none());
  });
});

describe("the probe", () => {
  it("is registered under the content capability", () => {
    const entry = liveRegistry.find(
      (candidate) => candidate.id === "media-player-lifecycle",
    );
    expect(entry?.capability).toBe("content");
  });

  it("is mounted by the live runner", () => {
    expect(scenarios).toContain('"media-player-lifecycle": {');
    expect(scenarios).toContain("view: () => <MediaPlayerProbe />");
    expect(scenarios).toContain("steps: mediaPlayerSteps");
    expect(scenarios).toContain(
      'import { MediaPlayerProbe, mediaPlayerSteps } from "./media-player-probe.js";',
    );
  });

  it("mounts the shipped wrapper instead of composing a second player", () => {
    expect(probe).toContain(
      'import { MediaPlayer } from "@gpuixui/media/media-player";',
    );
    expect(probe).toContain("<MediaPlayer");
    expect(probe).toContain("frameAt={frameAt}");
    expect(probe).toContain("peaks={PLAYER_PEAKS}");
    expect(probe).toContain("disabled={disabled}");
    expect(probe).toContain("onPlayheadChange=");
    expect(probe).toContain("onPlayingChange=");
    // The composition probe owns a clock and pushes buffers; this one must not,
    // or it would be measuring the route again rather than the wrapper.
    expect(probe).not.toContain("setInterval(");
    expect(probe).not.toContain("setImagePixels(");
  });

  it("reads the window against the package's own arithmetic", () => {
    expect(probe).toContain(
      'import { progressWidth, timeLabel } from "@gpuixui/media/player/logic";',
    );
    expect(probe).toContain(
      "progressWidth(held.playhead, PLAYER_CLIP_MS, PLAYER_TRACK.width)",
    );
    expect(probe).toContain(
      "progressWidth(\n        3 * PLAYER_SEEK_STEP_MS,",
    );
    expect(probe).toContain("timeLabel(PLAYER_CLIP_MS, PLAYER_CLIP_MS)");
  });

  it("counts the checks the probe can assert", () => {
    const sites = Arr.length(
      Arr.fromIterable(stepsOf().matchAll(/ctx\.expect\w+\(/g)),
    );
    expect(sites).toBeGreaterThan(0);
    // The helpers assert per call, so the printed count floors the sites.
    expect(PLAYER_CHECKS).toBeGreaterThanOrEqual(sites);
  });
});

describe("the record", () => {
  it("documents the probe under the version it was measured on", () => {
    expect(sectionOf()).not.toBe("");
    expect(sectionOf()).toContain(`${PLAYER_CHECKS} checks`);
    expect(sectionOf()).toContain("`--only media-player-lifecycle`");
  });

  it("names the shipped wrapper, not the composition route", () => {
    const section = sectionOf();
    expect(section).toContain("`MediaPlayer`");
    expect(section).toContain("`media-frame-lifecycle`");
    expect(section).toContain("@gpuixui/media/player/logic");
  });

  it("prints the measured states", () => {
    const section = sectionOf();
    expect(section).toContain(playerReadout(PLAYER_REST));
    expect(section).toContain("playing=true");
    expect(section).toContain(timeLabel(PLAYER_CLIP_MS, PLAYER_CLIP_MS));
    expect(section).toContain(frameHex(3 * PLAYER_SEEK_STEP_MS));
    expect(section).toContain(
      `${PLAYER_POSTER.width}×${PLAYER_POSTER.height}`,
    );
    expect(section).toContain(
      `${PLAYER_WAVEFORM.width}×${PLAYER_WAVEFORM.height}`,
    );
    expect(section).toContain(PLAYER_WAVEFORM_INK);
    expect(section).toContain(PLAYER_PAGE);
  });

  it("names the poster the shipped player paints", () => {
    expect(PLAYER_POSTER).toEqual(MEDIA_POSTER);
    expect(PLAYER_TRACK.width).toBe(MEDIA_TRACK.width);
  });

  it("names the probe among those measured alone", () => {
    const start = readme.indexOf("Measured alone since then:");
    const clause = readme.slice(start, readme.indexOf("(", start));
    expect(clause).toContain("`media-player-lifecycle`");
  });
});
