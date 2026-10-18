import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import {
  decideAbsolute,
  decideActivation,
  decideMove,
  decidePage,
  decideToggle,
  moveFrom,
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

  it("skips an item that cannot be chosen", () => {
    const disabled = new Set([1]);
    expect(
      decideMove(0, 3, "down", "vertical", (index) => disabled.has(index)),
    ).toEqual(Option.some(2));
  });

  it("wraps past a disabled item instead of landing on it", () => {
    const disabled = new Set([2]);
    expect(
      decideMove(1, 3, "down", "vertical", (index) => disabled.has(index)),
    ).toEqual(Option.some(0));
  });

  it("does not move when every other item is disabled", () => {
    expect(
      decideMove(0, 2, "down", "vertical", (index) => index !== 0),
    ).toEqual(Option.none());
  });
});

describe("moveFrom", () => {
  /**
   * The bug guarded (plan 359): a roving composite used its value-derived tab
   * stop as the base for a relative move, so a controlled parent that deferred
   * the reported change left the ring one item ahead of the base and the second
   * arrow repeated the first. The focused item is the cursor.
   */
  it("starts from the focused item when one holds focus", () => {
    expect(moveFrom(0, Option.some(2))).toBe(2);
  });

  it("falls back to the tab stop when focus is outside the composite", () => {
    expect(moveFrom(2, Option.none())).toBe(2);
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

  it("lands on the nearest enabled end", () => {
    const disabledEnds = (index: number): boolean => index === 0 || index === 4;
    expect(decideAbsolute(5, "home", disabledEnds)).toEqual(Option.some(1));
    expect(decideAbsolute(5, "end", disabledEnds)).toEqual(Option.some(3));
  });

  it("finds nowhere to land when every option is disabled", () => {
    expect(decideAbsolute(3, "home", () => true)).toEqual(Option.none());
    expect(decideAbsolute(3, "end", () => true)).toEqual(Option.none());
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
