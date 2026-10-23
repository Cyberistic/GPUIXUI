import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Pure suites only (`src/**/logic.test.ts`): they prove the chrome's
    // navigation without a renderer. The suites that mount one live under
    // `src/behaviour/` and run through `vitest.behaviour.config.ts`.
    include: ["src/**/*.test.{ts,tsx}", "!src/behaviour/**"],
    pool: "forks",
    maxWorkers: 1,
  },
});
