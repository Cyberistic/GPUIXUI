import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { slideOf } from "../../scripts/preview-press-probe";

/**
 * A preview is React in the browser, so the only proof of a press path is a
 * **hydrated** session. The measurement that matters: a capture taken during a
 * cold dev server's compile found no React fiber on any node, and a press moved
 * nothing; the same page after hydration moved `Slide 1 of 4` → `Slide 2 of 4`
 * and back. `docs/preview-strategy.md` records that, and
 * `apps/docs/scripts/preview-press-probe.ts` runs it. This guard keeps the
 * policy and the probe from drifting apart: the probe must wait for the
 * control's React handler before it presses, press both directions, and read
 * the demo's own readout — and the readout parser must not mistake the slide
 * kicker (`1 / 4`) for the readout (`Slide 1 of 4`).
 */

const root = new URL("../../../../", import.meta.url);
const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const policy = read("docs/preview-strategy.md");

describe("the hydrated preview press", () => {
  it("reads the slide from the readout, not the kicker", () => {
    expect(slideOf("Slide 1 of 4 · wraps at both ends")).toBe(1);
    expect(slideOf("a frame that says Slide 12 of 18 in its copy")).toBe(12);
    // The workflow demo prints `1 / 4` above the title as well, so a parser
    // that took the first fraction would accept the wrong element for slide 1.
    expect(slideOf("1 / 4 Overview Slide 3 of 4")).toBe(3);
    expect(slideOf("1 / 4 Overview")).toBeUndefined();
    expect(slideOf("Slide 9 of")).toBeUndefined();
  });

  it("holds the measured press to the probe that runs it", () => {
    expect(policy).toContain("### The press path is measured");
    expect(policy).toContain("nub apps/docs/scripts/preview-press-probe.ts");
    expect(policy).toContain("__reactProps.onClick");
    expect(policy).toContain("Slide 1 of 4");
    expect(policy).toContain("--timeout 500");

    const probe = read("apps/docs/scripts/preview-press-probe.ts");
    // The prerequisite is the handler, not a fiber: the tree attaches node by
    // node, and a press on a fiber without props does nothing.
    const readyAt = probe.indexOf("controlReady");
    const nextAt = probe.indexOf('press("Next slide")');
    expect(readyAt).toBeGreaterThan(-1);
    expect(probe).toContain("__reactProps");
    expect(probe).toContain("typeof props.onClick");
    expect(nextAt).toBeGreaterThan(readyAt);
    // Both directions, or the probe would pass on a control that only moves
    // forward — including one that ignores the press and starts on slide 2.
    expect(probe).toContain('press("Previous slide")');
    expect(probe).toContain("slideOf(text) === 2");
    expect(probe).toContain("slideOf(text) === 1");
  });
});
