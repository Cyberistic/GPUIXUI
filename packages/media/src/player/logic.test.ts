/**
 * The media player's arithmetic.
 *
 * The bugs these guard: a transport that divides by a zero-length clip, a
 * playhead that leaves its clip on a seek, a clock that prints `NaN`, and a
 * waveform whose unreadable samples turn its whole path into `NaN` (an `<svg>`
 * with a broken path paints nothing at all).
 */

import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import {
  advancePlayhead,
  clampPlayhead,
  durationOf,
  formatClock,
  isFinished,
  MEDIA_SEEK_STEP_MS,
  progressWidth,
  seekPlayhead,
  stepOf,
  timeLabel,
  waveformSvg,
} from "./logic.js";

describe("the playhead", () => {
  it("holds a playhead inside the clip at both ends", () => {
    expect(clampPlayhead(-40, 4000)).toBe(0);
    expect(clampPlayhead(9999, 4000)).toBe(4000);
    expect(clampPlayhead(1200, 4000)).toBe(1200);
  });

  it("reads a stored playhead or duration that is not a number as the start", () => {
    expect(clampPlayhead(Number.NaN, 4000)).toBe(0);
    expect(clampPlayhead(1200, Number.NaN)).toBe(0);
    expect(durationOf(Number.POSITIVE_INFINITY)).toBe(0);
    expect(durationOf(-1)).toBe(0);
  });

  it("advances by a delta and clamps at the clip's own end", () => {
    expect(advancePlayhead(900, 200, 1000)).toBe(1000);
    expect(advancePlayhead(100, -400, 1000)).toBe(0);
    expect(advancePlayhead(100, Number.NaN, 1000)).toBe(100);
  });

  it("knows when the clip has run out", () => {
    expect(isFinished(1000, 1000)).toBe(true);
    expect(isFinished(999, 1000)).toBe(false);
    expect(isFinished(0, 0)).toBe(false);
  });
});

describe("the clock", () => {
  it("prints whole seconds as m:ss and never NaN", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(999)).toBe("0:00");
    expect(formatClock(1000)).toBe("0:01");
    expect(formatClock(61_000)).toBe("1:01");
    expect(formatClock(Number.NaN)).toBe("0:00");
    expect(formatClock(-1)).toBe("0:00");
  });

  it("prints the position beside the clip's own length", () => {
    expect(timeLabel(0, 4000)).toBe("0:00 / 0:04");
    expect(timeLabel(9000, 4000)).toBe("0:04 / 0:04");
  });

  it("reads a tick or seek step that cannot be laid out as its default", () => {
    expect(stepOf(0, 100)).toBe(100);
    expect(stepOf(Number.NaN, 100)).toBe(100);
    expect(stepOf(40, 100)).toBe(40);
  });
});

describe("the progress fill", () => {
  it("paints the playhead's share of the track", () => {
    expect(progressWidth(0, 4000, 200)).toBe(0);
    expect(progressWidth(1000, 4000, 200)).toBe(50);
    expect(progressWidth(4000, 4000, 200)).toBe(200);
  });

  it("paints no fill for a clip that has no length", () => {
    expect(progressWidth(0, 0, 200)).toBe(0);
    expect(progressWidth(100, 0, 200)).toBe(0);
    expect(progressWidth(100, 4000, Number.NaN)).toBe(0);
  });
});

describe("the transport keys", () => {
  it("seeks to either end and steps by the stride", () => {
    expect(seekPlayhead(1200, "home", 1000, 4000)).toStrictEqual(
      Option.some(0),
    );
    expect(seekPlayhead(1200, "end", 1000, 4000)).toStrictEqual(
      Option.some(4000),
    );
    expect(seekPlayhead(1200, "left", 1000, 4000)).toStrictEqual(
      Option.some(200),
    );
    expect(seekPlayhead(1200, "right", 1000, 4000)).toStrictEqual(
      Option.some(2200),
    );
  });

  it("holds a step inside the clip", () => {
    expect(seekPlayhead(3500, "right", 1000, 4000)).toStrictEqual(
      Option.some(4000),
    );
    expect(seekPlayhead(500, "left", 1000, 4000)).toStrictEqual(Option.some(0));
  });

  it("owns only its four keys, and reads a broken step as its default", () => {
    expect(seekPlayhead(0, "enter", 1000, 4000)).toStrictEqual(Option.none());
    expect(seekPlayhead(0, "", 1000, 4000)).toStrictEqual(Option.none());
    expect(seekPlayhead(0, "right", Number.NaN, 4000)).toStrictEqual(
      Option.some(MEDIA_SEEK_STEP_MS),
    );
  });
});

describe("the waveform", () => {
  it("draws one mirrored silhouette from the samples", () => {
    // A single half-height sample over a 20×16 box: the top peaks at y 4, the
    // mirrored bottom at 12, and both ends meet the middle at y 8.
    expect(waveformSvg([0.5], 20, 16)).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 16"><path fill="#000" d="M 0 8 L 10 4 L 20 8 L 10 12 Z"/></svg>',
    );
  });

  it("reads a sample that is not a share as silence", () => {
    // All-zero samples are a flat line on the middle: a real waveform of
    // silence, not a broken path.
    expect(waveformSvg([0], 20, 16)).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 16"><path fill="#000" d="M 0 8 L 10 8 L 20 8 L 10 8 Z"/></svg>',
    );
    expect(waveformSvg([Number.NaN, 4, -2], 20, 16)).toBe(
      waveformSvg([0, 1, 0], 20, 16),
    );
  });

  it("paints nothing for no samples or a box it cannot lay out", () => {
    expect(waveformSvg([], 20, 16)).toBe("");
    expect(waveformSvg([0.5], 0, 16)).toBe("");
    expect(waveformSvg([0.5], 20, Number.NaN)).toBe("");
  });
});
