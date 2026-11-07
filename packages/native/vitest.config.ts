import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/behaviour/**/*.test.tsx"],
    setupFiles: ["./src/register.ts"],
    pool: "forks",
    fileParallelism: false,
  },
});
