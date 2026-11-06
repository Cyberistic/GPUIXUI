import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  bufferedWidth,
  MEDIA_SEEK_STEP_MS,
  MEDIA_TICK_MS,
  progressWidth,
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
  PLAYER_BUFFERED,
  PLAYER_COMPONENT_IDS,
  PLAYER_IDS,
  PLAYER_INK,
  PLAYER_PAGE,
  PLAYER_POSTER,
  PLAYER_REST,
  PLAYER_SCRUB_OFFSET,
  PLAYER_SEEK_STEP_MS,
  PLAYER_TICK_MS,
  PLAYER_TRACK,
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

const numberIn = (name: string): number => {
  const match = new RegExp(`const ${name} = (\\d+);`).exec(component);
  return Number(match?.[1] ?? Number.NaN);
};

const stepsOf = (): string => {
  const start = probe.indexOf("export const mediaPlayerSteps");
  return start === -1 ? "" : probe.slice(start);
};

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

    expect(PLAYER_COMPONENT_IDS).not.toContain(PLAYER_IDS.readout);
    expect(PLAYER_COMPONENT_IDS).not.toContain(PLAYER_IDS.disable);
  });

  it("declares the geometry and the clock the fixture hands it", () => {
    expect(PLAYER_TRACK.width).toBe(PLAYER_POSTER.width - 16);
    expect(PLAYER_TRACK.height).toBe(numberIn("TRACK_HEIGHT"));
    expect(`${PLAYER_POSTER.width}×${PLAYER_POSTER.height}`).toBe("512×288");

    expect(PLAYER_TICK_MS).toBeGreaterThan(MEDIA_TICK_MS);

    expect(PLAYER_SEEK_STEP_MS).toBe(MEDIA_SEEK_STEP_MS);
    expect(probe).toContain("tickMs={PLAYER_TICK_MS}");
    expect(probe).toContain("idleMs={PLAYER_IDLE_MS}");
    expect(probe).not.toContain("seekStep=");
    expect(probe).toContain("buffered={PLAYER_BUFFERED}");
  });

  it("reads its colours from the palette the live window paints", () => {
    expect(PLAYER_INK).toBe(darkTheme.colors.foreground);
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

    expect(frameAt(PLAYER_CLIP_MS * 2)).toEqual(frameAt(PLAYER_CLIP_MS));
  });

  it("gives the seek a frame it can prove", () => {
    expect(frameHex(3 * PLAYER_SEEK_STEP_MS)).not.toBe(frameHex(0));
    expect(3 * PLAYER_SEEK_STEP_MS).toBeLessThan(PLAYER_CLIP_MS);
    expect(timeLabel(3 * PLAYER_SEEK_STEP_MS, PLAYER_CLIP_MS)).toBe(
      "0:03 / 0:04",
    );
  });

  it("holds a buffered range inside the clip", () => {
    expect(PLAYER_BUFFERED).toBeGreaterThan(0);
    expect(PLAYER_BUFFERED).toBeLessThan(PLAYER_CLIP_MS);
    expect(
      bufferedWidth(PLAYER_BUFFERED, PLAYER_CLIP_MS, PLAYER_TRACK.width),
    ).toBeLessThan(PLAYER_TRACK.width);
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
    expect(probe).toContain("disabled={disabled}");
    expect(probe).toContain("onPlayheadChange=");
    expect(probe).toContain("onPlayingChange=");

    expect(probe).not.toContain("setInterval(");
    expect(probe).not.toContain("setImagePixels(");
  });

  it("reads the window against the package's own arithmetic", () => {
    expect(probe).toContain("@gpuixui/media/player/logic");
    expect(probe).toContain(
      "bufferedWidth(PLAYER_BUFFERED, PLAYER_CLIP_MS, PLAYER_TRACK.width)",
    );
    expect(probe).toContain(
      "progressWidth(held.playhead, PLAYER_CLIP_MS, PLAYER_TRACK.width)",
    );
    expect(probe).toContain("progressWidth(\n        3 * PLAYER_SEEK_STEP_MS,");
    expect(probe).toContain("timeLabel(PLAYER_CLIP_MS, PLAYER_CLIP_MS)");
  });

  it("drives the track's pointer scrub on the band a press reaches", () => {
    expect(PLAYER_IDS.trackHit).toBe("media-track-hit");
    expect(PLAYER_COMPONENT_IDS).toContain(PLAYER_IDS.trackHit);
    expect(probe).toContain("ctx.host.drag(PLAYER_IDS.trackHit, 0, 0, {");
    expect(probe).toContain(
      "ctx.host.drag(PLAYER_IDS.trackHit, PLAYER_SCRUB_OFFSET, 0, {",
    );
    expect(probe).not.toContain("ctx.host.drag(PLAYER_IDS.track,");

    const pressAt = PLAYER_TRACK.width / 2 + PLAYER_SCRUB_OFFSET;
    expect(pressAt).toBe((PLAYER_TRACK.width * 3) / 4);
    expect((pressAt / PLAYER_TRACK.width) * PLAYER_CLIP_MS).toBe(
      3 * PLAYER_SEEK_STEP_MS,
    );

    expect(pressAt + PLAYER_SCRUB_OFFSET).toBe(PLAYER_TRACK.width);
    expect(probe).toContain("ctx.host.hover(PLAYER_IDS.trackHit)");
    expect(probe).toContain('"a hover after the release reports nothing"');
    expect(probe).toContain('"a disabled track refuses a press"');
  });

  it("counts the checks the probe can assert", () => {
    const sites = Arr.length(
      Arr.fromIterable(stepsOf().matchAll(/ctx\.expect\w+\(/g)),
    );
    expect(sites).toBeGreaterThan(0);

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
    expect(section).toContain(`${PLAYER_POSTER.width}×${PLAYER_POSTER.height}`);
    expect(section).toContain(`${PLAYER_TRACK.width}×${PLAYER_TRACK.height}`);
    expect(section).toContain(PLAYER_INK);
    expect(section).toContain(PLAYER_PAGE);
    expect(section).toContain(
      `${bufferedWidth(PLAYER_BUFFERED, PLAYER_CLIP_MS, PLAYER_TRACK.width)}`,
    );
  });

  it("prints the pointer scrub the same window measured", () => {
    const section = sectionOf();

    expect(section).toContain("three quarters along the track");
    expect(section).toContain(
      `${progressWidth(3 * PLAYER_SEEK_STEP_MS, PLAYER_CLIP_MS, PLAYER_TRACK.width)}`,
    );
    expect(section).toContain("playhead=3000");

    expect(section).toContain("trailing edge");
    expect(section).toContain("playhead=4000");
    expect(section).toContain("a hover after the release");
    expect(section).toContain("the track refuses a press");
  });

  it("keeps the composed clip's frame schedule and paints it larger", () => {
    expect(PLAYER_POSTER.width).toBeGreaterThan(MEDIA_POSTER.width);
    expect(MEDIA_TRACK.width).toBeLessThan(PLAYER_TRACK.width);
  });

  it("names the probe among those measured alone", () => {
    const start = readme.indexOf("Measured alone since then:");
    const clause = readme.slice(start, readme.indexOf("(", start));
    expect(clause).toContain("`media-player-lifecycle`");
  });
});
