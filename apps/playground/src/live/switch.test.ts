import { readFileSync } from "node:fs";
import * as Option from "effect/Option";
import { getTheme, platformTheme } from "@gpuixui/tokens";
import { Pixels } from "@gpuixui/testing";
import { describe, expect, it } from "vitest";
import { liveRegistry } from "./registry.js";
import {
  SWITCH_HALF_MS,
  SWITCH_IDS,
  SWITCH_LEVEL,
  SWITCH_PAGE,
  SWITCH_REST_MS,
  SWITCH_SLIDE_MS,
  isBetween,
  leadingGap,
  nearMiddle,
  paintInBand,
  sitsAtTheEnd,
  sitsAtTheStart,
  switchReadout,
  thumbMoved,
  trailingGap,
  type SwitchBox,
} from "./switch.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const probe = read("./switch-probe.tsx");
const registry = read("./registry.ts");
const scenarios = read("./scenarios.tsx");
const readme = read("../../README.md");
const motionTiming = read("../../../../packages/motion/src/timing.ts");
const switchComponent = read(
  "../../../../packages/primitives/src/components/Switch.tsx",
);

const sectionOf = (): string => {
  const heading = "### `switch-lifecycle` — measured on 0.11.0 here";
  const start = readme.indexOf(heading);
  if (start === -1) return "";
  const end = readme.indexOf("\n## ", start + 1);
  return readme.slice(start, end === -1 ? undefined : end);
};

const frameWith = (
  width: number,
  height: number,
  fill: Pixels.Rgba,
  patch: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly colour: Pixels.Rgba;
  },
): Pixels.Pixels => {
  const data = new Uint8Array(width * height * 4);
  for (let at = 0; at < data.length; at += 4) {
    data[at] = fill.r;
    data[at + 1] = fill.g;
    data[at + 2] = fill.b;
    data[at + 3] = fill.a;
  }
  for (let y = patch.y; y < patch.y + patch.height; y += 1) {
    for (let x = patch.x; x < patch.x + patch.width; x += 1) {
      const at = (y * width + x) * 4;
      data[at] = patch.colour.r;
      data[at + 1] = patch.colour.g;
      data[at + 2] = patch.colour.b;
      data[at + 3] = patch.colour.a;
    }
  }
  return new Pixels.Pixels({ width, height, data });
};

const ink = (hex: string): Pixels.Rgba => {
  const colour = Pixels.hexToRgba(hex);
  if (colour === null) throw new Error(`${hex} is not a colour`);
  return colour;
};

const PAGE = ink(SWITCH_PAGE);
const PAGE_HEX = SWITCH_PAGE.toUpperCase();
const BACKGROUND = ink("#000000");
const MARK = ink("#FF00AA");

const BAND: SwitchBox = { x: 0, y: 0, width: 40, height: 20 };

describe("the frame read", () => {
  it("finds a paint's logical bounds inside a band", () => {
    const frame = frameWith(80, 40, BACKGROUND, {
      x: 20,
      y: 10,
      width: 10,
      height: 6,
      colour: MARK,
    });
    const found = paintInBand(frame, BAND, MARK, 2);
    expect(Option.map(found, (paint) => [paint.x, paint.y])).toEqual(
      Option.some([10, 5]),
    );
    expect(Option.map(found, (paint) => [paint.width, paint.height])).toEqual(
      Option.some([5, 3]),
    );
    expect(Option.map(found, (paint) => paint.count)).toEqual(Option.some(60));
  });

  it("answers none for a colour the band does not paint", () => {
    const frame = frameWith(80, 40, BACKGROUND, {
      x: 20,
      y: 10,
      width: 10,
      height: 6,
      colour: MARK,
    });
    expect(paintInBand(frame, BAND, ink("#00FF00"), 2)).toEqual(Option.none());

    expect(
      paintInBand(frame, { x: 30, y: 0, width: 10, height: 20 }, MARK, 2),
    ).toEqual(Option.none());
  });

  it("maps a padded band at the frame's edge without leaving the window", () => {
    const frame = frameWith(80, 40, BACKGROUND, {
      x: 2,
      y: 2,
      width: 12,
      height: 4,
      colour: MARK,
    });

    const found = paintInBand(
      frame,
      { x: 0, y: 0, width: 20, height: 20 },
      MARK,
      2,
      6,
    );
    expect(Option.map(found, (paint) => paint.x)).toEqual(Option.some(1));
    expect(Option.map(found, (paint) => paint.width)).toEqual(Option.some(6));
  });
});

