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
