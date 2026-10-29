/**
 * The player's arithmetic and its transport vocabulary.
 *
 * The bugs these guard: a transport that divides by a zero-length clip, a
 * playhead that leaves its clip, a clock that prints `NaN`, a buffered range
 * that paints past the played one, a rate of `0`, a volume of `2`, and a
 * keyboard map where Shift + arrow seeks by the small step or a focused field's
 * letter is read as a shortcut.
 */

import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import {
  advancePlayhead,
  bufferedWidth,
  clampPlayhead,
  durationOf,
  formatClock,
  frameAtOf,
  isFinished,
  isFrame,
  isScrubPress,
  mediaPaint,
  MEDIA_LARGE_SEEK_STEP_MS,
  MEDIA_SEEK_STEP_MS,
  MEDIA_VOLUME_STEP,
  playerIntent,
  progressWidth,
  qualityOf,
  rateLabel,
  rateOf,
  restingState,
  scrubPlayhead,
  scrubShare,
  stepOf,
  timeLabel,
  volumeOf,
} from "./logic.js";

const frame = (width: number, height: number): Uint8Array =>
  Uint8Array.from({ length: width * height * 4 }, () => 0);

describe("the frame a picture paints", () => {
  it("reads a decoded frame structurally, and paints nothing it cannot lay out", () => {
    // The bug guarded: the frame was trusted, so a decoder that answered a box
    // without bytes threw out of the layout effect on `pixels.length` and took
    // the whole player — transport included — down with it.
    expect(isFrame({ width: 2, height: 2, pixels: frame(2, 2) })).toBe(true);
    expect(isFrame({ width: 1, height: 1, pixels: frame(2, 2) })).toBe(true);
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

  it("reads a stored frame source as one only when it is a function", () => {
    // The bug guarded: a restored player carries JSON's `null` for the frame
    // source its record never held, and the layout effect called it.
    const source = (): Option.Option<never> => Option.none();
    expect(frameAtOf(source)).toBe(source);
    expect(frameAtOf(null)).toBeUndefined();
    expect(frameAtOf(undefined)).toBeUndefined();
  });
});

describe("the playhead", () => {
  it("holds a playhead inside the clip at both ends", () => {
    expect(clampPlayhead(-40, 4000)).toBe(0);
    expect(clampPlayhead(9999, 4000)).toBe(4000);
    expect(clampPlayhead(1200, 4000)).toBe(1200);
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

  it("reads a tick or seek step that cannot be laid out as its default", () => {
    expect(stepOf(0, 100)).toBe(100);
    expect(stepOf(Number.NaN, 100)).toBe(100);
    expect(stepOf(40, 100)).toBe(40);
  });
});

describe("the chrome's values", () => {
  it("prints the clock as m:ss and never NaN", () => {
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

  it("reads a rate as a positive number and prints it with a multiplication sign", () => {
    expect(rateOf(2)).toBe(2);
    expect(rateOf(0)).toBe(1);
    expect(rateOf(-1)).toBe(1);
    expect(rateOf(Number.NaN)).toBe(1);
    expect(rateLabel(1)).toBe("1×");
    expect(rateLabel(1.5)).toBe("1.5×");
    expect(rateLabel(Number.NaN)).toBe("1×");
  });

  it("holds a volume to a share, so a stored 2 cannot be handed to a mixer", () => {
    expect(volumeOf(0.4)).toBe(0.4);
    expect(volumeOf(2)).toBe(1);
    expect(volumeOf(-1)).toBe(0);
    expect(volumeOf(Number.NaN)).toBe(0);
  });

  it("keeps only a rendition the app still offers", () => {
    const qualities = ["Auto", "1080p", "720p"];
    expect(qualityOf("1080p", qualities)).toBe("1080p");
    expect(qualityOf(" 720p ", qualities)).toBe("720p");
    expect(qualityOf("4K", qualities)).toBe("Auto");
    expect(qualityOf("", qualities)).toBe("Auto");
    expect(qualityOf("Auto", [])).toBe("");
  });
});

describe("the resting state", () => {
  it("reads every stored prop through the rule its own type asks for", () => {
    const state = restingState({
      duration: 4000,
      playhead: 9999,
      playing: true,
      volume: 4,
      rate: 0,
      quality: "missing",
      qualities: ["Auto"],
      controls: false,
      popup: "settings",
    });
    expect(state).toStrictEqual({
      playing: true,
      playhead: 4000,
      volume: 1,
      muted: false,
      rate: 1,
      quality: "Auto",
      fullscreen: false,
      controls: false,
      popup: "settings",
    });
  });

  it("cannot be playing a clip with no length", () => {
    expect(restingState({ duration: 0, playing: true }).playing).toBe(false);
    expect(restingState({ duration: 4000 }).controls).toBe(true);
  });
});

describe("the progress track", () => {
  it("paints the played and buffered shares of the track", () => {
    expect(progressWidth(0, 4000, 200)).toBe(0);
    expect(progressWidth(1000, 4000, 200)).toBe(50);
    expect(progressWidth(4000, 4000, 200)).toBe(200);
    expect(bufferedWidth(2000, 4000, 200)).toBe(100);
    expect(bufferedWidth(9000, 4000, 200)).toBe(200);
  });

  it("paints no share for a clip or a track that cannot be laid out", () => {
    expect(progressWidth(100, 0, 200)).toBe(0);
    expect(progressWidth(100, 4000, Number.NaN)).toBe(0);
    expect(bufferedWidth(Number.NaN, 4000, 200)).toBe(0);
    expect(bufferedWidth(1000, 4000, 0)).toBe(0);
  });

  it("keeps the buffered range at least as far as the played one, and the thumb inside", () => {
    // The bug guarded: a caller's buffered range behind the playhead painted a
    // lighter fill inside the played one, so the timeline read as two ranges.
    const behind = mediaPaint(
      restingState({ duration: 4000, playhead: 3000 }),
      1000,
      4000,
      200,
      12,
    );
    expect(behind.played).toBe(150);
    expect(behind.buffered).toBe(150);
    expect(behind.thumb).toBe(144);
    expect(behind.clock).toBe("0:03 / 0:04");

    const start = mediaPaint(
      restingState({ duration: 4000 }),
      4000,
      4000,
      200,
      12,
    );
    expect(start.thumb).toBe(0);
    const end = mediaPaint(
      restingState({ duration: 4000, playhead: 4000 }),
      4000,
      4000,
      200,
      12,
    );
    expect(end.thumb).toBe(188);
  });
});

describe("the transport keys", () => {
  const intent = (key: string, shift = false) =>
    playerIntent(key, shift, MEDIA_SEEK_STEP_MS, MEDIA_LARGE_SEEK_STEP_MS);

  it("toggles on Space and K", () => {
    expect(intent("space")).toStrictEqual(Option.some({ kind: "toggle" }));
    expect(intent("k")).toStrictEqual(Option.some({ kind: "toggle" }));
  });

  it("seeks by the documented step, and by the large one with Shift", () => {
    expect(intent("left")).toStrictEqual(
      Option.some({ kind: "seek", delta: -MEDIA_SEEK_STEP_MS }),
    );
    expect(intent("right")).toStrictEqual(
      Option.some({ kind: "seek", delta: MEDIA_SEEK_STEP_MS }),
    );
    expect(intent("left", true)).toStrictEqual(
      Option.some({ kind: "seek", delta: -MEDIA_LARGE_SEEK_STEP_MS }),
    );
    expect(intent("right", true)).toStrictEqual(
      Option.some({ kind: "seek", delta: MEDIA_LARGE_SEEK_STEP_MS }),
    );
  });

  it("seeks by the large step on J and L, and to the ends on Home and End", () => {
    expect(intent("j")).toStrictEqual(
      Option.some({ kind: "seek", delta: -MEDIA_LARGE_SEEK_STEP_MS }),
    );
    expect(intent("l")).toStrictEqual(
      Option.some({ kind: "seek", delta: MEDIA_LARGE_SEEK_STEP_MS }),
    );
    expect(intent("home")).toStrictEqual(
      Option.some({ kind: "seekTo", edge: "start" }),
    );
    expect(intent("end")).toStrictEqual(
      Option.some({ kind: "seekTo", edge: "end" }),
    );
  });

  it("moves the volume, mutes and goes fullscreen", () => {
    expect(intent("up")).toStrictEqual(
      Option.some({ kind: "volume", delta: MEDIA_VOLUME_STEP }),
    );
    expect(intent("down")).toStrictEqual(
      Option.some({ kind: "volume", delta: -MEDIA_VOLUME_STEP }),
    );
    expect(intent("m")).toStrictEqual(Option.some({ kind: "mute" }));
    expect(intent("f")).toStrictEqual(Option.some({ kind: "fullscreen" }));
  });

  it("owns only its keys, so a letter typed elsewhere moves nothing", () => {
    expect(intent("a")).toStrictEqual(Option.none());
    expect(intent("enter")).toStrictEqual(Option.none());
    expect(intent("")).toStrictEqual(Option.none());
  });
});

describe("the progress track's pointer", () => {
  const track = { x: 100, width: 200 };

  it("seeks to the share of the clip a press names", () => {
    expect(scrubPlayhead(100, track, 4000)).toStrictEqual(Option.some(0));
    expect(scrubPlayhead(200, track, 4000)).toStrictEqual(Option.some(2000));
    expect(scrubPlayhead(300, track, 4000)).toStrictEqual(Option.some(4000));
  });

  it("clamps a press outside the track to its ends", () => {
    expect(scrubPlayhead(0, track, 4000)).toStrictEqual(Option.some(0));
    expect(scrubPlayhead(900, track, 4000)).toStrictEqual(Option.some(4000));
  });

  it("reads an unreadable coordinate as the track's start", () => {
    expect(scrubPlayhead(Number.NaN, track, 4000)).toStrictEqual(
      Option.some(0),
    );
    expect(scrubShare(Number.NaN, track)).toStrictEqual(Option.some(0));
  });

  it("answers nothing for a track or a clip that cannot be laid out", () => {
    expect(scrubPlayhead(150, { x: 100, width: 0 }, 4000)).toStrictEqual(
      Option.none(),
    );
    expect(
      scrubPlayhead(150, { x: 100, width: Number.NaN }, 4000),
    ).toStrictEqual(Option.none());
    expect(scrubPlayhead(150, track, 0)).toStrictEqual(Option.none());
    expect(scrubShare(150, { x: 100, width: 0 })).toStrictEqual(Option.none());
  });

  it("begins a scrub only on the primary press", () => {
    expect(isScrubPress(undefined)).toBe(true);
    expect(isScrubPress(null)).toBe(true);
    expect(isScrubPress(0)).toBe(true);
    expect(isScrubPress(2)).toBe(false);
  });
});
