import { formatForDisplay } from "@tanstack/hotkeys";
import { toTanstackPlatform, type Platform } from "./platform.js";

/**
 * The keycap glyphs for a chord, in platform order — `["⌘", "K"]` on macOS,
 * `["Ctrl", "K"]` elsewhere. A thin alias over `formatForDisplay(..., parts)`,
 * so the recorder and the shortcut cheat sheet share one renderer.
 */
export const formatSymbols = (
  accelerator: string,
  platform: Platform,
): ReadonlyArray<string> =>
  formatForDisplay(accelerator, {
    platform: toTanstackPlatform(platform),
    parts: true,
  });
