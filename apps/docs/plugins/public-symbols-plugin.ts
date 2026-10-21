import type { Plugin } from "vite";
import {
  buildWorkspaceSymbolIndex,
  repoRoot,
} from "../src/lib/public-symbols-source.ts";

/**
 * The public symbol index, as a build-time module.
 *
 * The index is the source behind every published entry point, and the source
 * is 2 MB of TypeScript. Reading it in the browser would ship the whole
 * workspace to every reader, so the plugin reads it once, at build time, and
 * hands the page the result: a table of names, kinds, modules and summaries.
 *
 * The plugin is the only place the reader runs. `public-symbols-data.ts` reads
 * the module it provides, and the browser bundle carries the index and
 * nothing else.
 */

const VIRTUAL_ID = "virtual:gpuixui-public-symbols";
const RESOLVED_ID = `\0${VIRTUAL_ID}`;

export const publicSymbolsPlugin = (): Plugin => {
  let payload: string | undefined;

  return {
    name: "gpuixui:public-symbols",
    resolveId: (id) => (id === VIRTUAL_ID ? RESOLVED_ID : undefined),
    load: (id) => {
      if (id !== RESOLVED_ID) return undefined;
      payload ??= JSON.stringify(buildWorkspaceSymbolIndex(repoRoot));
      return `export default ${payload};`;
    },
  };
};
