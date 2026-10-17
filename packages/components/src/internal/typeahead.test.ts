/**
 * The shared type-ahead core: the buffer's window and repeat rules, and the
 * prefix matcher.
 *
 * The bugs these guard: a buffer with no window made every later letter part of
 * an old search; a repeated letter appended into a prefix that matches nothing
 * instead of advancing to the next row; an uppercase keystroke never matched a
 * lower-case label; matching was case-sensitive; a disabled row won the match;
 * an empty prefix matched every row; and a matcher that returned the first match
 * could not advance on a repeated letter.
 */

import * as Duration from "effect/Duration";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  idle,
  matchPrefix,
  press,
  window,
  type TypeaheadItem,
} from "./typeahead.js";

const ms = (value: number): bigint => BigInt(value) * 1_000_000n;

describe("press", () => {
  it("starts a buffer from the first letter, lower-cased", () => {
    expect(press(idle, "R", ms(0))).toEqual({ text: "r", at: 0n });
  });

  it("appends a different letter inside the window", () => {
    const first = press(idle, "r", 0n);
    expect(press(first, "e", ms(100))).toEqual({ text: "re", at: ms(100) });
  });

  it("starts over after the window, and not before it", () => {
    const first = press(idle, "r", 0n);
    expect(press(first, "e", ms(500)).text).toBe("re");
    expect(press(first, "e", ms(500) + 1n).text).toBe("e");
  });

  it("keeps a repeated single letter so the match can advance", () => {
    const first = press(idle, "d", 0n);
    expect(press(first, "d", ms(100))).toEqual({ text: "d", at: ms(100) });
  });

  it("appends a repeat after a longer prefix", () => {
    const first = press(idle, "d", 0n);
    const second = press(first, "e", ms(50));
    expect(press(second, "d", ms(100)).text).toBe("ded");
  });

  it("starts empty and expires after half a second", () => {
    expect(idle).toEqual({ text: "", at: 0n });
    expect(Duration.toMillis(window)).toBe(500);
  });
});

/** A labelled row, so assertions can name the id instead of the whole item. */
interface Row extends TypeaheadItem {
  readonly id: number;
}

const rows = (
  spec: ReadonlyArray<readonly [number, boolean?, string?]>,
): ReadonlyArray<Row> =>
  spec.map(([id, disabled, label]) => ({
    id,
    disabled: disabled ?? false,
    label: label ?? `row ${id}`,
  }));

/** The matcher's answer as an id, so the assertions stay readable. */
const matchedId = (
  items: ReadonlyArray<Row>,
  from: Option.Option<number>,
  prefix: string,
): Option.Option<number> =>
  Option.map(matchPrefix(items, from, prefix), (item) => item.id);

describe("matchPrefix", () => {
  const actions = rows([
    [201, false, "Rename"],
    [202, false, "Duplicate"],
    [203, false, "Delete"],
    [204, false, "Open"],
    [205, false, "Copy path"],
  ]);

  it("selects the first enabled row starting with the prefix", () => {
    expect(matchedId(actions, Option.none(), "d")).toEqual(Option.some(202));
    expect(matchedId(actions, Option.none(), "c")).toEqual(Option.some(205));
  });

  it("advances to the next match and wraps", () => {
    // `from` is a position, not a row id: Duplicate is at index 1.
    expect(matchedId(actions, Option.some(1), "d")).toEqual(Option.some(203));
    expect(matchedId(actions, Option.some(2), "d")).toEqual(Option.some(202));
  });

  it("skips a disabled match", () => {
    const withDisabled = rows([
      [301, false, "Delete"],
      [302, true, "Duplicate"],
      [303, false, "Dismiss"],
    ]);
    expect(matchedId(withDisabled, Option.some(0), "d")).toEqual(
      Option.some(303),
    );
    expect(matchedId(withDisabled, Option.none(), "du")).toEqual(Option.none());
  });

  it("matches case-insensitively and trims both sides", () => {
    expect(matchedId(actions, Option.none(), "RE")).toEqual(Option.some(201));
    expect(matchedId(actions, Option.none(), "  re ")).toEqual(
      Option.some(201),
    );
  });

  it("is none when nothing matches", () => {
    expect(matchedId(actions, Option.some(201), "z")).toEqual(Option.none());
  });

  it("is none for an empty prefix, even though every label starts with it", () => {
    expect(matchedId(actions, Option.none(), "")).toEqual(Option.none());
    expect(matchedId(actions, Option.some(201), "   ")).toEqual(Option.none());
  });

  it("never matches a row with an empty label", () => {
    const untitled = rows([
      [401, false, ""],
      [402, false, "Save"],
    ]);
    expect(matchedId(untitled, Option.none(), "s")).toEqual(Option.some(402));
    expect(matchedId(rows([[501, false, ""]]), Option.none(), " ")).toEqual(
      Option.none(),
    );
  });
});
