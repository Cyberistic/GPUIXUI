import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { pageDependenciesPlugin } from "./plugins/page-dependencies-plugin.ts";
import { pageSourcesPlugin } from "./plugins/page-source-plugin.ts";
import { publicSymbolsPlugin } from "./plugins/public-symbols-plugin.ts";

// could not mount.
export default defineConfig({
  plugins: [
    publicSymbolsPlugin(),
    pageDependenciesPlugin(),
    pageSourcesPlugin(),
  ],
  // `@/` is the alias `vite.config.ts` defines for the site's own modules; a
  // test that mounts a component resolves its imports through the same one.
  resolve: {
    alias: [
      {
        find: /^@\//,
        replacement: `${fileURLToPath(new URL("./src", import.meta.url))}/`,
      },
    ],
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "node",
  },
});
