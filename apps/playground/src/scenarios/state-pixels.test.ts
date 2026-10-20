/**
 * Guards the premises of the hover/active colour pixel checks (plan `754`).
 *
 * The bug being guarded: 30 `hover:` and 39 `active:` declarations across the
 * shipped library are colour-only, and the suite proves the refinement on a
 * layout property plus the authored style report. A runtime that applies the
 * refinement but drops its fill would leave every button, row, tab and menu
 * item with an invisible hover/pressed state. These tests pin the precedence
 * the frame asserts (`active` over `hover`), the fallbacks a chain without a
 * refinement must use, and the precondition that no fixture can hide a state
 * behind its own fill — so a swapped role or an invisible state cannot make a
 * pixel check vacuous.
 */
import { describe, expect, it } from "vitest";
import { palettes } from "../palettes.js";
import {
  hasDistinctStates,
  resolveStateColour,
  stateFixtures,
  type StateColours,
} from "./state-pixels.js";

const CHAIN: StateColours = {
  rest: "#101010",
  hover: "#202020",
  active: "#303030",
};

describe("resolveStateColour", () => {
  it("returns the authored fill at rest", () => {
    expect(resolveStateColour(CHAIN, "rest")).toBe("#101010");
  });

  it("returns the hover colour when the chain declares one", () => {
    expect(resolveStateColour(CHAIN, "hover")).toBe("#202020");
  });

  it("falls back to the authored fill when the chain declares no hover", () => {
    expect(resolveStateColour({ rest: "#101010" }, "hover")).toBe("#101010");
  });

  it("returns the active colour when the chain declares one", () => {
    expect(resolveStateColour(CHAIN, "active")).toBe("#303030");
  });

  it("lets active beat hover, so a press never looks merely hovered", () => {
    expect(resolveStateColour(CHAIN, "active")).not.toBe(
      resolveStateColour(CHAIN, "hover"),
    );
    expect(resolveStateColour(CHAIN, "active")).toBe("#303030");
  });

  it("keeps the hover fill while pressed when no active colour is declared", () => {
    expect(
      resolveStateColour({ rest: "#101010", hover: "#202020" }, "active"),
    ).toBe("#202020");
  });

  it("falls through both refinements to the authored fill", () => {
    expect(resolveStateColour({ rest: "#101010" }, "active")).toBe("#101010");
  });
});

describe("hasDistinctStates", () => {
  it("accepts a chain whose states are all different", () => {
    expect(hasDistinctStates(CHAIN)).toBe(true);
  });

  it("rejects a hover that disappears into the authored fill", () => {
    expect(hasDistinctStates({ rest: "#101010", hover: "#101010" })).toBe(
      false,
    );
  });

  it("rejects an active that a consumer cannot tell from hover", () => {
    expect(
      hasDistinctStates({
        rest: "#101010",
        hover: "#202020",
        active: "#202020",
      }),
    ).toBe(false);
  });

  it("accepts a chain that only declares the rest fill", () => {
    expect(hasDistinctStates({ rest: "#101010" })).toBe(true);
  });
});

describe("stateFixtures", () => {
  it("maps every fixture to the documented roles", () => {
    const colors = palettes.dark.colors;
    const fixtures = stateFixtures(colors);
    expect(fixtures.hover).toEqual({
      rest: colors.card,
      hover: colors.primary,
    });
    expect(fixtures.parent).toEqual({
      rest: colors.muted,
      hover: colors.accent,
    });
    expect(fixtures.child).toEqual({
      rest: colors.card,
      hover: colors.success,
    });
    expect(fixtures.press).toEqual({
      rest: colors.card,
      hover: colors.primary,
      active: colors.destructive,
    });
  });

  it("keeps every fixture's declared states distinguishable", () => {
    const fixtures = stateFixtures(palettes.dark.colors);
    expect([
      hasDistinctStates(fixtures.hover),
      hasDistinctStates(fixtures.parent),
      hasDistinctStates(fixtures.child),
      hasDistinctStates(fixtures.press),
    ]).toEqual([true, true, true, true]);
  });
});
