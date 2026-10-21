import { defineConfig } from "vitest/config";

// The docs app's `vite.config.ts` loads the TanStack Start and Fumadocs
// plugins, which are irrelevant to the pure `.ts` tests and slow to start. This
// minimal config keeps `nub run --filter @gpuixui/docs test` fast and isolated.
export default defineConfig({
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "node",
  },
});
