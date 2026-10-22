/**
 * The published type-ahead seam: the buffer's window and repeat rules, the
 * prefix matcher, the character a keystroke types, and the subpath a surface
 * outside this package reaches them through.
 *
 * The bugs these guard: a buffer with no window made every later letter part of
 * an old search; a repeated letter appended into a prefix that matches nothing
 * instead of advancing to the next row; an uppercase keystroke never matched a
 * lower-case label; matching was case-sensitive; a disabled row won the match;
 * an empty prefix matched every row; a matcher that returned the first match
 * could not advance on a repeated letter; and a typed `Enter` (whose `keyChar`
 * is a newline) was read as text instead of an activation. The window rule also
 * has to be reachable from another package: it lived in `src/internal/`, which a
 * tree could not import, so `@gpuixui/data` kept a copy (TODO.md tracks the
 * adoption).
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { EventPayload } from "@gpuix/react";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  idleTypeahead,
  typeaheadMatch,
  typeaheadMatchIndex,
  typeaheadPress,
  typeaheadWindowMs,
  typedChar,
  type TypeaheadItem,
} from "./typeahead.js";

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

describe("typeaheadPress", () => {
  it("starts a buffer from the first letter, lower-cased", () => {
    expect(typeaheadPress(idleTypeahead, "R", 0)).toEqual({ text: "r", at: 0 });
  });

  it("appends a different letter inside the window", () => {
    const first = typeaheadPress(idleTypeahead, "r", 0);
    expect(typeaheadPress(first, "e", 100)).toEqual({ text: "re", at: 100 });
  });

  it("starts over after the window, and not before it", () => {
    const first = typeaheadPress(idleTypeahead, "r", 0);
    expect(typeaheadPress(first, "e", 500).text).toBe("re");
    expect(typeaheadPress(first, "e", 501).text).toBe("e");
  });

  it("keeps a repeated single letter so the match can advance", () => {
    const first = typeaheadPress(idleTypeahead, "d", 0);
    expect(typeaheadPress(first, "d", 100)).toEqual({ text: "d", at: 100 });
  });

  it("appends a repeat after a longer prefix", () => {
    const first = typeaheadPress(idleTypeahead, "d", 0);
    const second = typeaheadPress(first, "e", 50);
    expect(typeaheadPress(second, "d", 100).text).toBe("ded");
  });

  it("starts empty and keeps a half-second window", () => {
    expect(idleTypeahead).toEqual({ text: "", at: 0 });
    expect(typeaheadWindowMs).toBe(500);
  });

  it("starts a fresh prefix when the clock cannot be read", () => {
    const first = typeaheadPress(idleTypeahead, "r", 10);
    expect(typeaheadPress(first, "e", Number.NaN)).toEqual({
      text: "e",
      at: 0,
    });
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
  Option.map(typeaheadMatch(items, from, prefix), (item) => item.id);

describe("typeaheadMatch", () => {
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

  it("answers a position, so a surface keeps its own row type", () => {
    expect(typeaheadMatchIndex(actions, Option.none(), "d")).toEqual(
      Option.some(1),
    );
    // The position survives a surface whose rows are not the matched items: a
    // tree maps labels onto this answer instead of copying the rule.
    const labels = ["alpha", "beta", "delta"].map((label) => ({
      label,
      disabled: false,
    }));
    expect(
      Option.map(typeaheadMatchIndex(labels, Option.none(), "d"), (index) =>
        labels.at(index),
      ),
    ).toEqual(Option.some({ label: "delta", disabled: false }));
  });
});

const keyEvent = (
  key: string,
  keyChar?: string,
  modifiers: Partial<EventPayload["modifiers"]> = {},
): EventPayload => ({
  elementId: 1,
  eventType: "keyDown",
  key,
  keyChar,
  modifiers: {
    shift: false,
    ctrl: false,
    alt: false,
    cmd: false,
    ...modifiers,
  },
});

describe("typedChar", () => {
  it("reads a plain letter or digit as text", () => {
    expect(typedChar(keyEvent("r", "r"))).toEqual(Option.some("r"));
    expect(typedChar(keyEvent("7", "7"))).toEqual(Option.some("7"));
    expect(typedChar(keyEvent("-", "-"))).toEqual(Option.some("-"));
  });

  it("takes the shifted form from keyChar", () => {
    expect(typedChar(keyEvent("2", "@", { shift: true }))).toEqual(
      Option.some("@"),
    );
  });

  it("reads no named key, not even one carrying a character", () => {
    // Measured: Enter's keyChar is a newline, so keyChar alone is not text.
    expect(typedChar(keyEvent("enter", "\n"))).toEqual(Option.none());
    expect(typedChar(keyEvent("space", " "))).toEqual(Option.none());
    expect(typedChar(keyEvent("down", undefined))).toEqual(Option.none());
    expect(typedChar(keyEvent("f10", undefined))).toEqual(Option.none());
  });

  it("reads no modified keystroke, because that is a shortcut", () => {
    expect(typedChar(keyEvent("a", "a", { cmd: true }))).toEqual(Option.none());
    expect(typedChar(keyEvent("a", "a", { ctrl: true }))).toEqual(
      Option.none(),
    );
    expect(typedChar(keyEvent("a", "a", { alt: true }))).toEqual(Option.none());
  });
});

describe("the published seam", () => {
  it("is declared as its own subpath, not reached through the barrel", () => {
    const manifest = read("../package.json");
    expect(manifest).toContain('"./typeahead": "./src/typeahead.ts"');
    // The wildcard export cannot serve it: `./*` maps to a `.tsx` file.
    expect(manifest).toContain('"./*": "./src/*.tsx"');
  });

  it("keeps one implementation of the rule", () => {
    const production = read("../src/list.tsx");
    expect(production).toContain('from "./typeahead.js"');
    const menu = read("../src/menu/state.ts");
    expect(menu).toContain('from "../typeahead.js"');
    // The private module is gone: a surface outside the package reaches the
    // same file rather than a copy of it.
    expect(() => read("../src/internal/typeahead.ts")).toThrow();
  });

  it("names the subpath on the page that teaches type-ahead", () => {
    const page = read("../docs/list.mdx");
    expect(page).toContain("@gpuixui/components/typeahead");
  });
});
