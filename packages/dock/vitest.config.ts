import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // The dock suites are pure logic, schema round-trips and source guards —
    // none of them mount a GPUix tree, so no native binding is needed.
    include: ["src/**/*.test.{ts,tsx}", "examples/**/*.test.ts"],
    pool: "forks",
    maxWorkers: 1,
  },
});
