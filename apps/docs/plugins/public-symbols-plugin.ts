import type { Plugin } from "vite";
import {
  buildWorkspaceSymbolIndex,
  repoRoot,
} from "../src/lib/public-symbols-source.ts";

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
