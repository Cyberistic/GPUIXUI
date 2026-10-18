import { defineConfig } from "vitest/config";

/**
 * The app's **native** suite: the real `App` composition mounted in the real
 * GPUix `TestRenderer`.
 *
 * Kept out of the default commands on purpose. The rest of this example is
 * checked by `check-types` and nothing else; this suite needs the native
 * binding and a compiled `@gpuixui/primitives`, so it is an explicit command —
 * `nub run --filter @gpuixui/basic-app test:runtime` — and it fails loudly
 * rather than skipping when the binding is absent. A skipped green over a
 * composition nobody ran is the failure mode plan `327` exists to remove.
 *
 * One offscreen window per test, files sequential: each window is a real
 * Metal-backed surface and the input helpers dispatch to the window they were
 * rendered into.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["runtime/**/*.runtime.test.tsx"],
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
