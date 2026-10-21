import { defineConfig } from "vitest/config";
import { publicSymbolsPlugin } from "./plugins/public-symbols-plugin.ts";

// The docs app's `vite.config.ts` loads the TanStack Start and Fumadocs
// plugins, which are irrelevant to the pure `.ts` tests and slow to start. This
// minimal config keeps `nub run --filter @gpuixui/docs test` fast and isolated.
//
// The public symbol plugin is here because the reference page renders the
// index it provides; without it the page's own test could not mount.
export default defineConfig({
  plugins: [publicSymbolsPlugin()],
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "node",
  },
});
