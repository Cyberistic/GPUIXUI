import { defineConfig } from "vitest/config";

/**
 * A full run is 193 isolated files on 12 cores; the package spawns a worker per
 * file, so a worker can be descheduled while the box is busy with something
 * else. The two operations larger than a unit test are the real TypeScript
 * compile in `react-consumer.test.ts` and the applied-style matrix in
 * `platform-composition.test.ts` (one case per base, 32 × 12 compositions).
 * `testTimeout` is wall clock, so a loaded worker can inflate either past the 5 s
 * default with no code change and the gate fails intermittently. 20 s is
 * headroom, not an infinite timeout: a hung subprocess never returns and still
 * fails. Keep the matrix split per base (plan 711): one case over the whole
 * product ran ~7 s under a parallel run, which left the budget too little room
 * to tell a slow box from a regression.
 */
export default defineConfig({
  test: {
    testTimeout: 20_000,
  },
});
