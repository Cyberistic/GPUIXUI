import { defineConfig } from "vitest/config";

/**
 * The behaviour suite: the crop's pointer gestures, driven through the real
 * GPUix renderer rather than a fixture's handler.
 *
 * It is deliberately **not** part of `vitest.config.ts`. `@gpuix/native`
 * resolves its binding eagerly, so on a host without a published binding the
 * import throws and the whole test *file* fails to load — a failing file is not
 * the visible skip a logic suite would give. Keeping it out of the default
 * collection means an unsupported host still runs the render and reducer suites
 * and never reports this one as passing (plan 117 §5a–§5c takes the same line
 * for `@gpuixui/components`).
 *
 * Run on a supported host:
 *
 * ```sh
 * nub run --filter @gpuixui/media test:behaviour
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
