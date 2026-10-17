import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import {
  decideAbsolute,
  decideActivation,
  decideMove,
  decidePage,
  decideToggle,
} from "./keyboard.js";

/**
 * Guards the keyboard contract every focusable control shares.
 *
 * These rules mirror the platform, and each one is a bug that has shipped
 * somewhere: an activation that repeats while the key is held, Space activating
 * on the way down so the control fires before the user has committed, a radio
 * group that walks off its own end.
 *
 * `@gpuix/native` 0.10.0's `EventPayload` carries no `defaultPrevented` and no
 * way to swallow the platform default, so the contract is a plain boolean:
 * "should this event activate?". That limitation is why there is no
 * `preventDefault` field to assert on.
 */

describe("decideActivation", () => {
  it("activates on Enter key down", () => {
    expect(decideActivation("enter", "down", false)).toBe(true);
  });

  it("does not activate again when Enter is released", () => {
    expect(decideActivation("enter", "up", false)).toBe(false);
  });

  it("activates on Space key up, not key down", () => {
    expect(decideActivation("space", "down", false)).toBe(false);
    expect(decideActivation("space", "up", false)).toBe(true);
  });

  it("ignores a held key, so activating once does not run twice", () => {
    expect(decideActivation("enter", "down", true)).toBe(false);
    expect(decideActivation("space", "up", true)).toBe(false);
  });

  it("ignores unrelated keys", () => {
    expect(decideActivation("a", "down", false)).toBe(false);
    expect(decideActivation("escape", "down", false)).toBe(false);
  });
});

describe("decideToggle", () => {
  it("flips both ways", () => {
    expect(decideToggle(false)).toBe(true);
    expect(decideToggle(true)).toBe(false);
  });
});

describe("decideMove", () => {
  it("walks down and up a vertical list", () => {
    expect(decideMove(0, 3, "down", "vertical")).toEqual(Option.some(1));
    expect(decideMove(2, 3, "up", "vertical")).toEqual(Option.some(1));
  });

  it("wraps at both ends instead of stopping", () => {
    expect(decideMove(2, 3, "down", "vertical")).toEqual(Option.some(0));
    expect(decideMove(0, 3, "up", "vertical")).toEqual(Option.some(2));
  });

  it("follows sideways keys in a horizontal group", () => {
    expect(decideMove(0, 3, "right", "horizontal")).toEqual(Option.some(1));
    expect(decideMove(2, 3, "left", "horizontal")).toEqual(Option.some(1));
  });

  it("ignores the other axis's keys", () => {
    expect(decideMove(1, 3, "right", "vertical")).toEqual(Option.none());
    expect(decideMove(1, 3, "down", "horizontal")).toEqual(Option.none());
  });

  it("has nowhere to go in an empty group", () => {
    expect(decideMove(0, 0, "down", "vertical")).toEqual(Option.none());
  });
});

describe("decideAbsolute", () => {
  it("jumps to either end", () => {
    expect(decideAbsolute(5, "home")).toEqual(Option.some(0));
    expect(decideAbsolute(5, "end")).toEqual(Option.some(4));
  });

  it("ignores other keys and an empty group", () => {
    expect(decideAbsolute(5, "down")).toEqual(Option.none());
    expect(decideAbsolute(0, "home")).toEqual(Option.none());
  });
});

describe("decidePage", () => {
  it("moves by a page and clamps at the ends", () => {
    expect(decidePage(0, 10, "pagedown", 3)).toEqual(Option.some(3));
    expect(decidePage(9, 10, "pagedown", 3)).toEqual(Option.some(9));
    expect(decidePage(1, 10, "pageup", 3)).toEqual(Option.some(0));
  });

  it("ignores a key that is not a page key", () => {
    expect(decidePage(1, 10, "down", 3)).toEqual(Option.none());
  });
});
