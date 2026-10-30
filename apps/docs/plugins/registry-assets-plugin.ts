import type { Plugin } from "vite";
import { readRegistry } from "../src/lib/registry-source.ts";
import { repoRoot } from "../src/lib/public-symbols-source.ts";

/**
 * The shadcn registry, emitted into the client bundle.
 *
 * The 158 item documents carry the source of every file an item installs —
 * 16 MB together. Served from a route they are part of the Worker bundle, and
 * that crossed Cloudflare's 63.9 MiB uncompressed ceiling (the deploy failed on
 * `BadRequest`). Emitted as assets, the edge answers them without invoking the
 * Worker, at the flat root addresses `registryPaths` names.
 *
 * The Worker has no filesystem, so this is the only place the registry reaches
 * production: a page added to either tree lands here by the same commit that
 * adds it to `readRegistry`.
 */
export const registryAssetsPlugin = (): Plugin => ({
  name: "gpuixui:registry-assets",
  applyToEnvironment: (environment) => environment.name === "client",
  generateBundle() {
    const { documents, unresolved } = readRegistry(repoRoot);

    // A page the generator cannot resolve to a module is a broken item, not a
    // missing one: fail the build rather than publish a registry with holes.
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
