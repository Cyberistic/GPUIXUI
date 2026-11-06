import type { EventPayload } from "@gpuix/react";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { measuredBox, measuredHeight, measuredPoint } from "./measure.js";

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
    expect(
      Option.isNone(
        measuredBox(event({ x: Number.NaN, y: 40, width: 80, height: 32 })),
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

describe("measuredHeight", () => {
  it("reads the one side a sizing component needs", () => {
    expect(Option.getOrUndefined(measuredHeight(event({ height: 232 })))).toBe(
      232,
    );
  });

  it("refuses a height it cannot paint", () => {
    expect(Option.isNone(measuredHeight(event({})))).toBe(true);
    expect(Option.isNone(measuredHeight(event({ height: Number.NaN })))).toBe(
      true,
    );
    expect(
      Option.isNone(
        measuredHeight(event({ height: Number.POSITIVE_INFINITY })),
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
