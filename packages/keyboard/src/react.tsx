import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  commandRegistry,
  type Command,
  type CommandRegistryService,
} from "./registry.js";

const emptyRegistry = commandRegistry([]);

const CommandRegistryContext =
  createContext<CommandRegistryService>(emptyRegistry);

export interface CommandRegistryProviderProps {
  readonly commands: ReadonlyArray<Command>;

  readonly children?: ReactNode;
}

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

export function useCommandRegistry(): CommandRegistryService {
  return useContext(CommandRegistryContext);
}
