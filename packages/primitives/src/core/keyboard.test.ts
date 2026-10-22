import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import {
  decideAbsolute,
  decideActivation,
  decideMove,
  decidePage,
  decideToggle,
  decideTypeAhead,
  isPlainKey,
  isTypeAheadKey,
  swallowKeyDefault,
  TYPE_AHEAD_RESET_MS,
} from "./keyboard.js";

/**
 * Guards the keyboard contract every focusable control shares.
 *
 * These rules mirror the platform, and each one is a bug that has shipped
 * somewhere: an activation that repeats while the key is held, Space activating
 * on the way down so the control fires before the user has committed, a radio
 * group that walks off its own end.
 *
 * The decisions stay pure booleans — "should this event activate?" — so a
 * component can use them from any handler. Swallowing the platform default is a
 * separate decision (`swallowKeyDefault`) because it needs the event itself;
 * `@gpuix/native` 0.11.0's `KeyEvent` carries `preventDefault`.
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

describe("swallowKeyDefault", () => {
  it("swallows a Space press, whose default would scroll or type", () => {
    expect(swallowKeyDefault("space", "down")).toBe(true);
  });

  it("leaves the Space release alone: it is the activation", () => {
    expect(swallowKeyDefault("space", "up")).toBe(false);
  });

  it("leaves Enter and unrelated keys alone", () => {
    expect(swallowKeyDefault("enter", "down")).toBe(false);
    expect(swallowKeyDefault("tab", "down")).toBe(false);
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

describe("decideTypeAhead", () => {
  const labels = ["Alpha", "Alpine", "Bravo", "Charlie"];

  it("lands on the next option whose label starts with the prefix", () => {
    // From `Alpha` the search continues forward, so `a` reaches the *second*
    // "Al..." rather than the option it is already on.
    expect(decideTypeAhead(labels, 0, "a")).toEqual(Option.some(1));
    expect(decideTypeAhead(labels, 0, "b")).toEqual(Option.some(2));
  });

  it("wraps to the start of the list", () => {
    expect(decideTypeAhead(labels, 3, "a")).toEqual(Option.some(0));
  });

  it("is case-insensitive, because the runtime reports lower-case keys", () => {
    expect(decideTypeAhead(["Zulu", "Yankee"], 1, "z")).toEqual(Option.some(0));
  });

  it("narrows with a longer buffer instead of replacing the match", () => {
    // `al` is the pair a reader types to tell the two "Al..." options apart;
    // from Bravo it finds the first one forward, which is Alpha (wrapping), and
    // a fourth character narrows that to Alpine.
    expect(decideTypeAhead(labels, 2, "al")).toEqual(Option.some(0));
    expect(decideTypeAhead(labels, 2, "alpi")).toEqual(Option.some(1));
  });

  it("retries the last character when the whole buffer matches nothing", () => {
    // A fast "qx" means "x": the standard rule, and the one that keeps a typo
    // from stranding the reader with no move at all.
    expect(decideTypeAhead(["Xylophone"], 0, "qx")).toEqual(Option.some(0));
  });

  it("never lands on an option that cannot be chosen", () => {
    const disabled = new Set([1]);
    expect(
      decideTypeAhead(labels, 0, "al", (index) => disabled.has(index)),
    ).toEqual(Option.some(0));
    expect(
      decideTypeAhead(
        labels,
        2,
        "a",
        (index) => index === 0 || disabled.has(index),
      ),
    ).toEqual(Option.none());
  });

  it("reports nothing for a group with no match or no options", () => {
    expect(decideTypeAhead(labels, 0, "z")).toEqual(Option.none());
    expect(decideTypeAhead([], 0, "a")).toEqual(Option.none());
  });
});

describe("isPlainKey", () => {
  it("reads an event with no chord as the control's own key", () => {
    expect(isPlainKey(undefined)).toBe(true);
    expect(isPlainKey({})).toBe(true);
    expect(isPlainKey({ ctrl: false, alt: false, cmd: false })).toBe(true);
  });

  it("keeps Shift, which is how a capital is typed", () => {
    expect(isPlainKey({ shift: true })).toBe(true);
    expect(
      isPlainKey({ shift: true, ctrl: false, alt: false, cmd: false }),
    ).toBe(true);
  });

  it("leaves every shortcut chord to the platform", () => {
    // Cmd+A selects all, Ctrl+Space switches the input source on macOS, and
    // Alt+arrow moves by word: a control that read one of these as its own key
    // would act on a shortcut it does not own.
    expect(isPlainKey({ cmd: true })).toBe(false);
    expect(isPlainKey({ ctrl: true })).toBe(false);
    expect(isPlainKey({ alt: true })).toBe(false);
    expect(isPlainKey({ ctrl: true, shift: true })).toBe(false);
  });
});

describe("isTypeAheadKey", () => {
  it("collects a character and leaves every named key alone", () => {
    expect(isTypeAheadKey("a")).toBe(true);
    expect(isTypeAheadKey("7")).toBe(true);
    expect(isTypeAheadKey("space")).toBe(false);
    expect(isTypeAheadKey("enter")).toBe(false);
    expect(isTypeAheadKey("down")).toBe(false);
    expect(isTypeAheadKey("")).toBe(false);
  });

  it("waits the platform's half second before the buffer starts over", () => {
    expect(TYPE_AHEAD_RESET_MS).toBe(500);
  });
});
