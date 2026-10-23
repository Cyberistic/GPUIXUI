import { defineConfig } from "vitest/config";

/**
 * The shell's behaviour suites: the ones that mount the real GPUix renderer to
 * read `aria-expanded`, native focus and painted washes.
 *
 * Kept out of the default collection because `@gpuix/native` resolves its
 * binding eagerly: on a host without one the whole file fails to load rather
 * than skipping, so an unsupported host would report nothing as passing.
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
