import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { slideOf } from "../../scripts/preview-press-probe";

const root = new URL("../../../../", import.meta.url);
const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const policy = read("docs/preview-strategy.md");

describe("the hydrated preview press", () => {
  it("reads the slide from the readout, not the kicker", () => {
    expect(slideOf("Slide 1 of 4 · wraps at both ends")).toBe(1);
    expect(slideOf("a frame that says Slide 12 of 18 in its copy")).toBe(12);

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

    const readyAt = probe.indexOf("controlReady");
    const nextAt = probe.indexOf('press("Next slide")');
    expect(readyAt).toBeGreaterThan(-1);

    expect(probe).toContain("hasHandler(");
    expect(nextAt).toBeGreaterThan(readyAt);

    expect(probe).toContain('press("Previous slide")');
    expect(probe).toContain("slideOf(text) === 2");
    expect(probe).toContain("slideOf(text) === 1");
  });
});
