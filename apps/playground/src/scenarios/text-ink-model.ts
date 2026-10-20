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
import type { ThemeColors } from "@gpuixui/tokens";
import { scanBox, type BoxScan } from "./frames.js";

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

/** A glyph scan, shared with every pixel probe that samples a box. */
export type InkScan = BoxScan;

/** Scan a run's box for pixels near `expected` (see `scanBox`). */
export const scanInk = scanBox;

/** Enough interior ink to be evidence, not a stray anti-aliased pixel. */
export const inkEvidence = (scan: InkScan, minimum: number): boolean =>
  scan.near >= minimum;
