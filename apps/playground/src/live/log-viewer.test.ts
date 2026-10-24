/**
 * Holds `log-viewer-lifecycle` to the shipped component and to its arithmetic.
 *
 * The gap this guards: the Tier 4 *Log viewers* row cited the headless
 * `log-viewer` scenario, which measures the runtime's `<virtual-list>` around a
 * probe-local list — no window had mounted the shipped `@gpuixui/files`
 * `LogViewer`, painted its toolbar or flipped its controlled `followTail`. If
 * this probe is rewritten around a local list, the registry, the README and the
 * row would still claim the component while measuring a fixture.
 *
 * The line grammar and the cycle come from the package's own `LOG_LEVELS`, so
 * the filter's expected tails are derived rather than typed: changing the cycle
 * moves every filtered row the record prints, and this file fails first.
 *
 * `node:fs` is deliberate, as in the other live fixtures: this reads the
 * repository's own component, probe and prose, never a runtime path.
 */
import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  LOG_ALL_LEVELS,
  LOG_AFTER_FIRST_APPEND,
  LOG_AFTER_SECOND_APPEND,
  LOG_AFTER_THIRD_APPEND,
  LOG_APPEND,
  LOG_CHECKS,
  LOG_ERRORS_ONLY,
  LOG_IDS,
  LOG_LINES,
  LOG_REST,
  LOG_VIEWPORT,
  lastIndexOfLevel,
  logLevelAt,
  logLine,
  logReadout,
} from "./log-viewer.js";
import { liveRegistry } from "./registry.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const probe = read("./log-viewer-probe.tsx");
const component = read("../../../../packages/files/src/log/log-viewer.tsx");
const readme = read("../../README.md");

/** The probe's README section, so a value printed elsewhere cannot pass. */
const section = (() => {
  const heading = "### `log-viewer-lifecycle` — measured on 0.11.0 here";
  const start = readme.indexOf(heading);
  if (start === -1) return "";
  const end = readme.indexOf("\n### ", start + heading.length);
  return readme.slice(start, end === -1 ? undefined : end);
})();

describe("the log scene's arithmetic", () => {
  it("cycles the package's own levels, so every level has a tail", () => {
    expect(logLevelAt(0)).toBe("error");
    expect(logLevelAt(1)).toBe("warn");
    expect(logLevelAt(4)).toBe("trace");
    expect(logLevelAt(5)).toBe("error");
    // A line is the grammar the component parses: a level token, then the
    // message the probe looks for.
    expect(logLine(237)).toBe("info line 237");
    expect(logLine(0)).toBe("error line 0");
  });

  it("derives the tail a filter keeps and the row it drops", () => {
    // 240 lines: the last error is 235 and the last trace is 239.
    expect(lastIndexOfLevel(LOG_LINES, "error")).toEqual(Option.some(235));
    expect(lastIndexOfLevel(LOG_LINES, "trace")).toEqual(Option.some(239));
    // 400 lines after the appends: the error tail is 395, the trace row 399.
    const appended = LOG_AFTER_THIRD_APPEND.lines + LOG_APPEND;
    expect(appended).toBe(400);
    expect(lastIndexOfLevel(appended, "error")).toEqual(Option.some(395));
    expect(lastIndexOfLevel(appended, "trace")).toEqual(Option.some(399));
  });

  it("prints the readout shape every step is checked against", () => {
    expect(logReadout(LOG_REST)).toBe("lines=240 follow=on levels=all");
    expect(logReadout({ ...LOG_REST, levels: LOG_ERRORS_ONLY })).toBe(
      "lines=240 follow=on levels=error",
    );
    expect(logReadout({ ...LOG_REST, follow: false })).toBe(
      "lines=240 follow=off levels=all",
    );
    // The appends the steps drive, so a probe that appends a different number
    // fails here rather than on a row the record no longer names.
    expect(LOG_AFTER_FIRST_APPEND.lines).toBe(280);
    expect(LOG_AFTER_SECOND_APPEND.lines).toBe(320);
    expect(LOG_AFTER_THIRD_APPEND.lines).toBe(360);
    expect(Arr.length(LOG_ALL_LEVELS)).toBe(5);
  });

  it("counts the checks the probe asserts, the repeated helper included", () => {
    // One assertion site is inside `anchor()`, which the steps read five times,
    // so the run asserts one more check per read after the first.
    const sites = probe.match(/ctx\.expect[A-Za-z]+\(/g)?.length ?? 0;
    const reads = probe.match(/anchor\(\)/g)?.length ?? 0;
    expect(LOG_CHECKS).toBe(sites + reads - 1);
    expect(LOG_CHECKS).toBe(35);
    expect(LOG_VIEWPORT).toBe(240);
  });

  it("keeps every locator apart", () => {
    const ids = [LOG_IDS.viewer, LOG_IDS.frame, LOG_IDS.list, LOG_IDS.append];
    expect(Arr.dedupe(ids)).toHaveLength(ids.length);
    expect(LOG_IDS.list).toBe("log-list");
  });
});

describe("the probe mounts the shipped log viewer", () => {
  it("composes the package's component instead of a local list", () => {
    expect(probe).toContain('from "@gpuixui/files"');
    expect(probe).toContain("<LogViewer");
    expect(probe).not.toContain("<virtual-list");
    // The component passes its `testId` to the list it builds.
    expect(component).toContain("testId={testId}");
    expect(component).toContain("followTail={follow}");
    expect(component).toContain('alignment="bottom"');
  });

  it("drives the component's controlled follow and filter", () => {
    expect(probe).toContain("followTail={state.follow}");
    expect(probe).toContain("onFollowTailChange=");
    expect(probe).toContain("enabledLevels={state.levels}");
    expect(probe).toContain("onEnabledLevelsChange=");
    expect(probe).toContain("testId={LOG_IDS.list}");
    // The scene names the row height and the viewport it measures.
    expect(probe).toContain("rowHeight={LOG_ROW_HEIGHT}");
    expect(probe).toContain("height={LOG_VIEWPORT}");
  });
});

describe("the log-viewer-lifecycle probe's record", () => {
  it("registers the probe once, over the log capability", () => {
    const entries = Arr.filter(
      liveRegistry,
      (entry) => entry.id === "log-viewer-lifecycle",
    );
    expect(entries).toHaveLength(1);
    expect(entries[0]?.capability).toBe("log");
    expect(entries[0]?.title).toContain("LogViewer");
  });

  it("documents it under the version it was measured on", () => {
    expect(section).not.toBe("");
    const printed = Number(
      /(\d+) checks, `--only log-viewer-lifecycle`/.exec(section)?.[1] ??
        Number.NaN,
    );
    expect(printed).toBe(LOG_CHECKS);
  });

  it("prints the painted windows and anchors the window read", () => {
    // The rest window, the followed tail, the wheel's window, the anchor the
    // wheel left, the anchor the flag returns to and both filtered tails.
    Arr.forEach(
      [
        "230–239",
        "270–279",
        "260–269",
        "line 395",
        "line 399",
        "log-viewer-tail",
      ],
      (fact) => {
        expect(section).toContain(fact);
      },
    );
    // The shift a wheel is measured by is the anchor, not an assumed offset.
    expect(section).toContain("anchor names **360**");
    expect(section).toContain("24");
    expect(section).toContain("240");
  });
});
