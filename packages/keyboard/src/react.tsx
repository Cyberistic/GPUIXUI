import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  commandRegistry,
  type Command,
  type CommandRegistryService,
} from "./registry.js";

const emptyRegistry = commandRegistry([]);

const CommandRegistryContext =
  createContext<CommandRegistryService>(emptyRegistry);

/** Props for {@link CommandRegistryProvider}. */
export interface CommandRegistryProviderProps {
  /** The commands this subtree resolves. */
  readonly commands: ReadonlyArray<Command>;
  /** The subtree that reads the registry. */
  readonly children?: ReactNode;
}

/**
 * Supply a command registry to descendant hooks. Without a provider,
 * {@link useCommandRegistry} returns an empty registry that resolves nothing.
 */
export function CommandRegistryProvider({
  commands,
  children,
}: CommandRegistryProviderProps) {
  const registry = useMemo(() => commandRegistry(commands), [commands]);
  return (
    <CommandRegistryContext.Provider value={registry}>
      {children}
    </CommandRegistryContext.Provider>
  );
}

/** Read the nearest command registry, or an empty one. */
export function useCommandRegistry(): CommandRegistryService {
  return useContext(CommandRegistryContext);
}
