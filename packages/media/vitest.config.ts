import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // The components are pure render functions plus a queue reducer; they need
    // no native binding. Every suite reads the element tree or the reducer's
    // output, never a painted frame.
    include: ["src/**/*.test.{ts,tsx}", "examples/**/*.test.ts"],
    pool: "forks",
    maxWorkers: 1,
  },
});
