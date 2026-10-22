import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Behaviour suites live under `src/behaviour/` and mount the real GPUix
    // renderer, so they need a host with a published native binding. They run
    // through `vitest.behaviour.config.ts` instead (the same split
    // `@gpuixui/components` uses).
    include: [
      "src/**/*.test.{ts,tsx}",
      "examples/**/*.test.ts",
      "!src/behaviour/**",
    ],
    pool: "forks",
    maxWorkers: 1,
  },
});
