/**
 * Guards the type-ahead contract a closed `Select` answers with.
 *
 * The bug class: a long list is arrow-only, and the obvious wiring is wrong in
 * three ways that are invisible in a single-key test — a modified chord types a
 * character, a held key races the prefix, and a repeated letter stays on the
 * first match instead of advancing. This suite fixes the rule before the
 * component uses it.
 *
 * The keyboard-shaped facts are measured on 0.10.0: a simulated printable key
 * delivers `key: "e"` with **no** `keyChar`, while `cmd-e` carries real
 * modifiers. The fallback to `key` is therefore load-bearing, not defensive.
 */

import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Duration from "effect/Duration";
import * as Option from "effect/Option";
import {
  EMPTY_TYPEAHEAD,
  matchTypeahead,
  pressTypeahead,
  typeaheadChar,
  TYPEAHEAD_WINDOW,
} from "./typeahead.js";

const NOW = 10_000_000_000n;
const WINDOW_MS = Duration.toMillis(TYPEAHEAD_WINDOW);
const NANOS_PER_MS = 1_000_000n;

describe("typeaheadChar", () => {
  it("falls back to the key when the renderer reports no keyChar", () => {
    expect(typeaheadChar({ key: "e" })).toEqual(Option.some("e"));
  });

  it("prefers the produced character over the key name", () => {
    expect(typeaheadChar({ key: "s", keyChar: "ß" })).toEqual(Option.some("ß"));
  });

  it("types nothing for a named key or a blank", () => {
    Arr.forEach(["enter", "space", "up", "f1", " ", ""], (key) => {
      expect(typeaheadChar({ key })).toEqual(Option.none());
    });
  });

  it("refuses a chord the application owns", () => {
    Arr.forEach(
      [
        { ctrl: true, alt: false, cmd: false },
        { ctrl: false, alt: true, cmd: false },
        { ctrl: false, alt: false, cmd: true },
      ],
      (modifiers) => {
        expect(typeaheadChar({ key: "e", modifiers })).toEqual(Option.none());
      },
    );
    expect(
      typeaheadChar({
        key: "E",
        modifiers: { ctrl: false, alt: false, cmd: false },
      }),
    ).toEqual(Option.some("E"));
  });

  it("refuses a held repeat, which would race the prefix", () => {
    expect(typeaheadChar({ key: "e", isHeld: true })).toEqual(Option.none());
  });
});

describe("pressTypeahead", () => {
  it("starts a prefix with the first letter", () => {
    expect(pressTypeahead(EMPTY_TYPEAHEAD, "E", NOW)).toEqual({
      text: "e",
      at: NOW,
    });
  });

  it("appends a different letter inside the window", () => {
    const first = pressTypeahead(EMPTY_TYPEAHEAD, "u", NOW);
    expect(pressTypeahead(first, "g", NOW + 100n)).toEqual({
      text: "ug",
      at: NOW + 100n,
    });
  });

  it("starts over once the window has passed", () => {
    const first = pressTypeahead(EMPTY_TYPEAHEAD, "u", NOW);
    const after = NOW + BigInt(WINDOW_MS) * NANOS_PER_MS + 1n;
    expect(pressTypeahead(first, "g", after)).toEqual({ text: "g", at: after });
  });

  it("keeps a repeated single letter so the match can advance", () => {
    const first = pressTypeahead(EMPTY_TYPEAHEAD, "e", NOW);
    expect(pressTypeahead(first, "e", NOW + 100n)).toEqual({
      text: "e",
      at: NOW + 100n,
    });
  });
});

const ITEMS = [
  { value: "eu", label: "Europe", disabled: false },
  { value: "ee", label: "Estonia", disabled: false },
  { value: "b", label: "Beta", disabled: true },
  { value: "us", label: "United States", disabled: false },
  { value: "ug", label: "Uganda", disabled: false },
  { value: "blank", label: "   ", disabled: false },
  { value: "gr", label: "Greece", disabled: false },
] as const;

describe("matchTypeahead", () => {
  it("matches nothing for an empty prefix", () => {
    expect(matchTypeahead(ITEMS, Option.none(), "  ")).toEqual(Option.none());
  });

  it("matches the first enabled item from no selection", () => {
    expect(matchTypeahead(ITEMS, Option.none(), "e")).toEqual(
      Option.some({ item: ITEMS[0], index: 0 }),
    );
  });

  it("advances after the current item", () => {
    expect(matchTypeahead(ITEMS, Option.some(0), "e")).toEqual(
      Option.some({ item: ITEMS[1], index: 1 }),
    );
  });

  it("wraps to the first match", () => {
    expect(matchTypeahead(ITEMS, Option.some(4), "e")).toEqual(
      Option.some({ item: ITEMS[0], index: 0 }),
    );
  });

  it("skips a disabled row", () => {
    expect(matchTypeahead(ITEMS, Option.none(), "b")).toEqual(Option.none());
  });

  it("skips a blank label", () => {
    expect(matchTypeahead(ITEMS, Option.none(), " ")).toEqual(Option.none());
  });

  it("matches a multi-letter prefix case-insensitively", () => {
    expect(matchTypeahead(ITEMS, Option.none(), "UN")).toEqual(
      Option.some({ item: ITEMS[3], index: 3 }),
    );
  });

  it("matches nothing when no label has the prefix", () => {
    expect(matchTypeahead(ITEMS, Option.none(), "z")).toEqual(Option.none());
  });
});
