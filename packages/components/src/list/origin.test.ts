/**
 * The row a key event acts on.
 *
 * The bug this guards: the row a reader is on is not necessarily the row the list
 * recorded — a controlled selection, a filter, or a key that arrives at the list
 * itself all leave the record stale or absent — so moving from the recorded row
 * re-anchors the first arrow at the top of the list and Enter runs the wrong row.
 * The event names the row it came from on some renderers; a window names the
 * handler's own element instead, and reports the focused element separately, so
 * that reading sits between the sender and the record. The component supplies
 * both ids and this rule stays pure.
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
    expect(
      keyOrigin(rows, Option.some("a"), Option.some(13), Option.none()),
    ).toEqual(Option.some("c"));
  });

  it("takes the focused row when the payload names the handler's element", () => {
    // A window's payload names the list itself (id 99), so the record — stale
    // after a pointer focus that runs no `onFocus` — must not win.
    expect(
      keyOrigin(rows, Option.some("a"), Option.some(99), Option.some(12)),
    ).toEqual(Option.some("b"));
  });

  it("prefers the sending row over the focused one", () => {
    expect(
      keyOrigin(rows, Option.some("a"), Option.some(13), Option.some(12)),
    ).toEqual(Option.some("c"));
  });

  it("falls back to the recorded row for a key from the list itself", () => {
    // The list root has an id, but it is not a row, and nothing is focused.
    expect(
      keyOrigin(rows, Option.some("b"), Option.some(99), Option.none()),
    ).toEqual(Option.some("b"));
  });

  it("falls back to the recorded row when an id names no row", () => {
    expect(
      keyOrigin(rows, Option.some("b"), Option.some(99), Option.some(98)),
    ).toEqual(Option.some("b"));
  });

  it("falls back to the recorded row when the event carries no ids", () => {
    expect(
      keyOrigin(rows, Option.some("b"), Option.none(), Option.none()),
    ).toEqual(Option.some("b"));
  });

  it("is None when neither a row nor a recorded row exists", () => {
    expect(
      keyOrigin(rows, Option.none(), Option.some(99), Option.some(98)),
    ).toEqual(Option.none());
  });
});
