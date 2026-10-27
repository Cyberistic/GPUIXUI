/**
 * The browser's key event in the shipped recorder's chord grammar.
 *
 * The recorder binds a **physical** key: `decodeGpuixEvent` reads the runtime's
 * logical key name and the modifier flags, and the recorder normalises that to
 * `mod+shift+p`. A browser reports both a produced character and a physical
 * code, and the produced character is the wrong half — `Shift+1` gives `"!"` on
 * a US layout, and `Option+S` gives `"ß"`. So the accelerator comes from
 * `event.code`, which is stable across layouts, and the chord is built by the
 * same `parseHotkey` the runtime path ends in.
 *
 * A modifier-only press is not a chord: the recorder keeps listening. Escape
 * cancels, so it is the caller's key and never reaches this module's answer.
 */

import * as Option from "effect/Option";
import {
  formatSymbols,
  hasNonModifierKey,
  normalizeHotkey,
  parseHotkey,
  toTanstackPlatform,
  type Platform,
} from "@gpuixui/keyboard";

/** The fields of a browser key event this module reads. */
export interface BrowserChord {
  readonly code: string;
  readonly key: string;
  readonly altKey: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
}

/** The platform the preview shows; the grammar resolves `Mod` against it. */
export const PREVIEW_PLATFORM: Platform = "darwin";

/**
 * The accelerator name for a physical code: `KeyP` is `p`, `Digit1` is `1`,
 * `Numpad1` is `numpad1`. Every other code (`Space`, `F5`, `ArrowUp`,
 * `Escape`) already reads as its own name once lowercased.
 */
export const acceleratorOf = (code: string): string =>
  code.startsWith("Key")
    ? code.slice(3).toLowerCase()
    : code.startsWith("Digit")
      ? code.slice(5)
      : code.startsWith("Numpad")
        ? `numpad${code.slice(6).toLowerCase()}`
        : code.toLowerCase();

/**
 * Whether the press **is** a modifier. A modifier has no accelerator of its
 * own: `MetaLeft` is not a key name the grammar knows, so the press has to
 * arrive as `Meta` for the recorder to see "modifiers only, keep listening".
 */
const isModifierName = (key: string): boolean =>
  /^(Shift|Control|Alt|Meta|CapsLock|AltGraph)$/.test(key);

/**
 * The chord a press binds, or `None` while the reader is only holding
 * modifiers — the recorder stays armed for the next key.
 */
export const chordOf = (
  event: BrowserChord,
  platform: Platform = PREVIEW_PLATFORM,
): Option.Option<string> => {
  const chord = parseHotkey(
    {
      key: isModifierName(event.key)
        ? event.key
        : acceleratorOf(event.code === "" ? event.key : event.code),
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

/** The keycaps a chord paints, in platform order. */
export const glyphsOf = (
  chord: string,
  platform: Platform = PREVIEW_PLATFORM,
): ReadonlyArray<string> => formatSymbols(chord, platform);
