import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { areHotkeysEqual, type ParsedHotkeyChord } from "@tanstack/hotkeys";
import { parseBinding } from "./chord.js";
import { toTanstackPlatform, type Platform } from "./platform.js";

/** A binding's chord when it is one chord; a sequence never matches a single press. */
const singleChord = (
  hotkey: Binding,
  platform: Platform,
): Option.Option<ParsedHotkeyChord> => {
  const chords = parseBinding(hotkey, platform);
  return chords.length === 1 ? Arr.head(chords) : Option.none();
};

/** A scope an application defines, e.g. `"global"`, `"dialog"`, `"menu"`. */
export type Scope = string;

/**
 * One binding: a chord string (`"mod+s"`) or a chord sequence (`["g", "g"]`),
 * parsed case-insensitively by {@link parseBinding}.
 */
export type Binding = string | ReadonlyArray<string>;

/** One binding bound to a command id inside a scope. */
export interface KeyBinding {
  readonly hotkey: Binding;
  readonly commandId: string;
  readonly scope: Scope;
}

/** A read-only registry of bindings. */
export interface Keymap {
  readonly bindings: ReadonlyArray<KeyBinding>;
}

/**
 * Resolve a decoded chord to a command id under a scope stack.
 *
 * The stack is data, ordered most-specific first (`["dialog", "global"]`). The
 * first scope whose binding matches wins, so a dialog's binding shadows the
 * global one for the same chord; popping the scope restores the global binding.
 * A one-step sequence equals its chord; multi-step sequences resolve through
 * {@link makeSequenceMatcher}, not here.
 */
export const resolve = (
  keymap: Keymap,
  scopes: ReadonlyArray<Scope>,
  chord: ParsedHotkeyChord,
  platform: Platform,
): Option.Option<string> =>
  Arr.reduce(scopes, Option.none<string>(), (command, scope) =>
    Option.isSome(command)
      ? command
      : Option.map(
          Arr.findFirst(
            keymap.bindings,
            (binding) =>
              binding.scope === scope &&
              singleChord(binding.hotkey, platform).pipe(
                Option.exists((bound) =>
                  areHotkeysEqual(bound, chord, toTanstackPlatform(platform)),
                ),
              ),
          ),
          (binding) => binding.commandId,
        ),
  );
