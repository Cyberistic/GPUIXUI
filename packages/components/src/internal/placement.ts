import type { FloatingAlign, FloatingSide } from "@gpuix/react/floating";
import { Match } from "effect";
import * as Schema from "effect/Schema";

export interface FloatingBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface WindowBounds {
  readonly width: number;
  readonly height: number;
}

export interface PlacementInput {
  readonly side: unknown;

  readonly align: unknown;
  readonly trigger: FloatingBounds;

  readonly surface: FloatingBounds;
  readonly window: WindowBounds;
  readonly margin: number;
}

export interface Placement {
  readonly side: FloatingSide;
  readonly align: FloatingAlign;
  readonly alignOffset: number;
}

const PlacementSide = Schema.Literals(["top", "right", "bottom", "left"]);

export const isAlign = Schema.is(Schema.Literals(["start", "center", "end"]));

const sideOf = (side: unknown): FloatingSide =>
  Schema.is(PlacementSide)(side) ? side : "bottom";

const alignOf = (align: unknown): FloatingAlign =>
  isAlign(align) ? align : "start";

const oppositeSide = (side: unknown): FloatingSide =>
  Match.value(sideOf(side)).pipe(
    Match.when("top", () => "bottom" as const),
    Match.when("bottom", () => "top" as const),
    Match.when("left", () => "right" as const),
    Match.when("right", () => "left" as const),
    Match.exhaustive,
  );

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

const extentOn = (side: unknown, surface: FloatingBounds): number =>
  Match.value(sideOf(side)).pipe(
    Match.when("top", () => surface.height),
    Match.when("bottom", () => surface.height),
    Match.when("left", () => surface.width),
    Match.when("right", () => surface.width),
    Match.exhaustive,
  );

export const resolveSide = (input: PlacementInput): FloatingSide => {
  const side = sideOf(input.side);
  const extent = extentOn(side, input.surface);
  if (roomOn(side, input) >= extent) return side;

  const opposite = oppositeSide(side);
  const oppositeRoom = roomOn(opposite, input);
  if (oppositeRoom >= extentOn(opposite, input.surface)) return opposite;

  return oppositeRoom > roomOn(side, input) ? opposite : side;
};

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

const hostAlign = (align: FloatingAlign): "start" | "end" =>
  align === "end" ? "end" : "start";

export const requestedPlacement = (
  side: unknown,
  align: unknown,
): Placement => ({
  side: sideOf(side),
  align: hostAlign(alignOf(align)),
  alignOffset: 0,
});

export const resolvePlacement = (input: PlacementInput): Placement => {
  const side = resolveSide(input);
  return {
    side,
    align: hostAlign(alignOf(input.align)),
    alignOffset: alignOffsetOn(side, input.align, input.trigger, input.surface),
  };
};
