import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Behaviour suites live under `src/behaviour/` and render through the real
    // GPUix test renderer; they need a host with a published native binding, so
    // they run through `vitest.behaviour.config.ts` instead (plan 117 §5c).
    include: ["src/**/*.test.{ts,tsx}", "!src/behaviour/**"],
    // The native renderer paints through one retained tree; a second worker
    // would race on the window and on the native module.
    pool: "forks",
    maxWorkers: 1,
  },
});
