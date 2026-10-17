import { defineConfig } from "vitest/config";

/**
 * Tests in this package never render.
 *
 * Rendering needs the GPUix reconciler, which needs a native binding that does
 * not exist for Intel macOS — see
 * `.agents/slop/plans/020-gpuix-runtime-capability.md` §3. `Icon` is a pure
 * function of its props and holds no state, so asserting on the element it
 * returns is a real behavioural test; asserting on a painted frame is
 * `packages/testing`'s job.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
