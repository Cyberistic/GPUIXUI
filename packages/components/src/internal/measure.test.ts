/**
 * The layout payload every measuring component reads.
 *
 * The bug this guards: a click event also carries `x`/`y`, so a parser that only
 * checked a position would hand a component a "box" with no size — and a
 * component that measures itself would place its layer against half a box.
 */

import type { EventPayload } from "@gpuix/react";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { measuredBox, measuredPoint } from "./measure.js";

const event = (fields: Partial<EventPayload>): EventPayload => ({
  elementId: 1,
  eventType: "layout",
  ...fields,
});

describe("measuredBox", () => {
  it("reads the four sides of a layout event", () => {
    expect(
      Option.getOrUndefined(
        measuredBox(event({ x: 100, y: 40, width: 80, height: 32 })),
      ),
    ).toEqual({ x: 100, y: 40, width: 80, height: 32 });
  });

  it("refuses a position without a size", () => {
    expect(
      Option.isNone(measuredBox(event({ x: 100, y: 40, height: 32 }))),
    ).toBe(true);
  });

  it("refuses a box missing a side", () => {
    expect(
      Option.isNone(measuredBox(event({ x: 100, y: 40, width: 80 }))),
    ).toBe(true);
  });
});

describe("measuredPoint", () => {
  it("reads a move that carries a position and no size", () => {
    expect(
      Option.getOrUndefined(
        measuredPoint({ elementId: 1, eventType: "mouseMove", x: 12, y: 8 }),
      ),
    ).toEqual({ x: 12, y: 8 });
  });

  it("reads a layout event's position too, so one seam serves both", () => {
    expect(
      Option.getOrUndefined(
        measuredPoint(event({ x: 100, y: 40, width: 80, height: 32 })),
      ),
    ).toEqual({ x: 100, y: 40 });
  });

  it("refuses a point missing an axis", () => {
    expect(
      Option.isNone(
        measuredPoint({ elementId: 1, eventType: "mouseMove", x: 12 }),
      ),
    ).toBe(true);
  });
});
