/**
 * Text decoration: does a declared `underline`/`line-through` reach the frame?
 *
 * The bug being guarded: `textDecoration` is declared by the pinned runtime and
 * shipped by the `link` Button variant's hover refinement and by `tw`'s
 * `underline`, but every existing check reads the **authored** style or the
 * **source** run. A runtime that accepted the property and drew no line would
 * leave a link's hover affordance and a struck-through row invisible while the
 * suite stayed green.
 *
 * A decoration is a **continuous, near-full-width run of ink on one device
 * row**; a glyph row is short strokes separated by counters. This module owns
 * the fixtures, that metric and the band classification, so the view and the
 * expectations read the same fixture list and cannot drift.
 */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";
import type { Smoke } from "@gpuixui/testing";

/**
 * Per-channel slack for line pixels.
 *
 * Anti-aliasing may tint a thin line's edges; it cannot move the line to
 * another role. The decoration must carry the run's ink, so a panel-coloured
 * line fails.
 */
export const LINE_TOLERANCE = 6;

/** The share of the run's width a line must span before it counts. */
export const DECORATION_SPAN = 0.6;

/** Interior pixels that make the undeclared control's box more than blank. */
export const MIN_INK_PIXELS = 32;

/** A normalised vertical band, inclusive, measured from the scanned box's top. */
export type Band = readonly [number, number];

/**
 * Where an underline lands in a fixture **panel** — measured at `0.67` with an
 * underline painted 1–2 device px below the `<text>` box.
 */
export const UNDERLINE_BAND: Band = [0.62, 0.78];

/** Where a line-through lands in the panel — measured at `0.45`. */
export const STRIKE_BAND: Band = [0.35, 0.55];

/** Every row; used only for the undeclared control. */
export const ANY_BAND: Band = [0, 1];

/** The three declarations plus the wrapper shape the `link` variant uses. */
export const decorationKinds = [
  "none",
  "underline",
  "strike",
  "wrapper",
] as const;

export type DecorationKind = (typeof decorationKinds)[number];

/** One fixture: what it declares, its run and its panel geometry. */
export interface DecorationFixture {
  readonly kind: DecorationKind;
  readonly testId: string;
  readonly panelId: string;
  readonly left: number;
  readonly top: number;
}

export const DECORATION_PANEL_WIDTH = 280;
export const DECORATION_PANEL_HEIGHT = 96;

/**
 * The 2 × 2 stage, in document order.
 *
 * The wrapper fixture is the production shape: the `link` Button variant puts
 * `textDecoration` on its own `div`, not on the label, so only a div-level
 * declaration can prove the shipped path. `decoration-inherited-box` is that
 * wrapper's own id; the run keeps `decoration-inherited`.
 */
export const decorationFixtures: Record<DecorationKind, DecorationFixture> = {
  none: {
    kind: "none",
    testId: "decoration-none",
    panelId: "decoration-panel-none",
    left: 24,
    top: 24,
  },
  underline: {
    kind: "underline",
    testId: "decoration-underline",
    panelId: "decoration-panel-underline",
    left: 336,
    top: 24,
  },
  strike: {
    kind: "strike",
    testId: "decoration-strike",
    panelId: "decoration-panel-strike",
    left: 24,
    top: 136,
  },
  wrapper: {
    kind: "wrapper",
    testId: "decoration-inherited",
    panelId: "decoration-panel-inherited",
    left: 336,
    top: 136,
  },
};

export const DECORATION_FIXTURES: ReadonlyArray<DecorationFixture> = [
  decorationFixtures.none,
  decorationFixtures.underline,
  decorationFixtures.strike,
  decorationFixtures.wrapper,
];

/** Dense capitals, so a line is distinguishable from a glyph stem. */
export const DECORATION_RUN = "MMMM";

/** One type size for every fixture, so only the declaration varies. */
export const DECORATION_FONT_SIZE = 64;

/** The longest contiguous ink run on one device row of a painted box. */
export interface DecorationRow {
  /** Device row inside the box, 0 at the top. */
  readonly row: number;
  /** `row / box height`, so bands are resolution-independent. */
  readonly y: number;
  /** Device pixels, contiguous. */
  readonly span: number;
  /** The ink colour at the middle of that run. */
  readonly colour: Pixels.Rgba;
}

/** What one box's scan found. */
export interface DecorationScan {
  /** Device pixels inspected inside the box. */
  readonly sampled: number;
  /** Pixels within tolerance of the run's ink. */
  readonly ink: number;
  /** The row carrying the longest contiguous run, or `None` if there is none. */
  readonly widest: Option.Option<DecorationRow>;
}

const BLACK = new Pixels.Rgba({ r: 0, g: 0, b: 0, a: 255 });

/**
 * Scan the device pixels inside a painted box for a decoration line.
 *
 * The loops are indexed on purpose: this walks tens of thousands of pixels. A
 * frame whose size does not match the window returns `sampled: 0`, so a caller
 * cannot pass by sampling nothing.
 */
