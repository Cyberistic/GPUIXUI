import { defineConfig } from "vitest/config";

/**
 * The large-collection performance suite: real rendering, measured numbers, a
 * ceiling with an order of magnitude of headroom.
 *
 * Deliberately outside both gates. A wall-clock budget is a regression guard,
 * not a correctness test, and a loaded host must not turn it red — plan 327
 * measured that failure mode in the hover suites. Run it by hand when changing
 * `List`, its registry, or the shared collection logic:
 *
 * ```sh
 * nub run --filter @gpuixui/components test:perf
 * ```
 *
 * `docs/performance.md` records the baseline this suite was written against.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/perf/**/*.test.tsx"],
    setupFiles: ["./src/perf/setup.ts"],
    testTimeout: 120_000,
    pool: "forks",
    fileParallelism: false,
  },
});
