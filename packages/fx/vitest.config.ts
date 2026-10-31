import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // The logic suites; the effects that paint run under
    // `vitest.behaviour.config.ts`, which loads the native binding.
    include: ["src/**/*.test.{ts,tsx}", "examples/**/*.test.ts"],
    exclude: ["src/behaviour/**"],
    pool: "forks",
    maxWorkers: 1,
  },
});
