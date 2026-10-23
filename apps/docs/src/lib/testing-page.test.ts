import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * `/docs/testing` is how a contributor runs the suites, and it taught the whole
 * headless script and one live scenario as though they were the same loop: the
 * headless runner's `--only` and `--list` were absent, so an iteration that
 * touched one scenario ran every one, and nothing said the full live suite opens
 * a window and takes minutes.
 *
 * This guard holds the page to the runners: both lanes take the shared
 * `--only`/`--list` flags the smoke CLI parses, the headless iteration command
 * is the built runner, and the full live run is called a release gate rather
 * than an iteration step. A renamed flag fails here before the page teaches it.
 *
 * The reads are synchronous because this is a test boundary, like the rest of
 * the site's Markdown guards.
 */

const root = new URL("../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const page = read("apps/docs/content/docs/testing.mdx");
const smoke = read("apps/playground/src/smoke/run.ts");
const live = read("apps/playground/src/live/run.ts");

describe("the testing page", () => {
  it("teaches the flags both runners parse, and the lane each belongs to", () => {
    // The live CLI imports its parser and usage from the smoke runner, so the
    // shared flags are the contract for both lanes.
    expect(smoke).toContain('"--only"');
    expect(smoke).toContain('"--list"');
    expect(live).toContain("../smoke/run.js");

    expect(page).toContain("nub apps/playground/dist/smoke/run.js --only <id>");
    expect(page).toContain("nub apps/playground/dist/live/run.js --only <id>");
    expect(page).toContain("`--list`");
  });

  it("keeps the full live suite a release gate, not an iteration step", () => {
    expect(page).toContain("opens a real window");
    expect(page).toContain("release gate");
    expect(page).toContain("end-of-task check");
    expect(page).not.toContain("live/run.js --all");
  });
});
