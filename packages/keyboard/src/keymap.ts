import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  sameAccelerator,
  type Accelerator,
  type Platform,
} from "./accelerator.js";

/** A scope an application defines, e.g. `"global"`, `"dialog"`, `"menu"`. */
export type Scope = string;

/** One accelerator bound to a command id inside a scope. */
export interface KeyBinding {
  readonly accelerator: Accelerator;
  readonly commandId: string;
  readonly scope: Scope;
}

/** A read-only registry of accelerator bindings. */
export interface Keymap {
  readonly bindings: ReadonlyArray<KeyBinding>;
}

/**
 * Resolve an accelerator to a command id under a scope stack.
 *
 * The stack is data, ordered most-specific first (`["dialog", "global"]`). The
 * first scope whose binding matches wins, so a dialog's binding shadows the
 * global one for the same chord; popping the scope restores the global binding.
 */
export const resolve = (
  keymap: Keymap,
  scopes: ReadonlyArray<Scope>,
  accelerator: Accelerator,
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
              sameAccelerator(binding.accelerator, accelerator, platform),
          ),
          (binding) => binding.commandId,
        ),
  );
