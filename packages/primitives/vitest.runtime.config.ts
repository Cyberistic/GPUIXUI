import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["runtime/**/*.runtime.test.tsx"],
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
