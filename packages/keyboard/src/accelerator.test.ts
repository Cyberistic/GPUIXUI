/**
 * Accelerator parsing and formatting.
 *
 * The bugs these guard: a parser that is not order-insensitive, a `mod` that
 * ignores its platform, a duplicate or unknown token that slips through, and a
 * glyph that renders the macOS symbol on another platform.
 */

import { describe, expect, it } from "vitest";
import * as Result from "effect/Result";
import {
  Accelerator,
  AcceleratorParseError,
  format,
  formatSymbols,
  parse,
  serialize,
} from "./accelerator.js";

/** The parsed accelerator, or a thrown failure naming what went wrong. */
const parsed = (input: string): Accelerator => {
  const result = parse(input);
  if (Result.isFailure(result)) {
    throw new Error(
      `parse(${JSON.stringify(input)}) failed: ${result.failure.message}`,
    );
  }
  return result.success;
};

/** The parse error, or a thrown failure when the input unexpectedly parsed. */
const parseError = (input: string): AcceleratorParseError => {
  const result = parse(input);
  if (Result.isSuccess(result)) {
    throw new Error(`parse(${JSON.stringify(input)}) should fail`);
  }
  return result.failure;
};

const ACCEPTED =
  'a modifier (Mod, Cmd/Meta, Ctrl/Control, Alt/Option, Shift) then one key, e.g. "Mod+K"';

describe("parse", () => {
  it("parses a chord order-insensitively into canonical modifiers and a lower-cased key", () => {
    expect(parsed("Mod+K")).toMatchObject({ modifiers: ["mod"], key: "k" });
    expect(parsed("Shift+Alt+F")).toMatchObject({
      modifiers: ["alt", "shift"],
      key: "f",
    });
    expect(parsed(" Mod + Shift + Z ")).toMatchObject({
      modifiers: ["mod", "shift"],
      key: "z",
    });
  });

  it("folds modifier aliases", () => {
    expect(parsed("Meta+Enter")).toMatchObject({
      modifiers: ["cmd"],
      key: "enter",
    });
    expect(parsed("Control+Option+Delete")).toMatchObject({
      modifiers: ["ctrl", "alt"],
      key: "delete",
    });
  });

  it("fails on empty input with the exact error text", () => {
    const error = parseError("");
    expect(error.reason).toBe("empty");
    expect(error.message).toBe(
      `Invalid accelerator is empty; expected ${ACCEPTED}`,
    );
  });

  it("names an unknown token and the accepted form", () => {
    const error = parseError("hyper+k");
    expect(error.reason).toBe("unknown-token");
    expect(error.token).toBe("hyper");
    expect(error.message).toBe(
      `Invalid accelerator "hyper" is not a modifier or a key; expected ${ACCEPTED}`,
    );
  });

  it("rejects a repeated modifier", () => {
    const error = parseError("shift+shift+k");
    expect(error.reason).toBe("duplicate-modifier");
    expect(error.token).toBe("shift");
    expect(error.message).toBe(
      `Invalid accelerator "shift" is a repeated modifier; expected ${ACCEPTED}`,
    );
  });

  it("rejects modifiers without a key", () => {
    const error = parseError("ctrl+shift");
    expect(error.reason).toBe("missing-key");
    expect(error.message).toBe(
      `Invalid accelerator names modifiers but no key; expected ${ACCEPTED}`,
    );
  });

  it("rejects a second key", () => {
    const error = parseError("k+j");
    expect(error.reason).toBe("multiple-keys");
    expect(error.token).toBe("j");
    expect(error.message).toBe(
      `Invalid accelerator "j" is a second key; expected ${ACCEPTED}`,
    );
  });
});

describe("format", () => {
  it("resolves mod to the platform's primary modifier", () => {
    expect(format("mod+k", "darwin")).toBe("Cmd+K");
    expect(format("mod+k", "win32")).toBe("Ctrl+K");
    expect(format("mod+k", "linux")).toBe("Ctrl+K");
    expect(format("mod+k", "default")).toBe("Ctrl+K");
  });

  it("emits canonical order and title-cased named keys", () => {
    expect(format("shift+alt+f", "darwin")).toBe("Alt+Shift+F");
    expect(format("meta+enter", "darwin")).toBe("Cmd+Enter");
    expect(format("mod+pageup", "darwin")).toBe("Cmd+PageUp");
  });

  it("keeps cmd and ctrl specific on every platform", () => {
    expect(format("cmd+k", "win32")).toBe("Cmd+K");
    expect(format("ctrl+k", "darwin")).toBe("Ctrl+K");
  });
});

describe("serialize", () => {
  it("round-trips to the canonical grammar with mod unresolved", () => {
    expect(serialize(parsed("Mod+Shift+Z"))).toBe("mod+shift+z");
    expect(serialize(parsed("Meta+Enter"))).toBe("cmd+enter");
    expect(serialize(parsed("shift+alt+f"))).toBe("alt+shift+f");
  });

  it("round-trips: parse(serialize(parse(x))) equals parse(x)", () => {
    const roundTrip = (input: string): Accelerator =>
      parsed(serialize(parsed(input)));
    expect(roundTrip("Mod+Shift+Z")).toMatchObject({
      modifiers: ["mod", "shift"],
      key: "z",
    });
    expect(roundTrip(" Shift + Alt + F ")).toMatchObject({
      modifiers: ["alt", "shift"],
      key: "f",
    });
  });
});

describe("formatSymbols", () => {
  it("renders the macOS glyph on darwin and the word on other platforms", () => {
    expect(formatSymbols("mod+k", "darwin")).toEqual(["⌘", "K"]);
    expect(formatSymbols("mod+k", "win32")).toEqual(["Ctrl", "K"]);
    expect(formatSymbols("mod+shift+z", "darwin")).toEqual(["⌘", "⇧", "Z"]);
    // Negative control: `mod` must never render ⌘ on a non-macOS platform.
    expect(formatSymbols("mod+k", "win32")).not.toEqual(["⌘", "K"]);
  });

  it("renders named-key glyphs per platform", () => {
    expect(formatSymbols("meta+enter", "darwin")).toEqual(["⌘", "↵"]);
    expect(formatSymbols("meta+enter", "win32")).toEqual(["⌘", "Enter"]);
  });

  it("renders an unknown token verbatim, title-cased", () => {
    expect(formatSymbols("mod+weird", "darwin")).toEqual(["⌘", "Weird"]);
  });
});
