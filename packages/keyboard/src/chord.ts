import {
  normalizeKeyName,
  parseHotkey,
  type ParsedHotkeyChord,
} from "@tanstack/hotkeys";
import { toDomKey } from "./key-names.js";
import { toTanstackPlatform, type Platform } from "./platform.js";

/**
 * The `@tanstack/hotkeys` adapter: a key name in TanStack's spelling. The key
 * becomes its DOM value first, which any hotkey library accepts, and only then
 * takes TanStack's own conventions (`" "` → `"Space"`, `"a"` → `"A"`). Another
 * library would swap this function and keep `toDomKey`.
 */
export const canonicalKey = (key: string): string =>
  normalizeKeyName(toDomKey(key));

/** A physical chord (`Mod+[KeyS]`) names a code, not a key, and stays as parsed. */
const canonicalChord = (chord: ParsedHotkeyChord): ParsedHotkeyChord =>
  chord.key === undefined ? chord : { ...chord, key: canonicalKey(chord.key) };

/** One chord of a binding, parsed with its key name in canonical spelling. */
export const parseChord = (
  chord: string,
  platform: Platform,
): ParsedHotkeyChord =>
  canonicalChord(parseHotkey(chord, toTanstackPlatform(platform)));

/** A binding's chords in order: one for `"mod+s"`, two for `["g", "g"]`. */
export const parseBinding = (
  binding: string | ReadonlyArray<string>,
  platform: Platform,
): ReadonlyArray<ParsedHotkeyChord> =>
  typeof binding === "string"
    ? [parseChord(binding, platform)]
    : binding.map((chord) => parseChord(chord, platform));
