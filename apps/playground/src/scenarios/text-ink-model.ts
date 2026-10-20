/**
 * Text ink: does a declared `color` reach the pixels a `<text>` run paints?
 *
 * The bug being guarded: every text-colour claim in the suite reads either the
 * **authored** style (`paintedStyle`) or the **source** run
 * (`getPaintedText`). Nothing samples a glyph, so a runtime that accepted
 * `color` and rasterised every run in its default ink would leave
 * `foreground`, `mutedForeground`, `destructive` and `success` text
 * indistinguishable — while every existing check passed.
 *
 * This module owns the fixture roles, the ink scan and the guards. The view and
 * the expectations read the same {@link INK_FIXTURES}, so they cannot drift;
 * the frame is the other witness. The scan walks **device** pixels through
 * `Pixels.frameScale`, so a wrong device scale cannot silently read a nearby
 * pixel.
 */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";
import type { Smoke } from "@gpuixui/testing";
import type { ThemeColors } from "@gpuixui/tokens";

/**
 * Per-channel slack for glyph interior pixels.
 *
 * Rasterisation may tint an anti-aliased edge; it cannot move a role. The dark
 * palette's four roles are more than ten times this apart, so the cross checks
 * stay falsifiable.
 */
export const INK_TOLERANCE = 6;

/** Interior device pixels that must carry the token before it is evidence. */
export const MIN_INK_PIXELS = 32;

/** Dense strokes, so a large run has fully-covered interior pixels. */
export const INK_RUN = "MMMM";

/** One type size for all four runs, so only the role varies. */
export const INK_FONT_SIZE = 64;

/** The four roles the probe paints. */
export const inkRoles = [
  "foreground",
  "muted",
  "destructive",
  "success",
] as const;

export type InkRole = (typeof inkRoles)[number];

/** The four tokens under test, read from the theme rather than a literal. */
export interface InkFixtures {
  readonly foreground: string;
  readonly muted: string;
  readonly destructive: string;
  readonly success: string;
}

export const inkFixtures = (colors: ThemeColors): InkFixtures => ({
  foreground: colors.foreground,
  muted: colors.mutedForeground,
  destructive: colors.destructive,
  success: colors.success,
});

/** The role each fixture's cross check must **not** find. */
const successors: Record<InkRole, InkRole> = {
  foreground: "muted",
  muted: "destructive",
  destructive: "success",
  success: "foreground",
};

export const nextRole = (role: InkRole): InkRole => successors[role];

/** One fixture: its role, its text node and its panel geometry. */
export interface InkFixture {
  readonly role: InkRole;
  readonly testId: string;
  readonly panelId: string;
  readonly left: number;
  readonly top: number;
}

export const INK_PANEL_WIDTH = 280;
export const INK_PANEL_HEIGHT = 96;

/**
 * The 2 × 2 stage, in document order.
 *
 * The boxes are far apart on purpose: a fixture that sampled its neighbour
 * would make the cross check vacuous.
 */
export const INK_FIXTURES: ReadonlyArray<InkFixture> = [
  {
    role: "foreground",
    testId: "ink-foreground",
    panelId: "ink-panel-foreground",
    left: 24,
    top: 24,
  },
  {
    role: "muted",
    testId: "ink-muted",
    panelId: "ink-panel-muted",
    left: 336,
    top: 24,
  },
  {
    role: "destructive",
    testId: "ink-destructive",
    panelId: "ink-panel-destructive",
    left: 24,
    top: 136,
  },
  {
    role: "success",
    testId: "ink-success",
    panelId: "ink-panel-success",
    left: 336,
    top: 136,
  },
];

/** The four role values in fixture order. */
export const inkValues = (fixtures: InkFixtures): ReadonlyArray<string> => [
  fixtures.foreground,
  fixtures.muted,
  fixtures.destructive,
  fixtures.success,
];

/**
 * Every role is a different colour.
 *
 * A palette edit that collapses two roles would let every cross check pass while
 * proving nothing, so the probe refuses the fixture before a frame is sampled.
 */
export const distinctInk = (fixtures: InkFixtures): boolean => {
  const values = inkValues(fixtures);
  return Arr.length(Arr.dedupe(values)) === Arr.length(values);
};

/** What a scan of one painted run found. */
export interface InkScan {
  /** Device pixels inspected inside the box. */
  readonly sampled: number;
  /** Pixels within `tolerance` of the expected token. */
  readonly near: number;
  /** The inspected pixel closest to the expected token, for the failure text. */
  readonly closest: Pixels.Rgba;
}

const BLACK = new Pixels.Rgba({ r: 0, g: 0, b: 0, a: 255 });

const channelDistance = (left: number, right: number): number =>
  Math.abs(left - right);

const distanceTo = (pixel: Pixels.Rgba, expected: Pixels.Rgba): number =>
  Math.max(
    channelDistance(pixel.r, expected.r),
    channelDistance(pixel.g, expected.g),
    channelDistance(pixel.b, expected.b),
    channelDistance(pixel.a, expected.a),
  );

/**
 * Scan the device pixels inside a painted run's logical box.
 *
 * The loops are indexed on purpose: this walks tens of thousands of pixels, and
 * an `Arr` fold would allocate a wrapper per pixel. A frame whose size does not
 * match the window returns `sampled: 0`, so a caller cannot pass by sampling
 * nothing.
 */
export const scanInk = (
  frame: Pixels.Pixels,
  window: Smoke.WindowSize,
  box: Smoke.Bounds,
  expected: Pixels.Rgba,
  tolerance: number,
): InkScan => {
  return Option.match(Pixels.frameScale(frame, window), {
    onNone: () => ({ sampled: 0, near: 0, closest: BLACK }),
    onSome: (factor) => scanAtScale(frame, box, expected, tolerance, factor),
  });
};

const scanAtScale = (
  frame: Pixels.Pixels,
  box: Smoke.Bounds,
  expected: Pixels.Rgba,
  tolerance: number,
  factor: number,
): InkScan => {
  const startX = Math.round(box.x * factor);
  const endX = Math.round((box.x + box.width) * factor);
  const startY = Math.round(box.y * factor);
  const endY = Math.round((box.y + box.height) * factor);
  let sampled = 0;
  let near = 0;
  let closest = BLACK;
  let best = Number.POSITIVE_INFINITY;
  for (let y = startY; y < endY; y += 1) {
    if (y < 0 || y >= frame.height) {
      continue;
    }
    for (let x = startX; x < endX; x += 1) {
      if (x < 0 || x >= frame.width) {
        continue;
      }
      const offset = (y * frame.width + x) * 4;
      const pixel = new Pixels.Rgba({
        r: frame.data[offset] ?? 0,
        g: frame.data[offset + 1] ?? 0,
        b: frame.data[offset + 2] ?? 0,
        a: frame.data[offset + 3] ?? 0,
      });
      sampled += 1;
      if (Pixels.rgbaNear(pixel, expected, tolerance)) {
        near += 1;
      }
      const distance = distanceTo(pixel, expected);
      if (distance < best) {
        best = distance;
        closest = pixel;
      }
    }
  }
  return { sampled, near, closest };
};

/** Enough interior ink to be evidence, not a stray anti-aliased pixel. */
export const inkEvidence = (scan: InkScan, minimum: number): boolean =>
  scan.near >= minimum;
