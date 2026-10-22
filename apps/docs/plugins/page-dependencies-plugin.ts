import type { Plugin } from "vite";
import { readPageDependencies } from "../src/lib/page-dependencies-source.ts";
import { repoRoot } from "../src/lib/public-symbols-source.ts";

/**
 * The dependency index, as a build-time module.
 *
 * Reading which package each page's component imports means opening every
 * page and every component module — work the browser must not repeat and the
 * worker cannot do. The plugin reads the workspace once and serves the result,
 * so the strip and its guard share one index.
 */

const VIRTUAL_ID = "virtual:gpuixui-page-dependencies";
const RESOLVED_ID = `\0${VIRTUAL_ID}`;

export const pageDependenciesPlugin = (): Plugin => {
  let payload: string | undefined;

  return {
    name: "gpuixui:page-dependencies",
    resolveId: (id) => (id === VIRTUAL_ID ? RESOLVED_ID : undefined),
    load: (id) => {
      if (id !== RESOLVED_ID) return undefined;
      payload ??= JSON.stringify(readPageDependencies(repoRoot));
      return `export default ${payload};`;
    },
  };
};
