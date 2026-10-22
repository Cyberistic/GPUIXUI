import { defineConfig } from "vitest/config";

/**
 * The data-package behaviour suites: the ones that mount a real GPUix tree and
 * assert on painted boxes, hit-testing and focus.
 *
 * Kept out of the default collection because `@gpuix/native` resolves its
 * binding eagerly: on a host without one the whole file fails to load, which
 * would report a native suite as passing on nothing (AGENTS.md §3).
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/behaviour/**/*.test.tsx"],
    pool: "forks",
    fileParallelism: false,
    // A mounted table lays out every row it is given; the fixture is small,
    // but the first paint on this Intel host is still seconds, not milliseconds.
    testTimeout: 20_000,
  },
});
