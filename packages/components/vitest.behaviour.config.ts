import { defineConfig } from "vitest/config";

/**
 * The behaviour suites: the ones that render a real GPUix tree and assert on
 * hit-testing, focus, text and bounds.
 *
 * They are deliberately **not** part of `vitest.config.ts`. `@gpuix/native`
 * resolves its binding eagerly, so on a host without a published binding the
 * import throws and the whole test *file* fails to load — a failing file is not
 * the visible skip that `describe.skipIf` would give. Keeping them out of the
 * default collection means an unsupported host runs the logic suites and the
 * guard (`src/runtime.test.tsx`) and never reports a behaviour suite as passing.
 * Plan 117 §5a–§5c has the measurement and the reasoning.
 *
 * Run on a supported host (macOS arm64, Linux x64, Windows x64):
 *
 * ```sh
 * nub run --filter @gpuixui/components test:behaviour
 * ```
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/behaviour/**/*.test.tsx"],
    // The renderer paints through one retained tree; a second worker would race
    // on the window and on the native module.
    pool: "forks",
    fileParallelism: false,
  },
});
