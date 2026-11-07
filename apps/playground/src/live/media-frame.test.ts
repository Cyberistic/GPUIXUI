import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { liveRegistry } from "./registry.js";
import {
  advancePlayhead,
  fillWidth,
  frameColour,
  frameHex,
  frameIndex,
  framePixels,
  isFinished,
  MEDIA_BUFFER,
  MEDIA_CHECKS,
  MEDIA_CLIP_MS,
  MEDIA_FILL,
  MEDIA_FRAMES,
  MEDIA_IDS,
  MEDIA_POSTER,
  MEDIA_REST,
  MEDIA_SEEK_STEP_MS,
  MEDIA_TICK_MS,
  MEDIA_TRACK,
  mediaReadout,
  playheadOf,
  timeLabel,
  formatTime,
} from "./media-frame.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const probe = read("./media-frame-probe.tsx");
const scenarios = read("./scenarios.tsx");
const readme = read("../../README.md");

const runtimeTypings = read("../../node_modules/@gpuix/react/jsx-runtime.d.ts");

const stepsOf = (): string => {
  const start = probe.indexOf("export const mediaFrameSteps");
  return start === -1 ? "" : probe.slice(start);
};

const sectionOf = (): string => {
  const heading = "### `media-frame-lifecycle` — measured on 0.11.0 here";
  const start = readme.indexOf(heading);
  if (start === -1) return "";
  const end = readme.indexOf("\n## ", start + 1);
  return readme.slice(start, end === -1 ? undefined : end);
};

describe("the runtime's element list", () => {
  it("declares no media host element", () => {
    const declared = [...runtimeTypings.matchAll(/^\s{4}"?([a-z-]+)"?:/gm)];
    const names = Arr.map(declared, (match) => match[1] ?? "");
    expect(names).toEqual([
      "div",
      "text",
      "img",
      "svg",
      "canvas",
      "input",
      "textarea",
      "anchored",
      "code",
      "diff",
      "markdown",
      "virtual-list",
    ]);
    expect(Arr.contains(names, "video")).toBe(false);
    expect(Arr.contains(names, "audio")).toBe(false);
  });
});

describe("the clip's arithmetic", () => {
  it("advances the playhead one tick at a time and clamps at both ends", () => {
    expect(advancePlayhead(0, MEDIA_TICK_MS)).toBe(MEDIA_TICK_MS);
    expect(advancePlayhead(MEDIA_CLIP_MS - 50, MEDIA_TICK_MS)).toBe(
      MEDIA_CLIP_MS,
    );
    expect(advancePlayhead(0, -MEDIA_TICK_MS)).toBe(0);
    expect(isFinished(MEDIA_CLIP_MS)).toBe(true);
    expect(isFinished(MEDIA_CLIP_MS - 1)).toBe(false);
  });

  it("prints the transport's clock in whole seconds", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(999)).toBe("0:00");
    expect(formatTime(3000)).toBe("0:03");
    expect(formatTime(59_900)).toBe("0:59");
    expect(timeLabel(0)).toBe("0:00 / 0:04");
    expect(timeLabel(3 * MEDIA_SEEK_STEP_MS)).toBe("0:03 / 0:04");
    expect(timeLabel(MEDIA_CLIP_MS)).toBe("0:04 / 0:04");

    expect(formatTime(-10)).toBe("0:00");
  });

  it("paints the fill at the playhead's share of the track", () => {
    expect(fillWidth(0)).toBe(0);
    expect(fillWidth(MEDIA_CLIP_MS)).toBe(MEDIA_TRACK.width);
    expect(fillWidth(3 * MEDIA_SEEK_STEP_MS)).toBe((MEDIA_TRACK.width * 3) / 4);

    expect(fillWidth(MEDIA_CLIP_MS * 2)).toBe(MEDIA_TRACK.width);
    expect(fillWidth(MEDIA_CLIP_MS, 80)).toBe(80);
  });

  it("names one frame per second of the clip, and stays on the last", () => {
    expect(frameIndex(0)).toBe(0);
    expect(frameIndex(MEDIA_SEEK_STEP_MS - 1)).toBe(0);
    expect(frameIndex(MEDIA_SEEK_STEP_MS)).toBe(1);
    expect(frameIndex(2 * MEDIA_SEEK_STEP_MS)).toBe(2);
    expect(frameIndex(MEDIA_CLIP_MS)).toBe(MEDIA_FRAMES.length - 1);
    expect(frameHex(0)).toBe(frameHex(MEDIA_TICK_MS));
    expect(frameHex(3 * MEDIA_SEEK_STEP_MS)).not.toBe(frameHex(0));

    const channels = Arr.map(
      MEDIA_FRAMES,
      (colour) => `${colour.r},${colour.g},${colour.b}`,
    );
    expect(new Set(channels).size).toBe(MEDIA_FRAMES.length);
  });

  it("hands the runtime a full straight-RGBA buffer per frame", () => {
    const buffer = framePixels(frameColour(2 * MEDIA_SEEK_STEP_MS));
    expect(buffer.length).toBe(MEDIA_BUFFER.width * MEDIA_BUFFER.height * 4);

    const at = (index: number) => [
      buffer[index * 4],
      buffer[index * 4 + 1],
      buffer[index * 4 + 2],
      buffer[index * 4 + 3],
    ];
    const frame = frameColour(2 * MEDIA_SEEK_STEP_MS);
    expect(at(0)).toEqual([frame.r, frame.g, frame.b, 255]);
    expect(at(MEDIA_BUFFER.width * MEDIA_BUFFER.height - 1)).toEqual(at(0));
  });

  it("reads a playhead back out of the transport's readout", () => {
    expect(playheadOf(mediaReadout(MEDIA_REST))).toEqual(Option.some(0));
    expect(playheadOf(mediaReadout({ playing: true, playhead: 300 }))).toEqual(
      Option.some(300),
    );
    expect(playheadOf("playing=false")).toEqual(Option.none());
    expect(playheadOf("playhead=")).toEqual(Option.none());
  });

  it("keeps every id and the fill's colour apart", () => {
    const ids = Object.values(MEDIA_IDS);
    expect(new Set(ids).size).toBe(ids.length);
    expect(MEDIA_FILL).not.toBe(frameHex(0));

    expect(MEDIA_POSTER.width).toBeGreaterThan(MEDIA_TRACK.width);
    expect(MEDIA_POSTER.height).toBeGreaterThan(MEDIA_TRACK.height);
  });
});

