import { defineConfig } from "vitest/config";

/**
 * The behaviour suites: the ones that render a real GPUix tree and assert on
 * typing, text and hit-testing.
 *
 * Kept out of the default collection because `@gpuix/native` resolves its
 * binding eagerly, so a host without a published binding fails the whole file
 * to load rather than skipping visibly (plan 117 §5a–§5c, the components
 * package's config). Run with `nub run --filter @gpuixui/editor test:behaviour`.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/behaviour/**/*.test.tsx"],
    // The renderer paints through one retained tree; a second worker would race
    // on the window and the native module.
    pool: "forks",
    fileParallelism: false,
  },
});
