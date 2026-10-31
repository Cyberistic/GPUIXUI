import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["src/**/*.native.test.tsx"],
    pool: "forks",
    maxWorkers: 1,
  },
});
