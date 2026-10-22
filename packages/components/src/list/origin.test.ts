/**
 * The row a key event acts on.
 *
 * The bug this guards: a window's `Tab` traversal focuses a row without running
 * its focus handler (measured by the playground's `tabs-lifecycle` on a trigger
 * of this shape), so the row a reader is on may not be the row the list
 * recorded. Moving from the recorded row re-anchors the first arrow at the top
 * of the list, and Enter runs nothing. The renderer cannot produce "focused with
 * no focus event" in its test host — its key send focuses the target — so this
 * rule is proven here, as a pure function, and the component passes it the
 * event's own element id.
 */

import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { keyOrigin, type OriginRow } from "./origin.js";

const rows: ReadonlyArray<OriginRow> = [
  { nativeId: 11, value: "a" },
  { nativeId: 12, value: "b" },
  { nativeId: 13, value: "c" },
];

describe("keyOrigin", () => {
  it("takes the row that sent the key, not the recorded row", () => {
    expect(keyOrigin(rows, Option.some("a"), Option.some(13))).toEqual(
      Option.some("c"),
    );
  });

  it("falls back to the recorded row for a key from the list itself", () => {
    // The list root has an id, but it is not a row.
    expect(keyOrigin(rows, Option.some("b"), Option.some(99))).toEqual(
      Option.some("b"),
    );
  });

  it("falls back to the recorded row when the event carries no element", () => {
    expect(keyOrigin(rows, Option.some("b"), Option.none())).toEqual(
      Option.some("b"),
    );
  });

  it("is None when neither a row nor a recorded row exists", () => {
    expect(keyOrigin(rows, Option.none(), Option.some(99))).toEqual(
      Option.none(),
    );
  });
});
