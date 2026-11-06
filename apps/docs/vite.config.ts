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
import { registryAssetsPlugin } from "./plugins/registry-assets-plugin";
import { repoRoot } from "./src/lib/public-symbols-source";
import { prerenderPaths } from "./src/lib/prerender-pages";

const root = path.dirname(fileURLToPath(import.meta.url));

const nativeDir = path.resolve(root, "node_modules/@gpuix/native");

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
      prerender: {
        enabled: true,

        autoStaticPathsDiscovery: false,
        crawlLinks: false,

        concurrency: 4,
      },
      pages: prerenderPaths(repoRoot).map((path) => ({ path })),
    }),
    react(),
    publicSymbolsPlugin(),
    pageDependenciesPlugin(),
    pageSourcesPlugin(),
    registryAssetsPlugin(),
    liveIsolation(),
  ],

  resolve: {
    alias: [
      { find: /^@\//, replacement: `${path.resolve(root, "src")}/` },
      {
        find: /^@gpuix\/native$/,
        replacement: path.resolve(root, "src/lib/gpuix-native.ts"),
      },

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

  ssr: {
    external: ["@gpuix/native"],
  },
  server: {
    port: 4175,
  },
});
