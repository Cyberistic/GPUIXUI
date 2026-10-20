/**
 * Truncation, in the frame: the ellipsis glyph and any ink outside the run's box.
 *
 * The bug being guarded: plan `335` measured truncation as **geometry** — a
 * `nowrap` run in a narrow box collapses to one line — and recorded that
 * `getPaintedText()` returns the source run, so the `…` was never asserted.
 * A runtime that clipped the glyph run instead of drawing an ellipsis would
 * pass every existing check while every truncated label ended mid-glyph, and a
 * runtime that painted past the layout box would paint over a neighbour.
 *
 * A dot run is short at the right edge; a clipped capital is tall. This module
 * owns the fixtures and that metric, so the view, the scenario and the unit
 * tests read one rule. Pixel walking is indexed on purpose: it visits tens of
 * thousands of bytes.
 */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";
import type { Smoke } from "@gpuixui/testing";

/** Per-channel slack for ink; anti-aliasing can tint an edge, not move a role. */
export const TRUNCATION_TOLERANCE = 6;

/** Interior ink that makes the short control a painted run, not a blank box. */
export const MIN_INK_PIXELS = 32;

/** The right-edge band, in logical pixels, that carries the truncation mark. */
export const EDGE_BAND = 24;

/** The tallest ink column a dot run may carry, as a share of the line box. */
export const DOT_COLUMN_CEILING = 0.4;

/** The shortest ink column a clipped capital must carry, as the differential. */
export const CLIPPED_COLUMN_FLOOR = 0.6;

export const truncationKinds = ["ellipsis", "clip", "nowrap", "short"] as const;

export type TruncationKind = (typeof truncationKinds)[number];

/** One fixture: its declaration, its run and its panel geometry. */
export interface TruncationFixture {
  readonly kind: TruncationKind;
  /** The `<text>` run whose box and right edge are measured. */
  readonly testId: string;
  /** The `200`-wide box that constrains the run. */
  readonly boxId: string;
  readonly panelId: string;
  readonly left: number;
  readonly top: number;
  readonly run: string;
  readonly textOverflow?: "ellipsis";
  /** Whether the constraint box clips its content. */
  readonly clipBox: boolean;
  /** Whether the panel clips, so a spilling `nowrap` run stays in its panel. */
  readonly clipPanel: boolean;
}

export const TRUNCATION_PANEL_WIDTH = 280;
export const TRUNCATION_PANEL_HEIGHT = 96;
export const TRUNCATION_BOX_WIDTH = 200;
export const TRUNCATION_BOX_HEIGHT = 40;
export const TRUNCATION_FONT_SIZE = 32;

/** Dense capitals, so a clipped fragment leaves a tall stem at the right edge. */
export const TRUNCATION_RUN = "MMMM MMMM MMMM MMMM MMMM";

/** The four fixtures, in document order, at the plan-775 panel offsets. */
export const truncationFixtures: Record<TruncationKind, TruncationFixture> = {
  ellipsis: {
    kind: "ellipsis",
    testId: "trunc-ellipsis",
    boxId: "trunc-ellipsis-box",
    panelId: "trunc-panel-ellipsis",
    left: 24,
    top: 24,
    run: TRUNCATION_RUN,
    textOverflow: "ellipsis",
    clipBox: false,
    clipPanel: false,
  },
  clip: {
    kind: "clip",
    testId: "trunc-clip",
    boxId: "trunc-clip-box",
    panelId: "trunc-panel-clip",
    left: 336,
    top: 24,
    run: TRUNCATION_RUN,
    clipBox: true,
    clipPanel: false,
  },
  nowrap: {
    kind: "nowrap",
    testId: "trunc-nowrap",
    boxId: "trunc-nowrap-box",
    panelId: "trunc-panel-nowrap",
    left: 24,
    top: 136,
    run: TRUNCATION_RUN,
    clipBox: false,
    clipPanel: true,
  },
  short: {
    kind: "short",
    testId: "trunc-short",
    boxId: "trunc-short-box",
    panelId: "trunc-panel-short",
    left: 336,
    top: 136,
    run: "MMMM",
    clipBox: false,
    clipPanel: false,
  },
};

export const TRUNCATION_FIXTURES: ReadonlyArray<TruncationFixture> = [
  truncationFixtures.ellipsis,
  truncationFixtures.clip,
  truncationFixtures.nowrap,
  truncationFixtures.short,
];

