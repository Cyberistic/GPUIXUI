import type { Plugin } from "vite";
import { readRegistry } from "../src/lib/registry-source.ts";
import { repoRoot } from "../src/lib/public-symbols-source.ts";

/**
 * The shadcn registry, as build-time modules.
 *
 * The registry is generated from the pages and sources, and a Worker has no
 * filesystem. The index is one small module; each item is its own dynamic
 * import, so a request for one component's JSON loads that document and not the
 * registry's 16 MB of source.
 */

const INDEX_ID = "virtual:gpuixui-registry";
const ITEM_PREFIX = "virtual:gpuixui-registry/item/";
const RESOLVED_INDEX = `\0${INDEX_ID}`;
const resolvedItem = (name: string): string => `\0${ITEM_PREFIX}${name}`;

export const registryPlugin = (): Plugin => {
  let registry: ReturnType<typeof readRegistry> | undefined;
  const read = (): ReturnType<typeof readRegistry> =>
    (registry ??= readRegistry(repoRoot));

  return {
    name: "gpuixui:registry",
    resolveId: (id) =>
      id === INDEX_ID
        ? RESOLVED_INDEX
        : id.startsWith(ITEM_PREFIX)
          ? resolvedItem(id.slice(ITEM_PREFIX.length))
          : undefined,
    load: (id) => {
      if (id === RESOLVED_INDEX) {
        const { index, items, unresolved } = read();
        const loaders = items.map(
          (item) =>
            `  ${JSON.stringify(item.name)}: () => import(${JSON.stringify(
              `${ITEM_PREFIX}${item.name}`,
            )}).then((module) => module.default),`,
        );
        return [
          `export const registryIndex = ${JSON.stringify(index)};`,
          `export const registryNames = ${JSON.stringify(items.map((item) => item.name))};`,
          `export const registryUnresolved = ${JSON.stringify(unresolved)};`,
          `export const loadRegistryItem = {\n${loaders.join("\n")}\n};`,
        ].join("\n");
      }

      if (!id.startsWith("\0" + ITEM_PREFIX)) return undefined;
      const name = id.slice(("\0" + ITEM_PREFIX).length);
      const item = read().items.find((candidate) => candidate.name === name);
      return item === undefined
        ? undefined
        : `export default ${JSON.stringify(item.json)};`;
    },
  };
};
