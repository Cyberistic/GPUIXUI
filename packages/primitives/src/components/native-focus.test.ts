/**
 * The native-focus comparison rule (plan `590`).
 *
 * The provider publishes the renderer's focused host id; each control decides
 * whether that id is its own. A wrong comparison is invisible in a screenshot
 * on a runtime that dispatches events, so the rule is pinned here in both
 * directions: the same id is focused, a different id and every absent case are
 * not.
 */

import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { isTrackedFocus, trackedFocusIndex } from "./internal.js";

describe("isTrackedFocus", () => {
  it("matches only the same host id", () => {
    expect(isTrackedFocus(Option.some(7), 7)).toBe(true);
    expect(isTrackedFocus(Option.some(7), 8)).toBe(false);
  });

  it("treats a missing provider, host or focused id as unfocused", () => {
    expect(isTrackedFocus(undefined, 7)).toBe(false);
    expect(isTrackedFocus(Option.none(), 7)).toBe(false);
    expect(isTrackedFocus(Option.some(7), undefined)).toBe(false);
  });
});

describe("trackedFocusIndex", () => {
  const ids = new Map([
    [0, 10],
    [1, 20],
  ]);

  it("turns the tracked id back into the item index", () => {
    expect(trackedFocusIndex(ids, Option.some(20))).toStrictEqual(
      Option.some(1),
    );
  });

  it("reports no index for an unknown id or no provider", () => {
    expect(trackedFocusIndex(ids, Option.some(99))).toStrictEqual(
      Option.none(),
    );
    expect(trackedFocusIndex(ids, undefined)).toStrictEqual(Option.none());
  });
});
