/**
 * Guards the probe registry against the README.
 *
 * A live probe is only evidence if its measurement is written down: the README
 * is what the docs site and a release report cite, so a probe added without a
 * section — or a section left behind after a probe is dropped — is a native
 * claim nobody can read. The heading pins the runtime version it was measured
 * on, because "a probe exists" and "this probe passed on 0.11.0" are different
 * claims and a version bump has to re-measure rather than inherit.
 *
 * `node:fs` is deliberate, as in `packages/tokens/src/docs.test.ts`: this is a
 * check over the repository's own Markdown, not a runtime path.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { liveRegistry } from "./registry.js";

const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);

/** The probe ids the README measures, in the order its sections appear. */
const documented = readme
  .split("\n")
  .filter((line) => line.startsWith("### `"))
  .flatMap((line) => {
    const match = /^### `([^`]+)` — measured on 0\.11\.0 here$/.exec(line);
    return match === null ? [] : [match[1]];
  });

describe("live probe documentation", () => {
  it("documents every registered probe under the version it was measured on", () => {
    expect(documented).toEqual(liveRegistry.map((probe) => probe.id));
  });
});
