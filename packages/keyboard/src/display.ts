import { formatForDisplay } from "@tanstack/hotkeys";
import { parseChord } from "./chord.js";
import { toTanstackPlatform, type Platform } from "./platform.js";

export const formatSymbols = (
  accelerator: string,
  platform: Platform,
): ReadonlyArray<string> =>
  formatForDisplay(parseChord(accelerator, platform), {
    platform: toTanstackPlatform(platform),
    parts: true,
  });
