/**
 * Multi-line `lineClamp`, in the frame (plan `829`).
 *
 * The bug being guarded: `lineClamp` was only ever measured as geometry (plan
 * `335`: `2 × 26 = 52`, `3 × 26 = 78`). A runtime that stopped laying out at N
 * lines but kept painting the rest, or one that grew an ellipsis from the clamp
 * alone, passed every existing check. The reconnaissance in the plan found both
 * halves of the rule: a clamped run paints **no ink below its box**, and
 * `lineClamp` **alone** paints no ellipsis — the mark needs `textOverflow`.
 *
 * This module owns the fixtures, the line-count and pitch rules, and the
 * last-line tail metric, so the view, the scenario and the unit tests read one
 * rule. Pixel walking is indexed on purpose: it visits tens of thousands of
 * bytes, and an `Arr` fold would allocate a wrapper per pixel.
 */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";
import type { Smoke } from "@gpuixui/testing";

/** The type size the reconnaissance measured (plan `342`'s 26 px line box). */
export const CLAMP_FONT_SIZE = 16;

/** The declared line height; the paint's line pitch is this in device pixels. */
export const CLAMP_LINE_HEIGHT = 26;

/** The width every run wraps inside. */
export const CLAMP_BOX_WIDTH = 240;

export const CLAMP_PANEL_WIDTH = 280;
export const CLAMP_PANEL_HEIGHT = 180;

/** Per-channel slack for ink; anti-aliasing can tint an edge, not move a role. */
export const CLAMP_TOLERANCE = 6;

/** The right-hand band of the last line that carries the truncation mark. */
export const TAIL_BAND = 32;

/** The three dots of an ellipsis glyph. */
export const DOT_COUNT = 3;

/** A dot is at most this share of the line box tall... */
export const DOT_HEIGHT_CEILING = 0.15;

/** ...and sits at least this far down the line (dots sit on the baseline). */
export const DOT_TOP_FLOOR = 0.5;

/** The gap between two dots, as a share of the line box. */
export const DOT_GAP_CEILING = 0.2;

/** The whole dot run's span, as a share of the line box. */
export const DOT_SPAN_CEILING = 1.5;

/** A clipped glyph's tail is at least this share of the line box tall. */
export const GLYPH_TAIL_FLOOR = 0.2;

/** The unclamped control's measured wrap at 240 px and 16 px type. */
export const FREE_LINES = 4;

export const clampKinds = ["cut", "mark", "three", "free"] as const;

export type ClampKind = (typeof clampKinds)[number];

/** One fixture: its declaration, its run and its panel geometry. */
export interface ClampFixture {
  readonly kind: ClampKind;
  /** The box whose height, bands and last line are measured. */
  readonly testId: string;
  readonly panelId: string;
  readonly left: number;
  readonly top: number;
  /** Distinct per fixture: the layout cache key is `(string, width)`, not clamp. */
  readonly run: string;
  readonly clamp?: number;
  /** The line boxes the declaration must paint — the contract, not the input. */
  readonly lines: number;
  readonly ellipsis: boolean;
}

const RUN_CUT =
  "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau upsilon phi chi psi omega";
const RUN_MARK =
  "salt pepper cumin paprika oregano basil thyme rosemary sage parsley coriander turmeric ginger garlic onion chive dill fennel";
const RUN_THREE =
  "one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen";
const RUN_FREE =
  "red orange yellow green blue indigo violet black white grey brown pink teal cyan magenta olive maroon navy silver lime";

/** The four fixtures, in document order, on the plan-829 stage. */
export const clampFixtures: Record<ClampKind, ClampFixture> = {
  cut: {
    kind: "cut",
    testId: "clamp-cut",
    panelId: "clamp-panel-cut",
    left: 16,
    top: 16,
    run: RUN_CUT,
    clamp: 2,
    lines: 2,
    ellipsis: false,
  },
  mark: {
    kind: "mark",
    testId: "clamp-mark",
    panelId: "clamp-panel-mark",
    left: 336,
    top: 16,
    run: RUN_MARK,
    clamp: 2,
    lines: 2,
    ellipsis: true,
  },
  three: {
    kind: "three",
    testId: "clamp-three",
    panelId: "clamp-panel-three",
    left: 16,
    top: 200,
    run: RUN_THREE,
    clamp: 3,
    lines: 3,
    ellipsis: false,
  },
  free: {
    kind: "free",
    testId: "clamp-free",
    panelId: "clamp-panel-free",
    left: 336,
    top: 200,
    run: RUN_FREE,
    lines: FREE_LINES,
    ellipsis: false,
  },
};

