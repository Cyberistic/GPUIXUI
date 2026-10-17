import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    // The native renderer paints through one retained tree; a second worker
    // would race on the window and on the native module.
    pool: "forks",
    maxWorkers: 1,
  },
});
