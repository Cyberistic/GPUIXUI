import { defineConfig } from "vitest/config";

/**
 * The suite is pure data and pure functions — a case that takes seconds is a
 * defect, not a slow machine — so the budget is two seconds instead of vitest's
 * five-second default. A guard in `src/suite.test.ts` holds it in place.
 *
 * A synchronous infinite loop cannot be interrupted by any timeout; this bounds
 * a test that waits on a promise, which is the hang that used to hold the gate.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    testTimeout: 2000,
    hookTimeout: 2000,
  },
});
