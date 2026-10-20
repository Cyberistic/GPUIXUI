/**
 * Guards the premises of the scroll-affordance probe (plan `801`).
 *
 * The bug being guarded: no scenario reads a scroller's trailing strip, so a
 * runtime that reserved a gutter or painted a thumb would pass every existing
 * scroll check — and a component-owned thumb with the wrong length, position or
 * press mapping would pass a geometry-only probe. These tests pin the three
 * rules the scenario asserts and the sample points it reads.
 */
import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";
import {
  EDGE_INSET,
  EDGE_STOPS,
  MIN_THUMB,
  NEIGHBOUR_GAP,
  THUMB_WIDTH,
  edgePairs,
  firstMismatch,
  offsetForTrackPress,
  thumbGeometry,
} from "./scrollbar-model.js";

const TRACK = 160;
const CONTENT = 2000;

/** The length the rule derives, for a track and content that both overflow. */
const lengthFor = (track: number, content: number): number =>
  Math.min(
    Math.max((track * track) / content, Math.min(MIN_THUMB, track)),
    track,
  );

const geometry = (offset: number): { start: number; length: number } =>
  Option.getOrElse(thumbGeometry(TRACK, CONTENT, offset), () => ({
    start: -1,
    length: -1,
  }));

const grey = (value: number): Pixels.Rgba =>
  new Pixels.Rgba({ r: value, g: value, b: value, a: 255 });

describe("thumbGeometry", () => {
  it("has no thumb when the content fits", () => {
    expect(Option.isNone(thumbGeometry(TRACK, 100, 0))).toBe(true);
    expect(Option.isNone(thumbGeometry(TRACK, TRACK, -10))).toBe(true);
  });

  it("floors a thumb on a long document at MIN_THUMB", () => {
    const thumb = geometry(0);
    expect(thumb.length).toBe(MIN_THUMB);
    expect(thumb.start).toBe(0);
    expect(lengthFor(TRACK, CONTENT)).toBe(MIN_THUMB);
  });

  it("is proportional on a short enough document to exceed the floor", () => {
    const thumb = Option.getOrElse(thumbGeometry(400, 1000, 0), () => ({
      start: -1,
      length: -1,
    }));
    expect(thumb.length).toBe(160);
  });

  it("moves the start monotonically with the offset", () => {
    expect(geometry(-400).start).toBeGreaterThan(geometry(-100).start);
    expect(geometry(-800).start).toBeGreaterThan(geometry(-400).start);
  });

  it("lands the start at the track's end at the maximum offset", () => {
    const thumb = geometry(-(CONTENT - TRACK));
    expect(thumb.start).toBeCloseTo(TRACK - thumb.length, 6);
  });

  it("clamps an offset past the maximum", () => {
    const thumb = geometry(-100_000);
    expect(thumb.start).toBeCloseTo(TRACK - thumb.length, 6);
  });

  it("has no thumb on a zero-height track", () => {
    expect(Option.isNone(thumbGeometry(0, CONTENT, 0))).toBe(true);
  });
});

describe("offsetForTrackPress", () => {
  it("maps the track's ends to the content's ends", () => {
    expect(offsetForTrackPress(TRACK, CONTENT, 0)).toBe(0);
    expect(offsetForTrackPress(TRACK, CONTENT, TRACK)).toBe(-(CONTENT - TRACK));
  });

  it("maps the midpoint to half the scrollable range", () => {
    expect(offsetForTrackPress(TRACK, CONTENT, TRACK / 2)).toBe(
      -(CONTENT - TRACK) / 2,
    );
  });

  it("clamps a press outside the track", () => {
    expect(offsetForTrackPress(TRACK, CONTENT, 1000)).toBe(-(CONTENT - TRACK));
    expect(offsetForTrackPress(TRACK, CONTENT, -50)).toBe(0);
  });

  it("asks for nothing when the content fits", () => {
    expect(offsetForTrackPress(TRACK, 100, 80)).toBe(0);
  });
});

describe("edgePairs", () => {
  const box = { x: 220, y: 16, width: 180, height: 160 } as const;

  it("reads a vertical scroller's right edge and its interior", () => {
    const [first] = edgePairs(box, "x");
    expect(first?.edge.x).toBe(box.x + box.width - EDGE_INSET);
    expect(first?.inner.x).toBe(box.x + box.width - NEIGHBOUR_GAP);
    expect(first?.edge.y).toBe(first?.inner.y);
  });

  it("reads a horizontal scroller's bottom edge and its interior", () => {
    const [first] = edgePairs(box, "y");
    expect(first?.edge.y).toBe(box.y + box.height - EDGE_INSET);
    expect(first?.inner.y).toBe(box.y + box.height - NEIGHBOUR_GAP);
    expect(first?.edge.x).toBe(first?.inner.x);
  });

  it("stays inside the box at every stop", () => {
    const inside = edgePairs(box, "x").every(
      (pair) =>
        pair.edge.x > box.x &&
        pair.edge.x < box.x + box.width &&
        pair.edge.y > box.y &&
        pair.edge.y < box.y + box.height &&
        pair.inner.x > box.x,
    );
    expect(inside).toBe(true);
    expect(edgePairs(box, "x")).toHaveLength(EDGE_STOPS.length);
  });
});

describe("firstMismatch", () => {
  it("passes a uniform strip", () => {
    expect(firstMismatch([grey(25), grey(25)], [grey(25), grey(25)], 2)).toBe(
      -1,
    );
  });

  it("names the first differing stop", () => {
    expect(
      firstMismatch(
        [grey(25), grey(25), grey(200)],
        [grey(25), grey(25), grey(25)],
        2,
      ),
    ).toBe(2);
  });

  it("uses the tolerance, not exact equality", () => {
    expect(firstMismatch([grey(25)], [grey(27)], 2)).toBe(-1);
    expect(firstMismatch([grey(25)], [grey(28)], 2)).toBe(0);
  });
});

describe("the shipping recipe", () => {
  it("keeps a 6 px thumb with a 24 px floor", () => {
    expect(THUMB_WIDTH).toBe(6);
    expect(MIN_THUMB).toBe(24);
  });
});
