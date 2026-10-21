import {
  areHotkeysEqual,
  hasNonModifierKey,
  parseHotkey,
  type ParsedHotkeyChord,
} from "@tanstack/hotkeys";
import { toTanstackPlatform, type Platform } from "./platform.js";

/** Options for {@link makeSequenceMatcher}. */
export interface SequenceMatcherOptions {
  /** Milliseconds before a partial sequence is abandoned. */
  readonly timeoutMs: number;
  /** The platform `Mod` resolves against. */
  readonly platform: Platform;
}

/**
 * A multi-step sequence matcher, driven by decoded chords instead of a DOM
 * `KeyboardEvent`.
 *
 * `@tanstack/hotkeys`' `createSequenceMatcher` reads `event.key`/`event.code`
 * and `event.repeat`, none of which a GPUix `KeyEvent` has, so this package
 * mirrors its step machine over {@link decodeGpuixEvent} output and an injected
 * clock (`now`). Time is injected so tests drive the timeout deterministically;
 * the caller owns the real clock.
 */
export interface SequenceMatcher {
  /** Feed one decoded chord at time `now`; `true` when the sequence completed. */
  readonly advance: (chord: ParsedHotkeyChord, now: number) => boolean;
  /** Abandon any partial progress. */
  readonly reset: () => void;
  /** How many steps are matched so far. */
  readonly progress: () => number;
}

/**
 * Build a matcher for one chord sequence, e.g. `["g", "g"]`. Modifier-only
 * chords are ignored; a step that does not match the next expected chord but
 * does match the first step restarts from step two (the Vim `gg` convention).
 */
export const makeSequenceMatcher = (
  sequence: ReadonlyArray<string>,
  options: SequenceMatcherOptions,
): SequenceMatcher => {
  const steps: ReadonlyArray<ParsedHotkeyChord> = parseHotkey(
    sequence,
    toTanstackPlatform(options.platform),
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