/** The right-edge profile of one painted run. */
export interface EdgeProfile {
  /** Device pixels inspected in the band. */
  readonly sampled: number;
  /** Pixels within tolerance of the run's ink. */
  readonly ink: number;
  /** The tallest ink column, as a share of the box's device height. */
  readonly columnRatio: number;
  /** The share of device rows in the band that carry ink. */
  readonly rowRatio: number;
}

const EMPTY_PROFILE: EdgeProfile = {
  sampled: 0,
  ink: 0,
  columnRatio: 0,
  rowRatio: 0,
};

const emptyProfile = (): EdgeProfile => EMPTY_PROFILE;

/** A frame whose size does not match the window returns no evidence. */
const scaleOf = (
  frame: Pixels.Pixels,
  window: Smoke.WindowSize,
): Option.Option<number> => Pixels.frameScale(frame, window);

const offsetOf = (frame: Pixels.Pixels, x: number, y: number): number =>
  (y * frame.width + x) * 4;

const nearAt = (
  frame: Pixels.Pixels,
  x: number,
  y: number,
  ink: Pixels.Rgba,
  tolerance: number,
): boolean => {
  const offset = offsetOf(frame, x, y);
  return Pixels.rgbaNear(
    new Pixels.Rgba({
      r: frame.data[offset] ?? 0,
      g: frame.data[offset + 1] ?? 0,
      b: frame.data[offset + 2] ?? 0,
      a: frame.data[offset + 3] ?? 0,
    }),
    ink,
    tolerance,
  );
};

/**
 * Measure the rightmost `bandPx` logical columns **inside** a box.
 *
 * `columnRatio` is the discriminator: a column through an ellipsis dot carries
 * a few rows of ink, a column through a clipped capital carries the cap height.
 * `rowRatio` is the same question across rows and is kept for the failure text.
 */
export const edgeProfile = (
  frame: Pixels.Pixels,
  window: Smoke.WindowSize,
  box: Smoke.Bounds,
  ink: Pixels.Rgba,
  tolerance: number,
  bandPx: number,
): EdgeProfile =>
  Option.match(scaleOf(frame, window), {
    onNone: emptyProfile,
    onSome: (factor) =>
      edgeProfileAt(frame, box, ink, tolerance, bandPx, factor),
  });

const edgeProfileAt = (
  frame: Pixels.Pixels,
  box: Smoke.Bounds,
  ink: Pixels.Rgba,
  tolerance: number,
  bandPx: number,
  factor: number,
): EdgeProfile => {
  const boxStartX = Math.round(box.x * factor);
  const boxEndX = Math.round((box.x + box.width) * factor);
  const startX = Math.max(boxStartX, boxEndX - Math.round(bandPx * factor));
  const startY = Math.round(box.y * factor);
  const endY = Math.round((box.y + box.height) * factor);
  const height = Math.max(1, endY - startY);
  let sampled = 0;
  let inkCount = 0;
  let tallestColumn = 0;
  let inkRows = 0;
  for (let x = startX; x < boxEndX; x += 1) {
    if (x < 0 || x >= frame.width) {
      continue;
    }
    let column = 0;
    for (let y = startY; y < endY; y += 1) {
      if (y < 0 || y >= frame.height) {
        continue;
      }
      sampled += 1;
      if (nearAt(frame, x, y, ink, tolerance)) {
        column += 1;
        inkCount += 1;
      }
    }
    tallestColumn = Math.max(tallestColumn, column);
  }
  for (let y = startY; y < endY; y += 1) {
    if (y < 0 || y >= frame.height) {
      continue;
    }
    let carries = false;
    for (let x = startX; x < boxEndX; x += 1) {
      if (x >= 0 && x < frame.width && nearAt(frame, x, y, ink, tolerance)) {
        carries = true;
      }
    }
    inkRows += carries ? 1 : 0;
  }
  return {
    sampled,
    ink: inkCount,
    columnRatio: tallestColumn / height,
    rowRatio: inkRows / height,
  };
};

/** Ink strictly right of a run's box, inside the panel that bounds the scan. */
export interface SpillScan {
  readonly sampled: number;
  readonly ink: number;
}

