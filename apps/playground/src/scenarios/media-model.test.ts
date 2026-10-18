/**
 * `media-model` — the seek and envelope rules a waveform owns (plan `520`).
 *
 * Guards the measured contract: 4 px per second, a clamped time, the 7.5 px bar
 * slot with bottom-aligned bars, the 1 s / 5 s keyboard steps and the
 * accessible `Ns of 120s` label. A waveform that drifts from any of these
 * paints a playhead that disagrees with the pointer.
 */
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Str from "effect/String";
import {
  BARS,
  BAR_WIDTH,
  DURATION,
  SLOT,
  amplitudeAt,
  barFor,
  barRect,
  clampTime,
  describeMedia,
  envelopeDataUrl,
  envelopeSvg,
  levels,
  positionLabel,
  stepTime,
  timeAt,
  xAt,
} from "./media-model.js";

describe("timeAt and xAt", () => {
  it("maps the stage ends onto the clip ends", () => {
    expect(timeAt(0)).toBe(0);
    expect(timeAt(480)).toBe(120);
  });

  it("uses exactly 4 px per second", () => {
    expect(timeAt(120)).toBe(30);
    expect(xAt(30)).toBe(120);
    expect(xAt(1)).toBe(4);
  });

  it("clamps a pointer outside the stage", () => {
    expect(timeAt(-80)).toBe(0);
    expect(timeAt(600)).toBe(120);
    expect(clampTime(DURATION + 1)).toBe(DURATION);
  });

  it("round-trips every whole second", () => {
    const seconds = Arr.range(0, 120);
    expect(Arr.every(seconds, (value) => timeAt(xAt(value)) === value)).toBe(
      true,
    );
  });
});

describe("stepTime", () => {
  it("steps one second per arrow", () => {
    expect(stepTime(30, "right")).toBe(31);
    expect(stepTime(30, "left")).toBe(29);
  });

  it("steps five seconds with shift", () => {
    expect(stepTime(30, "right", true)).toBe(35);
    expect(stepTime(30, "left", true)).toBe(25);
  });

  it("moves to the clip ends on Home and End", () => {
    expect(stepTime(42, "home")).toBe(0);
    expect(stepTime(42, "end")).toBe(120);
  });

  it("clamps at both ends and ignores an unrelated key", () => {
    expect(stepTime(0, "left")).toBe(0);
    expect(stepTime(120, "right")).toBe(120);
    expect(stepTime(30, "a")).toBe(30);
  });
});

describe("the bar envelope", () => {
  it("spaces 64 bars at a 7.5 px slot and 6 px of paint", () => {
    expect(BARS).toBe(64);
    expect(SLOT).toBe(7.5);
    expect(BAR_WIDTH).toBe(6);
    expect(barRect(0).x).toBe(0);
    expect(barRect(63).x).toBe(472.5);
  });

  it("bottom-aligns every bar in the 96 px stage", () => {
    expect(barRect(0).top + barRect(0).height).toBe(96);
    expect(barRect(32).top + barRect(32).height).toBe(96);
    expect(barFor(40, 3)).toEqual({ x: 22.5, top: 56, height: 40 });
  });

  it("derives the fixture amplitudes deterministically and visibly", () => {
    expect(amplitudeAt(0)).toBe(12);
    expect(amplitudeAt(32)).toBe(28);
    expect(Arr.length(levels)).toBe(BARS);
    expect(Arr.every(levels, (height) => height >= 12 && height <= 59)).toBe(
      true,
    );
  });

  it("renders one rect per bar in a 480 × 96 document", () => {
    const svg = envelopeSvg("#123456");
    expect(Str.split(svg, "<rect ")).toHaveLength(BARS + 1);
    expect(Str.includes('width="480" height="96"')(svg)).toBe(true);
    expect(Str.includes('x="472.5"')(svg)).toBe(true);
    expect(Str.includes('fill="#123456"')(svg)).toBe(true);
  });

  it("builds a usable image data URL", () => {
    expect(
      Str.startsWith("data:image/svg+xml;charset=utf-8,")(
        envelopeDataUrl("#123456"),
      ),
    ).toBe(true);
  });
});

describe("the readouts", () => {
  it("labels the slider position for assistive technology", () => {
    expect(positionLabel(36)).toBe("36s of 120s");
    expect(positionLabel(0)).toBe("0s of 120s");
  });

  it("prints the seek state as key=value fields", () => {
    expect(describeMedia(30, "over", "bars")).toBe(
      "pos=30 duration=120 plane=over route=bars",
    );
    expect(describeMedia(0, "under", "image")).toBe(
      "pos=0 duration=120 plane=under route=image",
    );
  });
});
