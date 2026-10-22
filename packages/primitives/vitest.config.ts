import { defineConfig } from "vitest/config";

/**
 * The `core/` suite is pure: token → `StyleDesc` resolution, keyboard decisions
 * and the controlled/uncontrolled state machine. Rendering needs a GPUix native
 * binding, so a test that asserts on a painted frame belongs in `runtime/` (run
 * by `test:runtime`) or `packages/testing`, never here. This config runs the
 * pure suites only.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
