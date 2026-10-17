import { defineConfig } from "vitest/config";

/**
 * The **runtime** suite: the Tier 1 components mounted in the real GPUix
 * `TestRenderer`.
 *
 * Kept out of `vitest.config.ts` on purpose. The default suite must run on a
 * host with no GPUix binding (plan 030 §4); this one cannot, so it is an
 * explicit command — `nub run --filter @gpuixui/primitives test:runtime` — and it
 * fails loudly rather than skipping when the binding is absent (plan 041 §2.1).
 *
 * One offscreen window per file, and files run one at a time: each window is a
 * real Metal-backed surface, and the input helpers assume the window they just
 * rendered into is the one that dispatches.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["runtime/**/*.runtime.test.tsx"],
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
