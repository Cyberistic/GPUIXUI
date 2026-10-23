import type { Plugin } from "vite";
import { readPackageGraph } from "../src/lib/package-graph-source.ts";
import { repoRoot } from "../src/lib/public-symbols-source.ts";

/**
 * The package graph, as a build-time module.
 *
 * The architecture page's table is read from every package manifest, so a
 * dependency added to one appears on the page with no docs edit. The reader
 * runs once, here; `package-graph-data.ts` carries the result to the page.
 */

const VIRTUAL_ID = "virtual:gpuixui-package-graph";
const RESOLVED_ID = `\0${VIRTUAL_ID}`;

export const packageGraphPlugin = (): Plugin => {
  let payload: string | undefined;

  return {
    name: "gpuixui:package-graph",
    resolveId: (id) => (id === VIRTUAL_ID ? RESOLVED_ID : undefined),
    load: (id) => {
      if (id !== RESOLVED_ID) return undefined;
      payload ??= JSON.stringify(readPackageGraph(repoRoot));
      return `export default ${payload};`;
    },
  };
};
