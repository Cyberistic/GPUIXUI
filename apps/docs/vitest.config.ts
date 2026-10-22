import { defineConfig } from "vitest/config";
import { pageDependenciesPlugin } from "./plugins/page-dependencies-plugin.ts";
import { publicSymbolsPlugin } from "./plugins/public-symbols-plugin.ts";

// The docs app's `vite.config.ts` loads the TanStack Start and Fumadocs
// plugins, which are irrelevant to the pure `.ts` tests and slow to start. This
// minimal config keeps `nub run --filter @gpuixui/docs test` fast and isolated.
//
// The two build-time modules are here because a page renders them: the public
// symbol plugin provides the reference index, and the page-dependency plugin
// provides the strip a package page opens with. Without them the pages' own
// tests could not mount.
export default defineConfig({
  plugins: [publicSymbolsPlugin(), pageDependenciesPlugin()],
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "node",
  },
});