export const scanDecoration = (
  frame: Pixels.Pixels,
  window: Smoke.WindowSize,
  box: Smoke.Bounds,
  ink: Pixels.Rgba,
  tolerance: number,
): DecorationScan =>
  Option.match(Pixels.frameScale(frame, window), {
    onNone: () => ({ sampled: 0, ink: 0, widest: Option.none() }),
    onSome: (factor) => scanAtScale(frame, box, ink, tolerance, factor),
  });

const scanAtScale = (
  frame: Pixels.Pixels,
  box: Smoke.Bounds,
  ink: Pixels.Rgba,
  tolerance: number,
  factor: number,
): DecorationScan => {
  const startX = Math.round(box.x * factor);
  const endX = Math.round((box.x + box.width) * factor);
  const startY = Math.round(box.y * factor);
  const endY = Math.round((box.y + box.height) * factor);
  let sampled = 0;
  let inkCount = 0;
  let widest: Option.Option<DecorationRow> = Option.none();
  let bestSpan = 0;
  for (let y = startY; y < endY; y += 1) {
    if (y < 0 || y >= frame.height) {
      continue;
    }
    const row = readRow(frame, y, startX, endX, ink, tolerance);
    sampled += row.sampled;
    inkCount += row.ink;
    if (row.span > bestSpan) {
      bestSpan = row.span;
      widest = Option.some({
        row: y - startY,
        y: (y - startY) / Math.max(1, endY - startY),
        span: row.span,
        colour: row.colour,
      });
    }
  }
  return { sampled, ink: inkCount, widest };
};

interface RowScan {
  readonly sampled: number;
  readonly ink: number;
  readonly span: number;
  readonly colour: Pixels.Rgba;
}

/** Walk one device row, tracking the longest contiguous run of ink. */
const readRow = (
  frame: Pixels.Pixels,
  y: number,
  startX: number,
  endX: number,
  ink: Pixels.Rgba,
  tolerance: number,
): RowScan => {
  let sampled = 0;
  let count = 0;
  let span = 0;
  let runStart = -1;
  let run = 0;
  for (let x = startX; x < endX; x += 1) {
    if (x < 0 || x >= frame.width) {
      continue;
    }
    sampled += 1;
    if (nearAt(frame, x, y, ink, tolerance)) {
      count += 1;
      if (run === 0) {
        runStart = x;
      }
      run += 1;
      if (run > span) {
        span = run;
      }
    } else {
      run = 0;
    }
  }
  return {
    sampled,
    ink: count,
    span,
    colour:
      span === 0 ? BLACK : colourAt(frame, runStart + Math.floor(span / 2), y),
  };
};

const offsetOf = (frame: Pixels.Pixels, x: number, y: number): number =>
  (y * frame.width + x) * 4;

const colourAt = (frame: Pixels.Pixels, x: number, y: number): Pixels.Rgba => {
  const offset = offsetOf(frame, x, y);
  return new Pixels.Rgba({
    r: frame.data[offset] ?? 0,
    g: frame.data[offset + 1] ?? 0,
    b: frame.data[offset + 2] ?? 0,
    a: frame.data[offset + 3] ?? 0,
  });
};

const nearAt = (
  frame: Pixels.Pixels,
  x: number,
  y: number,
  ink: Pixels.Rgba,
  tolerance: number,
): boolean => Pixels.rgbaNear(colourAt(frame, x, y), ink, tolerance);

/** Which band a normalised row falls in, or `elsewhere` above the strike. */
export const bandOf = (y: number): "underline" | "strike" | "elsewhere" =>
  y >= UNDERLINE_BAND[0] && y <= UNDERLINE_BAND[1]
    ? "underline"
    : y >= STRIKE_BAND[0] && y <= STRIKE_BAND[1]
      ? "strike"
      : "elsewhere";

/** The widest row is a line in `band` that spans enough of the run's width. */
export const decorationPresent = (
  scan: DecorationScan,
  boxWidth: number,
  factor: number,
  band: Band,
): boolean =>
  Option.match(scan.widest, {
    onNone: () => false,
    onSome: (row) =>
      row.span >= boxWidth * factor * DECORATION_SPAN &&
      row.y >= band[0] &&
      row.y <= band[1],
  });

/** A full-width line exists anywhere in the box. */
export const anyDecoration = (
  scan: DecorationScan,
  boxWidth: number,
  factor: number,
): boolean => decorationPresent(scan, boxWidth, factor, ANY_BAND);

/** Enough ink to make the undeclared control a painted run, not a blank box. */
export const hasInk = (scan: DecorationScan, minimum: number): boolean =>
  scan.ink >= minimum;

/** The four fixtures are distinct and cover every declaration. */
export const decorationFixturesDistinct = (
  fixtures: ReadonlyArray<DecorationFixture>,
): boolean =>
  Arr.length(Arr.dedupe(Arr.map(fixtures, (fixture) => fixture.testId))) ===
    Arr.length(fixtures) &&
  Arr.length(Arr.dedupe(Arr.map(fixtures, (fixture) => fixture.kind))) ===
    Arr.length(fixtures);
