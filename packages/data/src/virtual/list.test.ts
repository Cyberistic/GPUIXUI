import type { EventPayload } from "@gpuix/react";
import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { visibleRange } from "./list.js";

const rangeEvent = (indices: {
  readonly startIndex?: number;
  readonly endIndex?: number;
}): EventPayload => ({ elementId: 1, eventType: "visibleRange", ...indices });

describe("the list's reported range", () => {
  it("reads the two absolute indices the runtime reported", () => {
    expect(visibleRange(rangeEvent({ startIndex: 12, endIndex: 21 }))).toEqual(
      Option.some({ first: 12, last: 21 }),
    );
  });

  it("reports nothing when the window has no first row", () => {
    expect(visibleRange(rangeEvent({ endIndex: 21 }))).toEqual(Option.none());
  });

  it("reports nothing when the window has no last row", () => {
    expect(visibleRange(rangeEvent({ startIndex: 12 }))).toEqual(Option.none());
  });

  it("keeps a zero first row when the runtime really reported it", () => {
    expect(visibleRange(rangeEvent({ startIndex: 0, endIndex: 9 }))).toEqual(
      Option.some({ first: 0, last: 9 }),
    );
  });
});
