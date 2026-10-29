import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fumadocsMdx } from "fumadocs-mdx/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import { pageDependenciesPlugin } from "./plugins/page-dependencies-plugin";
import { pageSourcesPlugin } from "./plugins/page-source-plugin";
import { publicSymbolsPlugin } from "./plugins/public-symbols-plugin";
import { repoRoot } from "./src/lib/public-symbols-source";
import { prerenderPaths } from "./src/lib/prerender-pages";

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

/** One exact alias object, so the native subpaths read as a list. */
const nativeEntry = (find: string, replacement: string) => [
  { find: new RegExp(`^${find.replaceAll("/", "\\/")}$`), replacement },
];

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
    tanstackStart({
      /**
       * Render every page once, at build time, into `dist/client`.
       *
       * Nearly every route is content; only `/live` needs a per-request
       * document (`src/lib/prerender-pages.ts` argues it). The Worker stays
       * deployed for the routes that are genuinely dynamic, but a page request
       * is answered by Cloudflare's asset layer before the Worker is invoked:
       * the burst that used to exhaust the CPU limit now renders nothing.
       */
      prerender: {
        enabled: true,
        // The list below is the whole inventory, derived from the same
        // collections the sitemap advertises; discovery and crawling would
        // only guess at it from the route tree and the links in it.
        autoStaticPathsDiscovery: false,
        crawlLinks: false,
        // Each concurrent render holds a whole page (and `/docs/reference` its
        // 2,700-row symbol table); four keeps the build inside a laptop's
        // memory.
        concurrency: 4,
      },
      pages: prerenderPaths(repoRoot).map((path) => ({ path })),
    }),
    react(),
    publicSymbolsPlugin(),
    pageDependenciesPlugin(),
    pageSourcesPlugin(),
    liveIsolation(),
  ],
  // `@/` mirrors the tsconfig path; Start's dependency scanner does not read it.
  // `@gpuix/native` resolves to the shim because its own browser entry loads the
  // wasm with an import attribute Vite leaves behind in a pre-bundled dependency
  // (`src/lib/gpuix-native.ts`); the subpaths stay on the package.
  resolve: {
    alias: [
      { find: /^@\//, replacement: `${path.resolve(root, "src")}/` },
      {
        find: /^@gpuix\/native$/,
        replacement: path.resolve(root, "src/lib/gpuix-native.ts"),
      },
      // The host and its siblings are plain JS, but the package's bare subpaths
      // do not survive the Worker bundler's resolve (the deploy failed with
      // `Module not found` on the first one), so each names the file its export
      // map already points at.
      ...nativeEntry("@gpuix/native/host", `${nativeDir}/dist/host.js`),
      ...nativeEntry(
        "@gpuix/native/cpu-throttle",
        `${nativeDir}/dist/cpu-throttle.js`,
      ),
      ...nativeEntry("@gpuix/native/idle-gc", `${nativeDir}/dist/idle-gc.js`),
      ...nativeEntry("@gpuix/native/testing", `${nativeDir}/dist/testing.js`),
      ...nativeEntry("@gpuix/native/runtime", `${nativeDir}/dist/runtime.js`),
      ...nativeEntry(
        "@gpuix/native/automation",
        `${nativeDir}/dist/automation/index.js`,
      ),
      {
        find: /^@gpuix\/native\/wasm\/(.+)$/,
        replacement: `${nativeDir}/wasm/$1`,
      },
    ],
  },
  // The wasm is 20 MiB: keep it out of the server graph, where it is unused.
  ssr: {
    external: ["@gpuix/native"],
  },
  server: {
    port: 4175,
  },
});