describe("the thumb's geometry", () => {
  const track: SwitchBox = { x: 10, y: 10, width: 28, height: 16 };
  const start: SwitchBox = { x: 12, y: 12, width: 12, height: 12 };
  const end: SwitchBox = { x: 24, y: 12, width: 12, height: 12 };

  it("measures the gaps either side of a knob", () => {
    expect(leadingGap(track, start)).toBe(2);
    expect(trailingGap(track, end)).toBe(2);
    expect(thumbMoved(start, end)).toBe(12);
    expect(sitsAtTheStart(track, start)).toBe(true);
    expect(sitsAtTheEnd(track, start, end)).toBe(true);
  });

  it("refuses a knob that did not reach, overshot, or never moved", () => {
    const short: SwitchBox = { x: 20, y: 12, width: 12, height: 12 };
    expect(sitsAtTheEnd(track, start, short)).toBe(false);
    const overshot: SwitchBox = { x: 26, y: 12, width: 12, height: 12 };
    expect(sitsAtTheEnd(track, start, overshot)).toBe(false);
    expect(sitsAtTheStart(track, end)).toBe(false);
    expect(trailingGap(track, short)).toBe(6);
  });

  it("holds the midway frame inside the slide and clear of either end", () => {
    expect(isBetween(18, 12, 24)).toBe(true);
    expect(nearMiddle(18, 12, 24)).toBe(true);

    expect(isBetween(12, 12, 24)).toBe(false);
    expect(isBetween(24, 12, 24)).toBe(false);
    expect(nearMiddle(15, 12, 24)).toBe(false);

    expect(isBetween(18, 24, 12)).toBe(true);
  });
});

describe("the fixture", () => {
  it("takes the slide's level from the component and the motion table", () => {
    expect(motionTiming).toContain(`fast: ${SWITCH_SLIDE_MS}`);

    expect(switchComponent).toContain(`motionTiming("${SWITCH_LEVEL}"`);
    expect(SWITCH_HALF_MS).toBe(SWITCH_SLIDE_MS / 2);
    expect(SWITCH_REST_MS).toBeGreaterThan(SWITCH_SLIDE_MS);
  });

  it("prints the state and the reports it made", () => {
    expect(switchReadout(false, 0)).toBe("checked=false changes=0");
    expect(switchReadout(true, 3)).toBe("checked=true changes=3");
  });

  it("paints on a page that is no role of any switch it measures", () => {
    const dark = getTheme("dark");
    const roles = [
      dark.colors.background,
      dark.colors.foreground,
      dark.colors.muted,
      dark.colors.mutedForeground,
      dark.colors.primary,
      dark.colors.primaryForeground,
    ];

    expect(roles.map((role) => role.toUpperCase())).not.toContain(PAGE_HEX);
    const platform = platformTheme(dark, "darwin").switch;
    expect(platform).toBeDefined();
    expect(
      [platform?.off, platform?.on, platform?.knob].map((role) =>
        role?.toUpperCase(),
      ),
    ).not.toContain(PAGE_HEX);
    expect(PAGE).toEqual(ink(SWITCH_PAGE));
  });

  it("names every part the probe reads, once", () => {
    const ids = Object.values(SWITCH_IDS);
    expect(new Set(ids).size).toBe(ids.length);
    expect(Object.keys(SWITCH_IDS).length).toBeGreaterThan(5);
  });
});

describe("the registry and the record", () => {
  it("declares the probe as an input a window can prove", () => {
    const meta = liveRegistry.find((entry) => entry.id === "switch-lifecycle");
    expect(meta?.capability).toBe("input");
    expect(registry).toContain('id: "switch-lifecycle"');
    expect(scenarios).toContain('id: "switch-lifecycle"');
    expect(scenarios).toContain("SwitchProbe");
    expect(scenarios).toContain("switchSteps");
  });

  it("documents the probe under the version it was measured on", () => {
    const section = sectionOf();
    expect(section).not.toBe("");
    expect(section).toContain("47 checks");
    expect(section).toContain("`--only switch-lifecycle`");
    for (const name of [
      "switch-rest",
      "switch-on",
      "switch-platform-off",
      "switch-platform-on",
      "switch-frozen",
      "switch-partial",
      "switch-settled",
    ]) {
      expect(section).toContain(name);
    }
  });

  it("prints the readings the window took", () => {
    const section = sectionOf();

    for (const value of ["18.5", "24.5", "30.5", "12", "17.5", "33.5", "16"]) {
      expect(section).toContain(value);
    }
  });

  it("reads the slide on the motion clock, not a fixed sleep", () => {
    expect(probe).toContain("clockPause");
    expect(probe).toContain("clockFastForward");
    expect(probe).toContain("clockResume");
    expect(probe).toContain("SWITCH_HALF_MS");
    expect(probe).toContain("settleUntil");
  });
});
