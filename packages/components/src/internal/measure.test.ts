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
import { measuredBox } from "./measure.js";

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
