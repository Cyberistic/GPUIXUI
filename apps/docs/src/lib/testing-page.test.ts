import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * `/testing` is how a contributor runs the suites, and it taught the whole
 * headless script and one live scenario as though they were the same loop: the
 * headless runner's `--only` and `--list` were absent, so an iteration that
 * touched one scenario ran every one, and nothing said the full live suite opens
 * a window and takes minutes.
 *
 * This guard holds the page to the runners: both lanes take the shared
 * `--only`/`--list` flags the smoke CLI parses, the headless iteration command
 * runs the built tree (so the page names the build), and the full live run is
 * called a release gate rather than an iteration step. A renamed flag fails here
 * before the page teaches it.
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
const host = read("packages/testing/src/smoke.ts");

/**
 * The window host's verbs, as `AsyncSmokeHost` declares them.
 *
 * The page is where a contributor learns which verbs a probe may call, and a
 * verb added to the host without a line on the page is a lever nobody finds —
 * the reason `clickAt` was documented after the fact. The read is derived from
 * the interface rather than typed here, so a new verb fails the page by name.
 */
const windowVerbs = (): ReadonlyArray<string> => {
  const body = host
    .split("export interface AsyncSmokeHost")[1]
    ?.split("\n}")[0];
  return [...(body ?? "").matchAll(/readonly (\w+)\??:/g)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]],
  );
};

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
    expect(page).toContain("nub run --filter playground build");
    expect(page).toContain("execute the built tree");
  });

  it("keeps the full live suite a release gate, not an iteration step", () => {
    expect(page).toContain("opens a real window");
    expect(page).toContain("release gate");
    expect(page).toContain("end-of-task check");
    expect(page).not.toContain("live/run.js --all");
  });

  it("names every verb the window host publishes", () => {
    const verbs = windowVerbs();

    // A floor, so a read that stopped matching cannot pass by finding none.
    expect(verbs.length).toBeGreaterThan(25);
    expect(verbs).toContain("clickAt");
    expect(
      verbs.filter((verb) => !page.includes(`\`${verb}\``)),
      "verbs a probe can call but the page never names",
    ).toEqual([]);
  });

  it("teaches the press at a point, and the two verbs it is not", () => {
    // `clickAt` exists because a part can have no address (the old `FileTree`
    // row checkbox was the measurement) and because neither `drag` nor a bare
    // move-then-click measures one press:
    // drag applies its offset to both ends, and a click after no move lands on
    // the last hovered element. Both were measured (packages/testing/README.md).
    const prose = page.replace(/\s+/g, " ");

    expect(host).toContain("readonly clickAt:");
    expect(prose).toContain("FileTree");
    expect(prose).toContain(
      "`clickAt(testId, offset)` presses a point measured from the element's painted top-left corner",
    );
    expect(prose).toContain(
      "applies its `offset` to the press **and again** to the release",
    );
    expect(prose).toContain(
      "no preceding move lands on whatever the last move hovered",
    );
  });
});