/** Ink inside a whole box, used to prove the short control is not blank. */
export const scanBox = (
  frame: Pixels.Pixels,
  window: Smoke.WindowSize,
  box: Smoke.Bounds,
  ink: Pixels.Rgba,
  tolerance: number,
): SpillScan =>
  Option.match(scaleOf(frame, window), {
    onNone: () => ({ sampled: 0, ink: 0 }),
    onSome: (factor) => boxInkAt(frame, box, ink, tolerance, factor),
  });

const boxInkAt = (
  frame: Pixels.Pixels,
  box: Smoke.Bounds,
  ink: Pixels.Rgba,
  tolerance: number,
  factor: number,
): SpillScan => {
  const startX = Math.round(box.x * factor);
  const endX = Math.round((box.x + box.width) * factor);
  const startY = Math.round(box.y * factor);
  const endY = Math.round((box.y + box.height) * factor);
  let sampled = 0;
  let inkCount = 0;
  for (let y = startY; y < endY; y += 1) {
    if (y < 0 || y >= frame.height) {
      continue;
    }
    for (let x = startX; x < endX; x += 1) {
      if (x < 0 || x >= frame.width) {
        continue;
      }
      sampled += 1;
      if (nearAt(frame, x, y, ink, tolerance)) {
        inkCount += 1;
      }
    }
  }
  return { sampled, ink: inkCount };
};

/** Count ink in the strip between the run's right edge and the panel's. */
export const spillScan = (
  frame: Pixels.Pixels,
  window: Smoke.WindowSize,
  box: Smoke.Bounds,
  panel: Smoke.Bounds,
  ink: Pixels.Rgba,
  tolerance: number,
): SpillScan =>
  Option.match(scaleOf(frame, window), {
    onNone: () => ({ sampled: 0, ink: 0 }),
    onSome: (factor) => spillAt(frame, box, panel, ink, tolerance, factor),
  });

const spillAt = (
  frame: Pixels.Pixels,
  box: Smoke.Bounds,
  panel: Smoke.Bounds,
  ink: Pixels.Rgba,
  tolerance: number,
  factor: number,
): SpillScan => {
  const startX = Math.round((box.x + box.width) * factor);
  const endX = Math.round((panel.x + panel.width) * factor);
  const startY = Math.round(box.y * factor);
  const endY = Math.round((box.y + box.height) * factor);
  let sampled = 0;
  let inkCount = 0;
  for (let y = startY; y < endY; y += 1) {
    if (y < 0 || y >= frame.height) {
      continue;
    }
    for (let x = startX; x < endX; x += 1) {
      if (x < 0 || x >= frame.width) {
        continue;
      }
      sampled += 1;
      if (nearAt(frame, x, y, ink, tolerance)) {
        inkCount += 1;
      }
    }
  }
  return { sampled, ink: inkCount };
};

/** Enough interior ink for a painted run. */
export const hasInk = (profile: EdgeProfile, minimum: number): boolean =>
  profile.ink >= minimum;

/** The right edge is a dot run, not a clipped capital or a blank edge. */
export const looksLikeDots = (profile: EdgeProfile): boolean =>
  profile.sampled > 0 &&
  profile.ink > 0 &&
  profile.columnRatio <= DOT_COLUMN_CEILING;

/** The right edge is a clipped capital — the differential that falsifies dots. */
export const looksClipped = (profile: EdgeProfile): boolean =>
  profile.columnRatio >= CLIPPED_COLUMN_FLOOR;

/** No ink outside the run's box. */
export const noSpill = (scan: SpillScan): boolean =>
  scan.sampled > 0 && scan.ink === 0;

/** A failure's one-line profile, so the measured ratio is in the report. */
export const describeProfile = (profile: EdgeProfile): string =>
  `ink=${profile.ink}/${profile.sampled} column=${profile.columnRatio.toFixed(2)} row=${profile.rowRatio.toFixed(2)}`;

/** The four fixtures are distinct and cover every declaration. */
export const truncationFixturesDistinct = (
  fixtures: ReadonlyArray<TruncationFixture>,
): boolean =>
  Arr.length(Arr.dedupe(Arr.map(fixtures, (fixture) => fixture.testId))) ===
    Arr.length(fixtures) &&
  Arr.length(Arr.dedupe(Arr.map(fixtures, (fixture) => fixture.kind))) ===
    Arr.length(fixtures);
