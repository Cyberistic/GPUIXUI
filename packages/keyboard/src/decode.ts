import type { EventPayload } from "@gpuix/react";
import { parseHotkey, type ParsedHotkeyChord } from "@tanstack/hotkeys";
import { canonicalKey } from "./chord.js";
import { toTanstackPlatform, type Platform } from "./platform.js";

export const decodeGpuixEvent = (
  event: EventPayload,
  platform: Platform,
): ParsedHotkeyChord =>
  parseHotkey(
    {
      key: canonicalKey(event.key ?? ""),
      ctrl: event.modifiers?.ctrl === true,
      shift: event.modifiers?.shift === true,
      alt: event.modifiers?.alt === true,
      meta: event.modifiers?.cmd === true,
    },
    toTanstackPlatform(platform),
  );
