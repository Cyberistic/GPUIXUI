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

export interface Command {
  readonly id: string;
  readonly title: string;
  readonly scope: Scope;

  readonly hotkey: Binding;

  readonly handler: Effect.Effect<void>;
}

export interface CommandRegistryService {
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
