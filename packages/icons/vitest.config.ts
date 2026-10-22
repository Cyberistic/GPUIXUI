import { defineConfig } from "vitest/config";

/**
 * Tests in this package never render.
 *
 * Rendering needs the GPUix reconciler and a native binding; this package's
 * tests stay pure on purpose, because `Icon` is a pure function of its props and
 * holds no state — asserting on the element it returns is a real behavioural
 * test. Asserting on a painted frame is `packages/testing`'s job, and the
 * playground's `headless` suite runs that on this host.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
