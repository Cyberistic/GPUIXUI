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
  frameAtOf,
  isFinished,
  isFrame,
  isScrubPress,
  MEDIA_SEEK_STEP_MS,
  peaksOf,
  progressWidth,
  scrubPlayhead,
  seekPlayhead,
  stepOf,
  timeLabel,
  waveformSvg,
} from "./logic.js";

describe("the frame a picture paints", () => {
  it("reads a decoded frame structurally, and paints nothing it cannot lay out", () => {
    // The bug guarded: the frame was trusted, so a decoder that answered a box
    // without bytes threw out of the layout effect on `pixels.length` and took
    // the whole player — transport included — down with it.
    const frame = (width: number, height: number): Uint8Array =>
      Uint8Array.from({ length: width * height * 4 }, () => 0);
    expect(isFrame({ width: 2, height: 2, pixels: frame(2, 2) })).toBe(true);
    // A frame with more bytes than its box is still paintable (the picture
    // reads the first width × height × 4).
    expect(isFrame({ width: 1, height: 1, pixels: frame(2, 2) })).toBe(true);
    // A partial buffer, a box that cannot be laid out, and a value that is not
    // a frame at all paint nothing.
    expect(isFrame({ width: 2, height: 2, pixels: frame(1, 1) })).toBe(false);
    expect(isFrame({ width: 2, height: 2 })).toBe(false);
    expect(isFrame({ width: 2, height: 2, pixels: null })).toBe(false);
    expect(isFrame({ width: 2, height: 2, pixels: [0, 0, 0, 255] })).toBe(
      false,
    );
    expect(isFrame({ width: 0, height: 2, pixels: frame(2, 2) })).toBe(false);
    expect(isFrame({ width: Number.NaN, height: 2, pixels: frame(2, 2) })).toBe(
      false,
    );
    expect(isFrame(null)).toBe(false);
    expect(isFrame(undefined)).toBe(false);
    expect(isFrame("frame")).toBe(false);
  });
});

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

describe("the progress track", () => {
  it("seeks to the share of the clip a press names", () => {
    // The track is the clip's whole length: its start is 0:00, its middle half
    // the clip and its end the last frame a playhead can hold.
    const track = { x: 100, width: 200 };
    expect(scrubPlayhead(100, track, 4000)).toStrictEqual(Option.some(0));
    expect(scrubPlayhead(200, track, 4000)).toStrictEqual(Option.some(2000));
    expect(scrubPlayhead(300, track, 4000)).toStrictEqual(Option.some(4000));
  });

  it("clamps a press outside the track to its ends", () => {
    const track = { x: 100, width: 200 };
    expect(scrubPlayhead(0, track, 4000)).toStrictEqual(Option.some(0));
    expect(scrubPlayhead(900, track, 4000)).toStrictEqual(Option.some(4000));
  });

  it("reads an unreadable coordinate as the track's start", () => {
    expect(
      scrubPlayhead(Number.NaN, { x: 100, width: 200 }, 4000),
    ).toStrictEqual(Option.some(0));
  });

  it("answers nothing for a track or a clip that cannot be laid out", () => {
    expect(scrubPlayhead(150, { x: 100, width: 0 }, 4000)).toStrictEqual(
      Option.none(),
    );
    expect(
      scrubPlayhead(150, { x: 100, width: Number.NaN }, 4000),
    ).toStrictEqual(Option.none());
    expect(scrubPlayhead(150, { x: 100, width: 200 }, 0)).toStrictEqual(
      Option.none(),
    );
  });

  it("begins a scrub only on the primary press", () => {
    expect(isScrubPress(undefined)).toBe(true);
    expect(isScrubPress(null)).toBe(true);
    expect(isScrubPress(0)).toBe(true);
    expect(isScrubPress(2)).toBe(false);
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

  it("reads only a list as a clip's samples", () => {
    // The bug guarded: `peaks` is a decode's output or a saved record's field,
    // so a store that carried no samples writes `null` and an older shape can
    // be a number or an object. Handing any of them to the drawing threw out of
    // the render (`self.map is not a function`) and took the whole player down.
    expect(peaksOf([0.2, 0.8])).toStrictEqual([0.2, 0.8]);
    expect(peaksOf([])).toStrictEqual([]);
    expect(peaksOf(null)).toStrictEqual([]);
    expect(peaksOf(undefined)).toStrictEqual([]);
    expect(peaksOf(3)).toStrictEqual([]);
    expect(peaksOf({})).toStrictEqual([]);
    expect(peaksOf({ 0: 0.5, 1: 1 })).toStrictEqual([]);
    expect(peaksOf("abcd")).toStrictEqual([]);
    expect(waveformSvg(peaksOf(3), 20, 16)).toBe("");
  });

  it("reads a stored frame source as one only when it is a function", () => {
    // The bug guarded: a player restored with a workspace carries JSON's `null`
    // for the frame source its record never held, and the layout effect called
    // it — `frameAt is not a function` out of every playhead paint, taking the
    // transport down with the picture.
    const source = (): Option.Option<never> => Option.none();
    expect(frameAtOf(source)).toBe(source);
    expect(frameAtOf(null)).toBeUndefined();
    expect(frameAtOf(undefined)).toBeUndefined();
  });

  it("reads a stored sample that is not a number as silence", () => {
    // A list whose entries a save wrote as something else keeps its shape — the
    // sample exists, it is just unreadable — so it draws a flat point rather
    // than being dropped and shifting every later peak one slot left.
    const stored = [0.5, "loud", null, Number.NaN];
    expect(peaksOf(stored)).toHaveLength(4);
    expect(waveformSvg(peaksOf(stored), 20, 16)).toBe(
      waveformSvg([0.5, 0, 0, 0], 20, 16),
    );
  });
});