export const CLAMP_FIXTURES: ReadonlyArray<ClampFixture> = [
  clampFixtures.cut,
  clampFixtures.mark,
  clampFixtures.three,
  clampFixtures.free,
];

/**
 * The line boxes a fixture must paint. This is the contract the paint is
 * measured against, deliberately **not** derived from `clamp`: a declaration
 * that disagrees with the contract has to fail, not move the expectation.
 */
export const expectedLines = (fixture: ClampFixture): number => fixture.lines;

/** The box height those lines measure. */
export const expectedHeight = (fixture: ClampFixture): number =>
  expectedLines(fixture) * CLAMP_LINE_HEIGHT;

/** The last line's box, which carries the truncation mark. */
export const lastLineOf = (box: Smoke.Bounds): Smoke.Bounds => ({
  x: box.x,
  y: box.y + box.height - CLAMP_LINE_HEIGHT,
  width: box.width,
  height: CLAMP_LINE_HEIGHT,
});

/** The strip between a box's bottom and its panel's bottom. */
export const stripBelow = (
  box: Smoke.Bounds,
  panel: Smoke.Bounds,
): Smoke.Bounds => ({
  x: box.x,
  y: box.y + box.height,
  width: box.width,
  height: panel.y + panel.height - (box.y + box.height),
});

/**
 * The strip after a logical line mark — the region an unclamped run fills and a
 * clamped one must leave blank. Anchored to the box's top, not its measured
 * height, so the unclamped control can be asked the same question.
 */
export const stripAfterLines = (
  box: Smoke.Bounds,
  lines: number,
  panel: Smoke.Bounds,
): Smoke.Bounds => {
  const y = box.y + lines * CLAMP_LINE_HEIGHT;
  return {
    x: box.x,
    y,
    width: box.width,
    height: panel.y + panel.height - y,
  };
};

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

/** One contiguous run of ink rows inside a box, relative to its top. */
export interface InkBand {
  readonly top: number;
  readonly bottom: number;
}

/** Contiguous ink row bands inside a box, in device pixels from the box top. */
export const inkBands = (
  frame: Pixels.Pixels,
  window: Smoke.WindowSize,
  box: Smoke.Bounds,
  ink: Pixels.Rgba,
  tolerance: number,
): ReadonlyArray<InkBand> =>
  Option.match(scaleOf(frame, window), {
    onNone: () => [],
    onSome: (factor) => bandsAt(frame, box, ink, tolerance, factor),
  });

const bandsAt = (
  frame: Pixels.Pixels,
  box: Smoke.Bounds,
  ink: Pixels.Rgba,
  tolerance: number,
  factor: number,
): ReadonlyArray<InkBand> => {
  const startX = Math.round(box.x * factor);
  const endX = Math.round((box.x + box.width) * factor);
  const startY = Math.round(box.y * factor);
  const endY = Math.round((box.y + box.height) * factor);
  const bands: Array<InkBand> = [];
  let openTop = -1;
  let lastInk = -1;
  for (let y = startY; y < endY; y += 1) {
    if (y < 0 || y >= frame.height) {
      continue;
    }
    let carries = false;
    for (let x = startX; x < endX && !carries; x += 1) {
      if (x >= 0 && x < frame.width && nearAt(frame, x, y, ink, tolerance)) {
        carries = true;
      }
    }
    if (carries) {
      openTop = openTop < 0 ? y - startY : openTop;
      lastInk = y - startY;
    } else if (openTop >= 0) {
      bands.push({ top: openTop, bottom: lastInk });
      openTop = -1;
    }
  }
  if (openTop >= 0) {
    bands.push({ top: openTop, bottom: lastInk });
  }
  return bands;
};

/** The distance between consecutive band tops, in device pixels. */
export const bandPitches = (
  bands: ReadonlyArray<InkBand>,
): ReadonlyArray<number> =>
  Arr.map(
    Arr.zip(Arr.drop(bands, 1), bands),
    ([later, earlier]) => later.top - earlier.top,
  );

