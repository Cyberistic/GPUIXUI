import { defineConfig } from "vitest/config";

/**
 * This package's suite is fast, but two operations are larger than a unit test:
 * `react-consumer.test.ts` runs a real TypeScript compile (~2.3s) and the
 * palette audits evaluate the whole contrast contract. Vitest isolates per
 * file, so a full 55-file run starts that many workers on 12 cores and can
 * deschedule either operation past the 5s default with no code change — the
 * gate then fails intermittently. 20s is headroom, not an infinite timeout: a
 * hung subprocess never returns and still fails.
 */
export default defineConfig({
  test: {
    testTimeout: 20_000,
  },
});
