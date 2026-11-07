import type { EventPayload } from "@gpuix/react";
import { areHotkeysEqual } from "@tanstack/hotkeys";
import { parseBinding } from "./chord.js";
import { decodeGpuixEvent } from "./decode.js";
import type { Binding } from "./keymap.js";
import { toTanstackPlatform, type Platform } from "./platform.js";

export const match = (
  binding: Binding,
  event: EventPayload,
  platform: Platform,
): boolean => {
  const chords = parseBinding(binding, platform);
  const [only] = chords;
  return (
    chords.length === 1 &&
    only !== undefined &&
    areHotkeysEqual(
      only,
      decodeGpuixEvent(event, platform),
      toTanstackPlatform(platform),
    )
  );
};
