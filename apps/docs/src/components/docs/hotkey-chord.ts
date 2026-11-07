import * as Option from "effect/Option";
import {
  canonicalKey,
  formatSymbols,
  hasNonModifierKey,
  normalizeHotkey,
  parseHotkey,
  toTanstackPlatform,
  type Platform,
} from "@gpuixui/keyboard";

export interface BrowserChord {
  readonly code: string;
  readonly key: string;
  readonly altKey: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
}

export const PREVIEW_PLATFORM: Platform = "darwin";

export const acceleratorOf = (code: string): string =>
  code.startsWith("Key")
    ? code.slice(3).toLowerCase()
    : code.startsWith("Digit")
      ? code.slice(5)
      : code.startsWith("Numpad")
        ? `numpad${code.slice(6).toLowerCase()}`
        : code.toLowerCase();

const isModifierName = (key: string): boolean =>
  /^(Shift|Control|Alt|Meta|CapsLock|AltGraph)$/.test(key);

export const chordOf = (
  event: BrowserChord,
  platform: Platform = PREVIEW_PLATFORM,
): Option.Option<string> => {
  const chord = parseHotkey(
    {
      key: isModifierName(event.key)
        ? event.key
        : canonicalKey(
            acceleratorOf(event.code === "" ? event.key : event.code),
          ),
      alt: event.altKey,
      ctrl: event.ctrlKey,
      meta: event.metaKey,
      shift: event.shiftKey,
    },
    toTanstackPlatform(platform),
  );
  return hasNonModifierKey(chord, toTanstackPlatform(platform))
    ? Option.some(normalizeHotkey(chord, toTanstackPlatform(platform)))
    : Option.none();
};

export const glyphsOf = (
  chord: string,
  platform: Platform = PREVIEW_PLATFORM,
): ReadonlyArray<string> => formatSymbols(chord, platform);
