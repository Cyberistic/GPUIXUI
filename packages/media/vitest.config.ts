import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // The components are pure render functions plus a queue reducer; they need
    // no native binding. Every suite reads the element tree or the reducer's
    // output, never a painted frame. The gesture suite does drive a painted
    // frame, so it lives under `src/behaviour/` and runs through
    // `vitest.behaviour.config.ts` instead.
    include: ["src/**/*.test.{ts,tsx}", "examples/**/*.test.ts"],
    exclude: ["src/behaviour/**"],
    pool: "forks",
    maxWorkers: 1,
  },
});
