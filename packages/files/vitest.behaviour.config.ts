import { defineConfig } from "vitest/config";

/**
 * The files package's behaviour suites, driven through the real GPUix renderer.
 *
 * Kept out of the default collection because `@gpuix/native` resolves its
 * binding eagerly: on a host without one the whole file fails to load, which
 * would report a native suite as passing on nothing (AGENTS.md §3).
 *
 * ```sh
 * nub run --filter @gpuixui/files test:behaviour
 * ```
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/behaviour/**/*.test.tsx"],
    pool: "forks",
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
