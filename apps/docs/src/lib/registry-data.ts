import {
  loadRegistryItem,
  registryIndex,
  registryNames,
  registryUnresolved,
} from "virtual:gpuixui-registry";

/**
 * The generated shadcn registry, as the routes read it.
 *
 * `registry.json` is one document; each item is loaded by name so a request for
 * one component downloads its own JSON rather than the whole registry. The
 * generator's unresolved pages are exported for the guard, not rendered.
 */
export { registryIndex, registryNames, registryUnresolved };

/** True when the registry serves this item name. */
export const hasRegistryItem = (name: string): boolean =>
  registryNames.includes(name);

/** One item's JSON, or `undefined` when no item has that name. */
export const registryItemJson = async (
  name: string,
): Promise<string | undefined> => loadRegistryItem[name]?.();
