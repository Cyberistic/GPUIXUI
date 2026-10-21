import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Context from "effect/Context";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import type { KeyEvent } from "@gpuix/react";
import { hasNonModifierKey } from "@tanstack/hotkeys";
import { decodeGpuixEvent } from "./decode.js";
import { resolve, type Binding, type Keymap, type Scope } from "./keymap.js";
import { toTanstackPlatform, type Platform } from "./platform.js";

/** One command: a named action bound to a hotkey in a scope. */
export interface Command {
  readonly id: string;
  readonly title: string;
  readonly scope: Scope;
  /** The chord (`"mod+s"`) or sequence (`["g", "g"]`) that triggers it. */
  readonly hotkey: Binding;
  /** Runs at the caller's boundary; the registry only resolves, never runs. */
  readonly handler: Effect.Effect<void>;
}

/** What the registry resolves. */
export interface CommandRegistryService {
  /** The command this event resolves to under the scope stack, or `None`. */
  readonly resolve: (
    event: KeyEvent,
    scopes: ReadonlyArray<Scope>,
    platform: Platform,
  ) => Option.Option<Command>;
}

/** The command registry tag. One per runtime. */
export class CommandRegistry extends Context.Service<
  CommandRegistry,
  CommandRegistryService
>()("gpuixui/keyboard/CommandRegistry") {}

const keymapOf = (commands: ReadonlyArray<Command>): Keymap => ({
  bindings: Arr.map(commands, (command) => ({
    hotkey: command.hotkey,
    commandId: command.id,
    scope: command.scope,
  })),
});

const resolveCommand = (
  commands: ReadonlyArray<Command>,
  event: KeyEvent,
  scopes: ReadonlyArray<Scope>,
  platform: Platform,
): Option.Option<Command> => {
  const chord = decodeGpuixEvent(event, platform);
  if (!hasNonModifierKey(chord, toTanstackPlatform(platform))) {
    return Option.none();
  }
  return Option.flatMap(
    resolve(keymapOf(commands), scopes, chord, platform),
    (commandId) =>
      Arr.findFirst(commands, (command) => command.id === commandId),
  );
};

/** A read-only registry over the given commands, as plain data. */
export const commandRegistry = (
  commands: ReadonlyArray<Command>,
): CommandRegistryService => ({
  resolve: (event, scopes, platform) =>
    resolveCommand(commands, event, scopes, platform),
});

/** A layer holding one read-only registry. */
export const makeCommandRegistry = (
  commands: ReadonlyArray<Command>,
): Layer.Layer<CommandRegistry> =>
  Layer.succeed(CommandRegistry, CommandRegistry.of(commandRegistry(commands)));
