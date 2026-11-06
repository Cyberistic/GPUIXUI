import type { Plugin } from "vite";
import { join } from "node:path";
import { readPageModules } from "../src/lib/page-dependencies-source.ts";
import { repoRoot } from "../src/lib/public-symbols-source.ts";

const VIRTUAL_ID = "virtual:gpuixui-page-sources";
const RESOLVED_ID = `\0${VIRTUAL_ID}`;

export const pageSourcesPlugin = (): Plugin => {
  let payload: string | undefined;

  return {
    name: "gpuixui:page-sources",
    resolveId: (id) => (id === VIRTUAL_ID ? RESOLVED_ID : undefined),
    load: (id) => {
      if (id !== RESOLVED_ID) return undefined;
      if (payload !== undefined) return payload;

      const { pages, unresolved } = readPageModules(repoRoot);
      const loaders = pages.map(
        (page) =>
          `  ${JSON.stringify(page.module)}: () => import(${JSON.stringify(
            `${join(repoRoot, page.module)}?raw`,
          )}).then((module) => module.default),`,
      );

      payload = [
        `export const pages = ${JSON.stringify(pages)};`,
        `export const unresolved = ${JSON.stringify(unresolved)};`,
        `export const loaders = {\n${loaders.join("\n")}\n};`,
      ].join("\n");

      return payload;
    },
  };
};
