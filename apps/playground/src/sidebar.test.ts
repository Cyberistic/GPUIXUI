/**
 * Guards the playground sidebar's key rule.
 *
 * The probe that drives it (`shell-selection`) mounts the real `App`, so it
 * cannot run on a host with no binding; this file holds the arithmetic it
 * depends on. The bugs it catches:
 *
 * 1. a step that wraps instead of clamping, so the last row's `down` jumps to
 *    the first and the reader loses the end they were trying to reach;
 * 2. a step that does not clamp at all, so the cursor leaves the list and a
 *    press/Enter on the row indexes nothing;
 * 3. a key the list does not own being consumed, which would eat `Enter`, a
 *    typed character or `Tab` from the row that holds the focus;
 * 4. an empty list or a stale cursor (a row removed from the registry) pointing
 *    the arrows past the rows that exist.
 */
import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { sidebarCursor } from "./sidebar.js";

/** The index a key answers, or `none` — the rule's whole result, unwrapped. */
const next = (
  key: string | undefined,
  cursor: number,
  count: number,
): Option.Option<number> => sidebarCursor(key, cursor, count);

describe("the sidebar's key rule", () => {
  it("steps one row and clamps at both ends", () => {
    expect(next("down", 0, 3)).toEqual(Option.some(1));
    expect(next("up", 2, 3)).toEqual(Option.some(1));
    expect(next("down", 2, 3)).toEqual(Option.some(2));
    expect(next("up", 0, 3)).toEqual(Option.some(0));
  });

  it("jumps to either end on Home and End", () => {
    expect(next("home", 1, 3)).toEqual(Option.some(0));
    expect(next("end", 1, 3)).toEqual(Option.some(2));
    expect(next("home", 2, 3)).toEqual(Option.some(0));
    expect(next("end", 0, 3)).toEqual(Option.some(2));
  });

  it("owns no other key", () => {
    expect(next("enter", 1, 3)).toEqual(Option.none());
    expect(next(" ", 1, 3)).toEqual(Option.none());
    expect(next("tab", 1, 3)).toEqual(Option.none());
    expect(next("a", 1, 3)).toEqual(Option.none());
    expect(next(undefined, 1, 3)).toEqual(Option.none());
  });

  it("has no cursor in an empty list", () => {
    expect(next("down", 0, 0)).toEqual(Option.none());
    expect(next("up", 0, 0)).toEqual(Option.none());
    expect(next("end", 0, 0)).toEqual(Option.none());
  });

  it("clamps a cursor the list no longer holds", () => {
    expect(next("down", 99, 3)).toEqual(Option.some(2));
    expect(next("up", -4, 3)).toEqual(Option.some(0));
  });
});
