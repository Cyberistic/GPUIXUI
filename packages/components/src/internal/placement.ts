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
 *
 * `side` and `align` are named by the caller but can arrive from persisted UI
 * state the library never type-checked, so every rule reads them through the
 * house guards below: an unknown name is the house `bottom`/`start` rather than
 * a `Match.exhaustive` that throws out of the render.
 */

import type { FloatingAlign, FloatingSide } from "@gpuix/react/floating";
import { Match } from "effect";
import * as Schema from "effect/Schema";

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
  /**
   * The requested side. `FloatingSide` is a compile-time guarantee, but a
   * persisted setting is not: a name the union does not carry opens the house
   * `bottom` side instead of throwing out of the render.
   */
  readonly side: unknown;
  /**
   * The requested alignment, read the same way: an unknown name is the house
   * `start`, never a `Match.exhaustive` failure.
   */
  readonly align: unknown;
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

/** The four sides the anchored layer paints. */
const PlacementSide = Schema.Literals(["top", "right", "bottom", "left"]);

/** The three alignments the anchored layer paints. */
const PlacementAlign = Schema.Literals(["start", "center", "end"]);

/**
 * The side a stored choice asks for, or the house `bottom`.
 *
 * `side` is a prop a surface takes, and a surface can be opened with a value an
 * application restored from persisted UI state — a value the library never
 * type-checked. Reading it through the schema keeps that door closed: an
 * unknown name opens the house side rather than reaching a `Match.exhaustive`
 * that throws out of the render.
 */
const sideOf = (side: unknown): FloatingSide =>
  Schema.is(PlacementSide)(side) ? side : "bottom";

/** The alignment a stored choice asks for, or the house `start`. */
const alignOf = (align: unknown): FloatingAlign =>
  Schema.is(PlacementAlign)(align) ? align : "start";

const oppositeSide = (side: unknown): FloatingSide =>
  Match.value(sideOf(side)).pipe(
    Match.when("top", () => "bottom" as const),
    Match.when("bottom", () => "top" as const),
    Match.when("left", () => "right" as const),
    Match.when("right", () => "left" as const),
    Match.exhaustive,
  );

/** The room a side offers, measured from the trigger to the window edge. */
const roomOn = (side: unknown, input: PlacementInput): number =>
  Match.value(sideOf(side)).pipe(
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
const extentOn = (side: unknown, surface: FloatingBounds): number =>
  Match.value(sideOf(side)).pipe(
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
  const side = sideOf(input.side);
  if (!overlaps(input.surface, input.trigger)) return side;

  const opposite = oppositeSide(side);
  const oppositeRoom = roomOn(opposite, input);
  if (oppositeRoom >= extentOn(opposite, input.surface)) return opposite;

  return oppositeRoom > roomOn(side, input) ? opposite : side;
};

/**
 * The offset that turns a `start`-anchored surface into a true centre. GPUix's
 * own `center` is not usable: it centres on the trigger's containing block, not
 * on the trigger (measured in plan 323), so `center` is mapped to `start` plus
 * half the difference between the trigger and the surface.
 */
const alignOffsetOn = (
  side: unknown,
  align: unknown,
  trigger: FloatingBounds,
  surface: FloatingBounds,
): number =>
  Match.value(alignOf(align)).pipe(
    Match.when("center", () =>
      Match.value(sideOf(side)).pipe(
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

/** The host alignment: GPUix's own `center` is not usable (see above). */
const hostAlign = (align: FloatingAlign): "start" | "end" =>
  align === "end" ? "end" : "start";

/**
 * The placement a surface asks for before it has been measured.
 *
 * A first render has no boxes yet, so it paints the requested side and a
 * `start`/`end` alignment with no offset; `center` becomes `start` here for the
 * same reason {@link resolvePlacement} maps it. The values are read through the
 * house guards, so a stored name the union does not carry never reaches the
 * anchored layer.
 */
export const requestedPlacement = (
  side: unknown,
  align: unknown,
): Placement => ({
  side: sideOf(side),
  align: hostAlign(alignOf(align)),
  alignOffset: 0,
});

/**
 * The placement to render, resolved once per open. `center` becomes `start` plus
 * an offset because the host's `center` centres on the containing block.
 */
export const resolvePlacement = (input: PlacementInput): Placement => {
  const side = resolveSide(input);
  return {
    side,
    align: hostAlign(alignOf(input.align)),
    alignOffset: alignOffsetOn(side, input.align, input.trigger, input.surface),
  };
};