describe("the probe", () => {
  it("is registered under the content capability", () => {
    const entry = liveRegistry.find(
      (candidate) => candidate.id === "media-frame-lifecycle",
    );
    expect(entry?.capability).toBe("content");
  });

  it("is mounted by the live runner", () => {
    expect(scenarios).toContain('"media-frame-lifecycle": {');
    expect(scenarios).toContain("view: () => <MediaFrameProbe />");
    expect(scenarios).toContain("steps: mediaFrameSteps");
    expect(scenarios).toContain(
      'import { MediaFrameProbe, mediaFrameSteps } from "./media-frame-probe.js";',
    );
  });

  it("pushes a buffer for the frame, not a placeholder", () => {
    const push = probe.slice(
      probe.indexOf("instance.setImagePixels("),
      probe.indexOf(");", probe.indexOf("instance.setImagePixels(")),
    );
    expect(push).toContain("MEDIA_BUFFER.width");
    expect(push).toContain("MEDIA_BUFFER.height");
    expect(push).toContain("framePixels(frameColour(playhead))");

    expect(probe).toContain("useLayoutEffect");

    expect(probe).toContain("}, [playhead]);");
  });

  it("owns the clock instead of waiting on a host element", () => {
    expect(probe).toContain("setInterval(");
    expect(probe).toContain("clearInterval(timer)");
    expect(probe).toContain("advancePlayhead(current, MEDIA_TICK_MS)");

    expect(probe).toContain("if (playing && playhead >= MEDIA_CLIP_MS)");
  });

  it("draws the transport's own keys and the pause after it", () => {
    const seek = probe.slice(
      probe.indexOf("const seek ="),
      probe.indexOf("const state: MediaState"),
    );
    expect(seek).toContain('key === "home"');
    expect(seek).toContain('key === "end"');
    expect(seek).toContain("MEDIA_SEEK_STEP_MS");

    expect(probe).toContain("testId={MEDIA_IDS.play} onActivate={toggle}");
    expect(probe).toContain("onKeyDown={seek}");
    expect(probe).toContain("tabIndex={0}");
  });

  it("counts the checks the probe can assert", () => {
    const sites = Arr.length(
      Arr.fromIterable(stepsOf().matchAll(/ctx\.expect\w+\(/g)),
    );
    expect(sites).toBeGreaterThan(0);

    expect(MEDIA_CHECKS).toBeGreaterThanOrEqual(sites);
  });
});

describe("the record", () => {
  it("documents the probe under the version it was measured on", () => {
    expect(sectionOf()).not.toBe("");
    expect(sectionOf()).toContain(`${MEDIA_CHECKS} checks`);
    expect(sectionOf()).toContain("`--only media-frame-lifecycle`");
  });

  it("states the absence the typings prove, and what stands in for it", () => {
    const section = sectionOf();
    expect(section).toContain("no `video` or `audio`");
    expect(section).toContain("`setImagePixels`");
    expect(section).toContain("The app owns the clock and the transport");

    expect(section).toContain("needs a platform surface");
  });

  it("prints the measured states", () => {
    const section = sectionOf();
    expect(section).toContain(mediaReadout(MEDIA_REST));
    expect(section).toContain("playing=true");
    expect(section).toContain(timeLabel(MEDIA_CLIP_MS));
    expect(section).toContain(frameHex(3 * MEDIA_SEEK_STEP_MS));
    expect(section).toContain(`${MEDIA_POSTER.width}×${MEDIA_POSTER.height}`);
  });

  it("names the probe among those measured alone", () => {
    const start = readme.indexOf("Measured alone since then:");
    const clause = readme.slice(start, readme.indexOf("(", start));
    expect(clause).toContain("`media-frame-lifecycle`");
  });
});
