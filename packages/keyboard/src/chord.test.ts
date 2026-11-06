/**
 * The `@tanstack/hotkeys` adapter over `toDomKey`.
 *
 * The bug these guard: 0.24 compares key names case-sensitively and no longer
 * reads GPUI's names, so a binding written `Mod+Enter` never matched GPUix's
 * `enter`, and `meta+enter` rendered the word "enter" instead of ↵.
 */
import type { EventPayload } from "@gpuix/react";
import { describe, expect, it } from "vitest";
import { canonicalKey, parseChord } from "./chord.js";
import { formatSymbols } from "./display.js";
import { match } from "./match.js";

const press = (key: string, cmd = false): EventPayload => ({
  elementId: 1,
  eventType: "keyDown",
  key,
  modifiers: { cmd, ctrl: false, alt: false, shift: false },
});

describe("key-name spelling", () => {
  it("hands TanStack its own spelling of each DOM value", () => {
    expect(canonicalKey("enter")).toBe("Enter");
    expect(canonicalKey("down")).toBe("ArrowDown");
    expect(canonicalKey("space")).toBe("Space");
    expect(canonicalKey("k")).toBe("K");
  });

  it("matches a binding in any case against the key GPUix reports", () => {
    expect(match("Mod+Enter", press("enter", true), "darwin")).toBe(true);
    expect(match("mod+enter", press("enter", true), "darwin")).toBe(true);
    expect(match("Mod+Enter", press("enter"), "darwin")).toBe(false);
  });

  it("renders the glyph for a lowercase named key", () => {
    expect(formatSymbols("meta+enter", "darwin")).toEqual(["⌘", "↵"]);
    expect(parseChord("shift+tab", "linux").key).toBe("Tab");
  });
});
