import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fumadocsMdx } from "fumadocs-mdx/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import { pageDependenciesPlugin } from "./plugins/page-dependencies-plugin";
import { publicSymbolsPlugin } from "./plugins/public-symbols-plugin";

const root = path.dirname(fileURLToPath(import.meta.url));

/**
 * The wasm build's two files, resolved past the package's `exports` map.
 *
 * `@gpuix/native`'s `browser.mjs` loads its glue and wasm with
 * `import … with { type: "file" }`, which is a bundler convention Rollup does
 * not implement for `.wasm`, and the two files are not entry points. The live
 * surface therefore imports the glue directly and asks Vite for the wasm as an
 * asset URL; `/live` is the only importer.
 */
const nativeDir = path.resolve(root, "node_modules/@gpuix/native");

const gpuixWeb = (): Plugin => ({
  name: "gpuix-web-wasm",
  enforce: "pre",
  resolveId: (id) => {
    const prefix = "@gpuix/native/wasm/";
    return id.startsWith(prefix)
      ? path.join(nativeDir, "wasm", id.slice(prefix.length))
      : undefined;
  },
});

/**
 * Cross-origin isolation for `/live` in development only.
 *
 * The wasm instantiates a `shared: true` `WebAssembly.Memory`, so
 * `SharedArrayBuffer` must exist and the document must be isolated. Scoped to
 * the one route: isolating the docs would lock every other page's embeds for no
 * reason. Production sets the same pair in `src/start.ts`.
 */
const liveIsolation = (): Plugin => ({
  name: "gpuix-live-isolation",
  configureServer: (server) => {
    server.middlewares.use((request, response, next) => {
      if ((request.url ?? "").startsWith("/live")) {
        response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
        response.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
        response.setHeader("Cross-Origin-Resource-Policy", "same-origin");
      }
      next();
    });
  },
});

export default defineConfig({
  plugins: [
    gpuixWeb(),
    fumadocsMdx(),
    tailwindcss(),
    tanstackStart(),
    react(),
    publicSymbolsPlugin(),
    pageDependenciesPlugin(),
    liveIsolation(),
  ],
  // `@/` mirrors the tsconfig path; Start's dependency scanner does not read it.
  resolve: {
    alias: [{ find: /^@\//, replacement: `${path.resolve(root, "src")}/` }],
  },
  // The wasm is 20 MiB: keep it out of the server graph, where it is unused.
  ssr: {
    external: ["@gpuix/native"],
  },
  server: {
    port: 4175,
  },
});
