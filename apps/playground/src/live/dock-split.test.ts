/**
 * Holds `dock-split-lifecycle` to the component it claims to measure.
 *
 * The bug this guards is honesty, not paint: the probe exists because
 * `split-pane-lifecycle` drives a probe-local control, so a regression in the
 * shipped `@gpuixui/dock` `SplitPane` would leave every feasibility check green.
 * If this probe is ever rewritten around a local copy again, the name and the
 * README would both claim the library's component while measuring the fixture.
 *
 * The pointer half is measured as **blocked** in the shipped component and
 * recorded for the dock owner; the README section must keep saying so, since a
 * reader who sees only the keyboard rows would assume the drag was verified.
 *
 * `node:fs` is deliberate, as in `split-pane.test.ts` and `registry.test.ts`:
 * this reads the repository's own probe and prose, not a runtime path.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { liveRegistry } from "./registry.js";

const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);

const scenarios = readFileSync(
  new URL("./scenarios.tsx", import.meta.url),
  "utf8",
);

/** The `dockSplitSteps` effect, bounded to the next top-level declaration. */
const dockSteps = (() => {
  const start = scenarios.indexOf("const dockSplitSteps");
  const end = scenarios.indexOf("\nconst ", start + 1);
  return start === -1 || end === -1 ? "" : scenarios.slice(start, end);
})();

/** The probe's view, bounded by the steps effect that follows it. */
const dockView = (() => {
  const start = scenarios.indexOf("const DockSplitProbe");
  const end = scenarios.indexOf("\nconst dockSplitSteps", start + 1);
  return start === -1 || end === -1 ? "" : scenarios.slice(start, end);
})();

/** The README section for this probe, bounded by the next probe's heading. */
const dockSection = (() => {
  const heading = "### `dock-split-lifecycle` — measured on 0.11.0 here";
  const start = readme.indexOf(heading);
  const end = readme.indexOf("\n### ", start + heading.length);
  return start === -1 || end === -1 ? "" : readme.slice(start, end);
})();

describe("the shipped split probe", () => {
  it("is registered once, over the panel capability", () => {
    const entries = liveRegistry.filter(
      (probe) => probe.id === "dock-split-lifecycle",
    );
    expect(entries).toHaveLength(1);
    expect(entries[0]?.capability).toBe("panel");
  });

  it("mounts the package's SplitPane, not a probe-local copy", () => {
    expect(scenarios).toContain('from "@gpuixui/dock"');
    expect(scenarios).toContain("<DockSplitPane");
    expect(dockView).toContain("size={size}");
    expect(dockView).toContain("onResize=");
    expect(dockView).toContain("dividerLabel=");
    expect(dockView).toContain('testId="dock-split"');
    expect(dockView).not.toContain("onMouseDown");
  });

  it("prints the checks the probe runs, counting the paint reads", () => {
    const asserted = dockSteps.match(/ctx\.expect[A-Za-z]+\(/g)?.length ?? 0;
    const painted = dockSteps.match(/paintedBox\(/g)?.length ?? 0;
    expect(asserted).toBeGreaterThan(10);
    expect(painted).toBeGreaterThan(2);
    const printed = Number(
      /(\d+) checks, `--only dock-split-lifecycle`/.exec(readme)?.[1] ??
        Number.NaN,
    );
    expect(printed).toBe(asserted + painted);
  });

  it("records the pointer half's blocker instead of implying it works", () => {
    const prose = dockSection.replace(/\s+/g, " ");
    expect(prose).toContain('position: "absolute"');
    expect(prose).toContain("resizes=0");
    expect(prose).toContain("TODO.md");
    expect(prose).toContain("DIVIDER_STEP");
    expect(prose).toContain("Home");
    expect(prose).toContain("End");
    expect(prose).toContain("ring");
  });
});
