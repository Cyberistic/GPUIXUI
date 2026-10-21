/**
 * Placement rules for GPUix's anchored layer, measured against 0.11.0.
 *
 * The runtime positions `start`/`end` exactly and snaps a surface inside the
 * window, but two measured defects remain (plan 156 §8, re-measured in plan 323):
 *
 * - `align="center"` puts the surface's *end* on the anchor's centre line, so it
 *   is short by half the surface on both axes. The host applies an `offset` after
 *   positioning, which is where the half-size compensation goes.
 * - `fit="snap"` clamps to the window instead of flipping, so a bottom surface
 *   near the window edge is moved up **over** its trigger.
 *
 * The rules here are pure: the caller measures, this module decides. They are
 * intentionally one-shot — a caller applies the result once per open so a flip
 * can never oscillate.
 */

import type { FloatingAlign, FloatingSide } from "@gpuix/react/floating";
import { Match } from "effect";

/** A box in window coordinates, as `getElementBounds` reports it. */
export interface FloatingBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** The window the surface must stay inside. */
export interface WindowBounds {
  readonly width: number;
  readonly height: number;
}

/** Everything the rule needs; `surface` is the already-snapped box. */
export interface PlacementInput {
  readonly side: FloatingSide;
  readonly align: FloatingAlign;
  readonly trigger: FloatingBounds;
  readonly surface: FloatingBounds;
  readonly window: WindowBounds;
  readonly margin: number;
}

/** The side and alignment to use, plus the host offset that corrects `center`. */
export interface Placement {
  readonly side: FloatingSide;
  readonly align: FloatingAlign;
  readonly alignOffset: number;
}

const oppositeSide = (side: FloatingSide): FloatingSide =>
  Match.value(side).pipe(
    Match.when("top", () => "bottom" as const),
    Match.when("bottom", () => "top" as const),
    Match.when("left", () => "right" as const),
    Match.when("right", () => "left" as const),
    Match.exhaustive,
  );

/** The room a side offers, measured from the trigger to the window edge. */
const roomOn = (side: FloatingSide, input: PlacementInput): number =>
  Match.value(side).pipe(
    Match.when("top", () => input.trigger.y - input.margin),
    Match.when(
      "bottom",
      () =>
        input.window.height -
        input.margin -
        (input.trigger.y + input.trigger.height),
    ),
    Match.when("left", () => input.trigger.x - input.margin),
    Match.when(
      "right",
      () =>
        input.window.width -
        input.margin -
        (input.trigger.x + input.trigger.width),
    ),
    Match.exhaustive,
  );

/** The surface extent that has to fit along the side's axis. */
const extentOn = (side: FloatingSide, surface: FloatingBounds): number =>
  Match.value(side).pipe(
    Match.when("top", () => surface.height),
    Match.when("bottom", () => surface.height),
    Match.when("left", () => surface.width),
    Match.when("right", () => surface.width),
    Match.exhaustive,
  );

const overlaps = (a: FloatingBounds, b: FloatingBounds): boolean =>
  a.x < b.x + b.width &&
  b.x < a.x + a.width &&
  a.y < b.y + b.height &&
  b.y < a.y + a.height;

/**
 * The side the surface opens on. The requested side wins unless the snapped
 * surface covers its trigger; then the opposite side is used when it fits, and
 * the roomier of the two otherwise.
 */
export const resolveSide = (input: PlacementInput): FloatingSide => {
  if (!overlaps(input.surface, input.trigger)) return input.side;

  const opposite = oppositeSide(input.side);
  const oppositeRoom = roomOn(opposite, input);
  if (oppositeRoom >= extentOn(opposite, input.surface)) return opposite;

  return oppositeRoom > roomOn(input.side, input) ? opposite : input.side;
};

/**
 * The offset that turns a `start`-anchored surface into a true centre. GPUix's
 * own `center` is not usable: it centres on the trigger's containing block, not
 * on the trigger (measured in plan 323), so `center` is mapped to `start` plus
 * half the difference between the trigger and the surface.
 */
const alignOffsetOn = (
  side: FloatingSide,
  align: FloatingAlign,
  trigger: FloatingBounds,
  surface: FloatingBounds,
): number =>
  Match.value(align).pipe(
    Match.when("center", () =>
      Match.value(side).pipe(
        Match.when("top", () => (trigger.width - surface.width) / 2),
        Match.when("bottom", () => (trigger.width - surface.width) / 2),
        Match.when("left", () => (trigger.height - surface.height) / 2),
        Match.when("right", () => (trigger.height - surface.height) / 2),
        Match.exhaustive,
      ),
    ),
    Match.when("start", () => 0),
    Match.when("end", () => 0),
    Match.exhaustive,
  );

/**
 * The placement to render, resolved once per open. `center` becomes `start` plus
 * an offset because the host's `center` centres on the containing block.
 */
export const resolvePlacement = (input: PlacementInput): Placement => {
  const side = resolveSide(input);
  return {
    side,
    align: Match.value(input.align).pipe(
      Match.when("center", () => "start" as const),
      Match.when("start", () => "start" as const),
      Match.when("end", () => "end" as const),
      Match.exhaustive,
    ),
    alignOffset: alignOffsetOn(side, input.align, input.trigger, input.surface),
  };
};
