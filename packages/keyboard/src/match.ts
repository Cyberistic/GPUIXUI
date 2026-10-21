import type { EventPayload } from "@gpuix/react";
import { areHotkeysEqual, parseHotkey } from "@tanstack/hotkeys";
import { decodeGpuixEvent } from "./decode.js";
import type { Binding } from "./keymap.js";
import { toTanstackPlatform, type Platform } from "./platform.js";

/**
 * Whether `binding` matches this key event exactly.
 *
 * Modifiers are exact — `Mod+K` does not match `Mod+Shift+K` unless Shift is
 * named, and `cmd`/`ctrl` stay distinct. `Mod` resolves against `platform`.
 * Comparison is delegated to `areHotkeysEqual`, so a physical binding
 * (`Mod+[KeyS]`) and a logical one (`Mod+S`) stay distinct.
 */
export const match = (
  binding: Binding,
  event: EventPayload,
  platform: Platform,
): boolean =>
  areHotkeysEqual(
    parseHotkey(binding, toTanstackPlatform(platform)),
    decodeGpuixEvent(event, platform),
    toTanstackPlatform(platform),
  );
