import type { EventPayload } from "@gpuix/react";
import {
  normalizeKeyName,
  parseHotkey,
  type ParsedHotkeyChord,
} from "@tanstack/hotkeys";
import { toTanstackPlatform, type Platform } from "./platform.js";

/**
 * Decode a GPUix key event into the parsed chord it pressed.
 *
 * GPUix has no DOM, so there is no `KeyboardEvent` and no `code` field: `key`
 * is already the logical key name (`"s"`, `"enter"`, `"f1"`) and `keyChar` is
 * the character the press produced (`"ß"` for Option+S). Binding identity is
 * the physical key, so the decode reads `key` plus the modifier flags and never
 * touches `keyChar` — an Option+letter or dead-key press decodes to its base
 * key (Option+S → `Alt+S`, not `Alt+ß`). This is the `code` fallback TanStack's
 * DOM matcher performs, already supplied here by `key` itself.
 *
 * `modifiers.cmd` maps to the DOM `metaKey`; `ctrl`, `alt` and `shift` map
 * one-to-one. A modifier-only press decodes to a chord whose key is a modifier
 * (e.g. `Shift`); callers reject it with {@link hasNonModifierKey}.
 */
export const decodeGpuixEvent = (
  event: EventPayload,
  platform: Platform,
): ParsedHotkeyChord =>
  parseHotkey(
    {
      key: normalizeKeyName(event.key ?? ""),
      ctrl: event.modifiers?.ctrl === true,
      shift: event.modifiers?.shift === true,
      alt: event.modifiers?.alt === true,
      meta: event.modifiers?.cmd === true,
    },
    toTanstackPlatform(platform),
  );
