/**
 * GPUix event decode.
 *
 * The bug these guard: an adapter that reads the *produced* character
 * (`keyChar`) instead of the *physical* key (`key`), so a macOS Option+letter or
 * dead-key press would decode to the glyph (`Alt+ß`) instead of the base key
 * (`Alt+S`). GPUix's `key` is already the logical key name, so it plays the role
 * the DOM matcher's `code` fallback does — the adapter must never touch
 * `keyChar`.
 */

import { describe, expect, it } from "vitest";
import type { EventPayload } from "@gpuix/react";
import { hasNonModifierKey } from "@tanstack/hotkeys";
import { decodeGpuixEvent } from "./decode.js";
import { toTanstackPlatform } from "./platform.js";

const key = (
  name: string,
  modifiers: Partial<{
    shift: boolean;
    ctrl: boolean;
    alt: boolean;
    cmd: boolean;
  }> = {},
  keyChar?: string,
): EventPayload => ({
  elementId: 1,
  eventType: "keyDown",
  key: name,
  keyChar,
  modifiers: {
    shift: false,
    ctrl: false,
    alt: false,
    cmd: false,
    ...modifiers,
  },
});

describe("decodeGpuixEvent", () => {
  it("decodes a plain key to a normalised, unmodified chord", () => {
    expect(decodeGpuixEvent(key("k"), "darwin")).toEqual({
      key: "K",
      ctrl: false,
      shift: false,
      alt: false,
      meta: false,
      modifiers: [],
    });
  });

  it("maps each modifier flag, cmd to meta", () => {
    expect(
      decodeGpuixEvent(
        key("s", { cmd: true, shift: true, alt: true }),
        "darwin",
      ),
    ).toEqual({
      key: "S",
      ctrl: false,
      shift: true,
      alt: true,
      meta: true,
      modifiers: ["Alt", "Shift", "Meta"],
    });
    expect(decodeGpuixEvent(key("a", { ctrl: true }), "win32")).toMatchObject({
      key: "A",
      ctrl: true,
      meta: false,
    });
  });

  it("normalises named keys through the engine's alias table", () => {
    expect(decodeGpuixEvent(key("escape"), "darwin").key).toBe("Escape");
    expect(decodeGpuixEvent(key("down"), "darwin").key).toBe("ArrowDown");
    expect(decodeGpuixEvent(key("return"), "darwin").key).toBe("Enter");
    expect(decodeGpuixEvent(key(" "), "darwin").key).toBe("Space");
  });

  it("decodes an Option+letter press to its base key, not the glyph", () => {
    // Option+S produces `keyChar: "ß"` on macOS; the binding identity is "s".
    expect(decodeGpuixEvent(key("s", { alt: true }, "ß"), "darwin")).toEqual({
      key: "S",
      ctrl: false,
      shift: false,
      alt: true,
      meta: false,
      modifiers: ["Alt"],
    });
  });

  it("ignores keyChar: the produced glyph never becomes the key", () => {
    const withGlyph = decodeGpuixEvent(key("s", { alt: true }, "ß"), "darwin");
    const without = decodeGpuixEvent(key("s", { alt: true }), "darwin");
    expect(withGlyph.key).toBe("S");
    expect(withGlyph).toEqual(without);
  });

  it("decodes a modifier-only press to a chord hasNonModifierKey rejects", () => {
    const chord = decodeGpuixEvent(key("shift", { shift: true }), "darwin");
    expect(chord.key).toBe("shift");
    expect(hasNonModifierKey(chord, toTanstackPlatform("darwin"))).toBe(false);
  });

  it("decodes an absent key to an empty chord hasNonModifierKey rejects", () => {
    const chord = decodeGpuixEvent(key(""), "darwin");
    expect(hasNonModifierKey(chord, toTanstackPlatform("darwin"))).toBe(false);
  });
});
