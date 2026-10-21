/**
 * Exact accelerator ↔ key-event matching.
 *
 * The bugs these guard: a modifier that leaks into a chord that did not name it
 * (`Mod+K` firing on `Mod+Shift+K`), a `mod` that aliases a deliberate `ctrl` on
 * macOS, and a chord matching the wrong key.
 */

import { describe, expect, it } from "vitest";
import type { EventPayload } from "@gpuix/react";
import * as Result from "effect/Result";
import { Accelerator, parse } from "./accelerator.js";
import { match } from "./match.js";

const parsed = (input: string): Accelerator => {
  const result = parse(input);
  if (Result.isFailure(result)) {
    throw new Error(
      `parse(${JSON.stringify(input)}) failed: ${result.failure.message}`,
    );
  }
  return result.success;
};

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
    expect(match(parsed("mod+k"), key("k", { cmd: true }), "darwin")).toBe(
      true,
    );
    expect(match(parsed("mod+k"), key("k", { ctrl: true }), "win32")).toBe(
      true,
    );
    expect(match(parsed("mod+k"), key("k", { ctrl: true }), "linux")).toBe(
      true,
    );
  });

  it("does not fire Mod+K on Mod+Shift+K", () => {
    expect(
      match(parsed("mod+k"), key("k", { cmd: true, shift: true }), "darwin"),
    ).toBe(false);
    expect(
      match(
        parsed("mod+shift+k"),
        key("k", { cmd: true, shift: true }),
        "darwin",
      ),
    ).toBe(true);
  });

  it("does not leak an unpressed Alt", () => {
    expect(match(parsed("alt+k"), key("k", { cmd: true }), "darwin")).toBe(
      false,
    );
    expect(match(parsed("mod+alt+k"), key("k", { cmd: true }), "darwin")).toBe(
      false,
    );
  });

  it("keeps cmd and ctrl distinct on macOS", () => {
    expect(match(parsed("ctrl+k"), key("k", { cmd: true }), "darwin")).toBe(
      false,
    );
    expect(match(parsed("ctrl+k"), key("k", { ctrl: true }), "darwin")).toBe(
      true,
    );
  });

  it("does not match a different key", () => {
    expect(match(parsed("mod+k"), key("j", { cmd: true }), "darwin")).toBe(
      false,
    );
    expect(match(parsed("mod+k"), key("enter", { cmd: true }), "darwin")).toBe(
      false,
    );
  });

  it("does not match a modifier-only press", () => {
    expect(
      match(parsed("mod+k"), key("shift", { shift: true }), "darwin"),
    ).toBe(false);
  });
});
