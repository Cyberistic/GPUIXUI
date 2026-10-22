import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // The shell package ships pure logic suites (`src/**/logic.test.ts`) that
    // prove the chrome's navigation without a renderer. It has no behaviour
    // suites yet; the native chrome is composed in `apps/playground`.
    include: ["src/**/*.test.{ts,tsx}"],
    pool: "forks",
    maxWorkers: 1,
  },
});
