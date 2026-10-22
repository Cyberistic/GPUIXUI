/**
 * The range a `<virtual-list>` reports, and the one thing a consumer must not
 * fake: an absent pair is not `0..0`.
 *
 * A list that has not built a window yet reports no indices, and a consumer that
 * reads a fabricated `0..0` as "the first row is visible" moves its window back
 * to the top or announces a row nobody can see.
 */

import type { EventPayload } from "@gpuix/react";
import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { visibleRange } from "./list.js";

/** The payload the list sends, with only the indices under test. */
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
    // The guard is absence, not falsiness: `0` is a real first index.
    expect(visibleRange(rangeEvent({ startIndex: 0, endIndex: 9 }))).toEqual(
      Option.some({ first: 0, last: 9 }),
    );
  });
});
