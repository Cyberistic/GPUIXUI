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

  it("refuses a side it cannot paint", () => {
    // A measurement the runtime cannot have taken is no box: `NaN` and an
    // infinity reach an inset as a value the runtime draws as nothing, so a
    // component would move its layer to nowhere rather than keep the frame it
    // has. The payload is external input; this seam is where it is decoded.
    expect(
      Option.isNone(
        measuredBox(
          event({ x: Number.NaN, y: 40, width: 80, height: 32 }),
        ),
      ),
    ).toBe(true);
    expect(
      Option.isNone(
        measuredBox(
          event({ x: 100, y: 40, width: Number.POSITIVE_INFINITY, height: 32 }),
        ),
      ),
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

  it("refuses an axis it cannot paint", () => {
    // The same rule as the box: a pointer the payload cannot locate moves
    // nothing, instead of handing the formula a `NaN`.
    expect(
      Option.isNone(
        measuredPoint({
          elementId: 1,
          eventType: "mouseMove",
          x: 12,
          y: Number.NaN,
        }),
      ),
    ).toBe(true);
  });
});
