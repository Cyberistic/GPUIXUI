import type { Plugin } from "vite";
import { readRegistry } from "../src/lib/registry-source.ts";
import { repoRoot } from "../src/lib/public-symbols-source.ts";

export const registryAssetsPlugin = (): Plugin => ({
  name: "gpuixui:registry-assets",
  applyToEnvironment: (environment) => environment.name === "client",
  generateBundle() {
    const { documents, unresolved } = readRegistry(repoRoot);

    if (unresolved.length > 0)
      this.error(`registry: unresolved pages\n  ${unresolved.join("\n  ")}`);

    for (const document of documents)
      this.emitFile({
        type: "asset",
        fileName: document.path.slice(1),
        source: document.json,
      });
  },
});