/** Every band gap is the declared line height (one device pixel of rounding). */
export const uniformPitch = (
  pitches: ReadonlyArray<number>,
  expected: number,
): boolean =>
  Arr.length(pitches) > 0 &&
  Arr.every(pitches, (pitch) => Math.abs(pitch - expected) <= 1);

export const describePitches = (pitches: ReadonlyArray<number>): string =>
  Arr.match(pitches, {
    onEmpty: () => "no pitch",
    onNonEmpty: (values) => values.join(","),
  });

/** What a scan of one strip found. */
export interface StripScan {
  /** Device pixels inspected in the strip. */
  readonly sampled: number;
  /** Pixels within tolerance of the ink colour. */
  readonly ink: number;
}

/** Ink inside a strip; `sampled: 0` means the strip was not on the frame. */
export const inkInStrip = (
  frame: Pixels.Pixels,
  window: Smoke.WindowSize,
  strip: Smoke.Bounds,
  ink: Pixels.Rgba,
  tolerance: number,
): StripScan =>
  Option.match(scaleOf(frame, window), {
    onNone: () => ({ sampled: 0, ink: 0 }),
    onSome: (factor) => stripAt(frame, strip, ink, tolerance, factor),
  });

const stripAt = (
  frame: Pixels.Pixels,
  strip: Smoke.Bounds,
  ink: Pixels.Rgba,
  tolerance: number,
  factor: number,
): StripScan => {
  const startX = Math.round(strip.x * factor);
  const endX = Math.round((strip.x + strip.width) * factor);
  const startY = Math.round(strip.y * factor);
  const endY = Math.round((strip.y + strip.height) * factor);
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

/** A strip that was sampled and held no ink. */
export const noInk = (scan: StripScan): boolean =>
  scan.sampled > 0 && scan.ink === 0;

/** A strip that was sampled and held ink — the non-vacuity twin. */
export const hasInk = (scan: StripScan): boolean =>
  scan.sampled > 0 && scan.ink > 0;

/** One contiguous run of ink columns, relative to the last line's top-left. */
export interface InkCluster {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly height: number;
}

/**
 * The ink clusters in the rightmost `bandPx` logical columns of a line box.
 *
 * The box is the **last line**, so `top` and `height` are measured from that
 * line's top: a dot sits low and short, a clipped glyph tail is tall.
 */
export const tailClusters = (
  frame: Pixels.Pixels,
  window: Smoke.WindowSize,
  box: Smoke.Bounds,
  ink: Pixels.Rgba,
  tolerance: number,
  bandPx: number,
): ReadonlyArray<InkCluster> =>
  Option.match(scaleOf(frame, window), {
    onNone: () => [],
    onSome: (factor) => clustersAt(frame, box, ink, tolerance, bandPx, factor),
  });

const clustersAt = (
  frame: Pixels.Pixels,
  box: Smoke.Bounds,
  ink: Pixels.Rgba,
  tolerance: number,
  bandPx: number,
  factor: number,
): ReadonlyArray<InkCluster> => {
  const startX = Math.round(box.x * factor);
  const endX = Math.round((box.x + box.width) * factor);
  const startY = Math.round(box.y * factor);
  const endY = Math.round((box.y + box.height) * factor);
  const lastInk = lastInkColumn(
    frame,
    startX,
    endX,
    startY,
    endY,
    ink,
    tolerance,
  );
  if (lastInk < 0) {
    return [];
  }
  const from = Math.max(startX, lastInk - Math.round(bandPx * factor) + 1);
  const clusters: Array<InkCluster> = [];
  let left = -1;
  let right = -1;
  let top = 0;
  let bottom = 0;
  for (let x = from; x <= lastInk; x += 1) {
    const extent = columnExtent(frame, x, startY, endY, ink, tolerance);
    if (Option.isNone(extent)) {
      if (left >= 0) {
        clusters.push({ left, right, top, height: bottom - top + 1 });
        left = -1;
      }
      continue;
    }
    if (left < 0) {
      left = x - startX;
      top = extent.value.top - startY;
      bottom = extent.value.bottom - startY;
    } else {
      top = Math.min(top, extent.value.top - startY);
      bottom = Math.max(bottom, extent.value.bottom - startY);
    }
    right = x - startX;
  }
  if (left >= 0) {
    clusters.push({ left, right, top, height: bottom - top + 1 });
  }
  return clusters;
};

const lastInkColumn = (
  frame: Pixels.Pixels,
  startX: number,
  endX: number,
  startY: number,
  endY: number,
  ink: Pixels.Rgba,
  tolerance: number,
): number => {
  for (let x = endX - 1; x >= startX; x -= 1) {
    if (
      x >= 0 &&
      x < frame.width &&
      Option.isSome(columnExtent(frame, x, startY, endY, ink, tolerance))
    ) {
      return x;
    }
  }
  return -1;
};

const columnExtent = (
  frame: Pixels.Pixels,
  x: number,
  startY: number,
  endY: number,
  ink: Pixels.Rgba,
  tolerance: number,
): Option.Option<{ readonly top: number; readonly bottom: number }> => {
  let top = -1;
  let bottom = -1;
  for (let y = startY; y < endY; y += 1) {
    if (y < 0 || y >= frame.height) {
      continue;
    }
    if (nearAt(frame, x, y, ink, tolerance)) {
      top = top < 0 ? y : top;
      bottom = y;
    }
  }
  return top < 0 ? Option.none() : Option.some({ top, bottom });
};

/** The maximal suffix of dot-shaped clusters, with its gaps and span. */
export interface DotRun {
  readonly count: number;
  /** Blank device columns between consecutive dots. */
  readonly gaps: ReadonlyArray<number>;
  /** First dot's left to last dot's right, in device pixels. */
  readonly span: number;
}

const isDot = (cluster: InkCluster, lineHeightPx: number): boolean =>
  cluster.height <= DOT_HEIGHT_CEILING * lineHeightPx &&
  cluster.top >= DOT_TOP_FLOOR * lineHeightPx;

export const dotRun = (
  clusters: ReadonlyArray<InkCluster>,
  lineHeightPx: number,
): DotRun => {
  const dots = Arr.reverse(
    Arr.takeWhile(Arr.reverse(clusters), (cluster) =>
      isDot(cluster, lineHeightPx),
    ),
  );
  const gaps = Arr.map(
    Arr.zip(Arr.drop(dots, 1), dots),
    ([later, earlier]) => later.left - earlier.right - 1,
  );
  const first = dots[0];
  const last = dots[Arr.length(dots) - 1];
  return {
    count: Arr.length(dots),
    gaps,
    span:
      first === undefined || last === undefined
        ? 0
        : last.right - first.left + 1,
  };
};

/** The dot run is exactly the ellipsis glyph: three low dots, tightly spaced. */
export const isEllipsis = (run: DotRun, lineHeightPx: number): boolean =>
  run.count === DOT_COUNT &&
  run.span > 0 &&
  run.span <= DOT_SPAN_CEILING * lineHeightPx &&
  Arr.every(
    run.gaps,
    (gap) => gap >= 0 && gap <= DOT_GAP_CEILING * lineHeightPx,
  );

/** The rightmost cluster's height as a share of the line box. */
export const glyphTail = (
  clusters: ReadonlyArray<InkCluster>,
  lineHeightPx: number,
): number =>
  lineHeightPx <= 0
    ? 0
    : Option.match(Arr.last(clusters), {
        onNone: () => 0,
        onSome: (cluster) => cluster.height / lineHeightPx,
      });

/** A failure's one-line tail, so the measured clusters are in the report. */
export const describeClusters = (clusters: ReadonlyArray<InkCluster>): string =>
  Arr.match(clusters, {
    onEmpty: () => "no ink",
    onNonEmpty: (values) =>
      Arr.map(
        (cluster) =>
          `${cluster.left}..${cluster.right}(h${cluster.height},top${cluster.top})`,
      )(values).join(" "),
  });

/** The four fixtures are distinct, including their runs (the cache trap). */
export const fixturesDistinct = (
  fixtures: ReadonlyArray<ClampFixture>,
): boolean =>
  Arr.length(Arr.dedupe(Arr.map(fixtures, (fixture) => fixture.testId))) ===
    Arr.length(fixtures) &&
  Arr.length(Arr.dedupe(Arr.map(fixtures, (fixture) => fixture.run))) ===
    Arr.length(fixtures) &&
  Arr.length(Arr.dedupe(Arr.map(fixtures, (fixture) => fixture.kind))) ===
    Arr.length(fixtures);
