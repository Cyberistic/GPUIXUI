/**
 * Exact hotkey ↔ key-event matching.
 *
 * The bugs these guard: a modifier that leaks into a chord that did not name it
 * (`Mod+K` firing on `Mod+Shift+K`), a `mod` that aliases a deliberate `ctrl` on
 * macOS, and a chord matching the wrong key.
 */

import { describe, expect, it } from "vitest";
import type { EventPayload } from "@gpuix/react";
import { match } from "./match.js";

const key = (
  name: string,
  modifiers: Partial<{
    shift: boolean;
    ctrl: boolean;
    alt: boolean;
    cmd: boolean;
  }> = {},
): EventPayload => ({
  elementId: 1,
  eventType: "keyDown",
  key: name,
  modifiers: {
    shift: false,
    ctrl: false,
    alt: false,
    cmd: false,
    ...modifiers,
  },
});

describe("match", () => {
  it("matches the platform primary modifier through mod", () => {
    expect(match("mod+k", key("k", { cmd: true }), "darwin")).toBe(true);
    expect(match("mod+k", key("k", { ctrl: true }), "win32")).toBe(true);
    expect(match("mod+k", key("k", { ctrl: true }), "linux")).toBe(true);
  });

  it("does not fire Mod+K on Mod+Shift+K", () => {
    expect(match("mod+k", key("k", { cmd: true, shift: true }), "darwin")).toBe(
      false,
    );
    expect(
      match("mod+shift+k", key("k", { cmd: true, shift: true }), "darwin"),
    ).toBe(true);
  });

  it("does not leak an unpressed Alt", () => {
    expect(match("alt+k", key("k", { cmd: true }), "darwin")).toBe(false);
    expect(match("mod+alt+k", key("k", { cmd: true }), "darwin")).toBe(false);
  });

  it("keeps cmd and ctrl distinct on macOS", () => {
    expect(match("ctrl+k", key("k", { cmd: true }), "darwin")).toBe(false);
    expect(match("ctrl+k", key("k", { ctrl: true }), "darwin")).toBe(true);
  });

  it("does not match a different key", () => {
    expect(match("mod+k", key("j", { cmd: true }), "darwin")).toBe(false);
    expect(match("mod+k", key("enter", { cmd: true }), "darwin")).toBe(false);
  });

  it("does not match a modifier-only press", () => {
    expect(match("mod+k", key("shift", { shift: true }), "darwin")).toBe(false);
  });

  it("keeps a physical binding distinct from a logical one", () => {
    // `Mod+[KeyS]` is a physical code; a GPUix event has no `code`, so it never
    // matches, and it is not equal to the logical `Mod+S`.
    expect(match("Mod+[KeyS]", key("s", { cmd: true }), "darwin")).toBe(false);
    expect(match("Mod+S", key("s", { cmd: true }), "darwin")).toBe(true);
  });
});
