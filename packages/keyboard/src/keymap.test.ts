/**
 * Keymap resolution with scope precedence.
 *
 * The bug these guard: a resolver that scans bindings instead of the scope
 * stack, so a dialog's binding for a chord would not shadow the global one, or a
 * popped scope would not restore it.
 */

import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { parseHotkey } from "@tanstack/hotkeys";
import { resolve, type KeyBinding, type Keymap } from "./keymap.js";
import { toTanstackPlatform } from "./platform.js";

const binding = (
  hotkey: string,
  commandId: string,
  scope: string,
): KeyBinding => ({ hotkey, commandId, scope });

const keymap: Keymap = {
  bindings: [
    binding("mod+k", "global.save", "global"),
    binding("mod+k", "dialog.save", "dialog"),
    binding("mod+j", "global.jump", "global"),
  ],
};

const chord = (binding: string, platform: "darwin" | "win32" = "darwin") =>
  parseHotkey(binding, toTanstackPlatform(platform));

describe("resolve", () => {
  it("lets a dialog binding shadow the global one for the same chord", () => {
    expect(
      resolve(keymap, ["dialog", "global"], chord("mod+k"), "darwin"),
    ).toEqual(Option.some("dialog.save"));
  });

  it("restores the global binding once the scope is popped", () => {
    expect(resolve(keymap, ["global"], chord("mod+k"), "darwin")).toEqual(
      Option.some("global.save"),
    );
  });

  it("resolves a chord with no scoped shadow", () => {
    expect(
      resolve(keymap, ["dialog", "global"], chord("mod+j"), "darwin"),
    ).toEqual(Option.some("global.jump"));
  });

  it("returns None for an unmatched chord", () => {
    expect(
      resolve(keymap, ["dialog", "global"], chord("mod+z"), "darwin"),
    ).toEqual(Option.none());
  });

  it("honours the stack order: a reversed stack restores the global binding", () => {
    expect(
      resolve(keymap, ["global", "dialog"], chord("mod+k"), "darwin"),
    ).toEqual(Option.some("global.save"));
  });
});
