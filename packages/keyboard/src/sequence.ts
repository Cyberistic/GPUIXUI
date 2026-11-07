import {
  areHotkeysEqual,
  hasNonModifierKey,
  type ParsedHotkeyChord,
} from "@tanstack/hotkeys";
import { parseBinding } from "./chord.js";
import { toTanstackPlatform, type Platform } from "./platform.js";

export interface SequenceMatcherOptions {
  readonly timeoutMs: number;

  readonly platform: Platform;
}

export interface SequenceMatcher {
  readonly advance: (chord: ParsedHotkeyChord, now: number) => boolean;

  readonly reset: () => void;

  readonly progress: () => number;
}

export const makeSequenceMatcher = (
  sequence: ReadonlyArray<string>,
  options: SequenceMatcherOptions,
): SequenceMatcher => {
  const steps: ReadonlyArray<ParsedHotkeyChord> = parseBinding(
    sequence,
    options.platform,
  );
  const { timeoutMs, platform } = options;
  let index = 0;
  let lastStepAt = 0;

  return {
    advance: (chord, now) => {
      if (!hasNonModifierKey(chord, toTanstackPlatform(platform))) return false;
      if (index > 0 && now - lastStepAt > timeoutMs) index = 0;
      const expected = steps[index];
      if (expected === undefined) return false;
      if (areHotkeysEqual(expected, chord, toTanstackPlatform(platform))) {
        lastStepAt = now;
        index += 1;
        if (index >= steps.length) {
          index = 0;
          return true;
        }
      } else if (index > 0) {
        const first = steps[0];
        if (
          first !== undefined &&
          areHotkeysEqual(first, chord, toTanstackPlatform(platform))
        ) {
          index = 1;
          lastStepAt = now;
        } else {
          index = 0;
        }
      }
      return false;
    },
    reset: () => {
      index = 0;
      lastStepAt = 0;
    },
    progress: () => index,
  };
};
