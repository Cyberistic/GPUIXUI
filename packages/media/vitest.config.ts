import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",

    include: ["src/**/*.test.{ts,tsx}", "examples/**/*.test.ts"],
    exclude: ["src/behaviour/**"],
    pool: "forks",
    maxWorkers: 1,
  },
});
