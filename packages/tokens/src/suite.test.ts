/**
 * Guards the suite's time budget.
 *
 * The bug this holds: the package had no `vitest.config.ts` at all, so it ran on
 * vitest's default five-second per-test budget with no hook budget — a test that
 * waited on a promise that never settles held the gate for five seconds per
 * case, and one that hung in a hook held it for longer. The config now states a
 * two-second budget; this reads the file so removing it fails here instead of
 * silently returning to the default.
 *
 * `node:fs` is deliberate, as in `docs.test.ts`: this is a check over the
 * package's own config file, and the package keeps zero runtime dependencies by
 * design.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const config = readFileSync(
  new URL("../vitest.config.ts", import.meta.url),
  "utf8",
);

/** The number a `name: n` option declares, or `undefined` if it is absent. */
const budget = (name: string): number | undefined => {
  const match = new RegExp(`${name}:\\s*(\\d+)`).exec(config);
  return match?.[1] === undefined ? undefined : Number(match[1]);
};

describe("suite time budget", () => {
  it("fails a waiting test in two seconds rather than the default five", () => {
    expect(budget("testTimeout")).toBe(2000);
  });

  it("fails a stuck hook on the same budget", () => {
    expect(budget("hookTimeout")).toBe(2000);
  });

  it("still runs the whole suite, tests and the React entry", () => {
    expect(config).toContain('"src/**/*.test.ts"');
    expect(config).toContain('"src/**/*.test.tsx"');
    expect(config).toContain('environment: "node"');
  });
});
