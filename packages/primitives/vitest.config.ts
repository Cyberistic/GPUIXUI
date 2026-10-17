import { defineConfig } from "vitest/config";

/**
 * The `core/` suite is pure: token → `StyleDesc` resolution, keyboard decisions
 * and the controlled/uncontrolled state machine. No GPUix runtime is involved,
 * which is the only reason it can run here — rendering needs a native binding
 * that does not exist for Intel macOS (`plans/020-gpuix-runtime-capability.md`
 * §3). Component rendering tests belong to `packages/testing`.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
