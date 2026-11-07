import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { areHotkeysEqual, type ParsedHotkeyChord } from "@tanstack/hotkeys";
import { parseBinding } from "./chord.js";
import { toTanstackPlatform, type Platform } from "./platform.js";

const singleChord = (
  hotkey: Binding,
  platform: Platform,
): Option.Option<ParsedHotkeyChord> => {
  const chords = parseBinding(hotkey, platform);
  return chords.length === 1 ? Arr.head(chords) : Option.none();
};

export type Scope = string;

export type Binding = string | ReadonlyArray<string>;

export interface KeyBinding {
  readonly hotkey: Binding;
  readonly commandId: string;
  readonly scope: Scope;
}

export interface Keymap {
  readonly bindings: ReadonlyArray<KeyBinding>;
}

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
