import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import {
  CONTINUATION_TOLERANCE,
  MOTION_FAR_WIDTH,
  MOTION_INTERRUPT_IDS,
  MOTION_INTERRUPT_REST,
  MOTION_MID_WIDTH,
  MOTION_REST_WIDTH,
  continuesFrom,
  isTravellingBetween,
  motionInterruptReadout,
  motionTargetWidth,
} from "./motion-interruption.js";
import { liveRegistry } from "./registry.js";

const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);

const scenarios = readFileSync(
  new URL("./scenarios.tsx", import.meta.url),
  "utf8",
);

const flat = readme.replace(/\s+/g, " ");

const motionInterruptSteps = (() => {
  const start = scenarios.indexOf("const motionInterruptSteps");
  const end = scenarios.indexOf("\nconst ", start + 1);
  return start === -1 || end === -1 ? "" : scenarios.slice(start, end);
})();

describe("the widths the interruption is read against", () => {
  it("keeps three distinct targets a restart cannot be mistaken for", () => {
    expect([MOTION_REST_WIDTH, MOTION_MID_WIDTH, MOTION_FAR_WIDTH]).toEqual([
      120, 240, 400,
    ]);

    expect(CONTINUATION_TOLERANCE).toBeLessThan(
      Math.abs(329.5 - MOTION_FAR_WIDTH),
    );
  });

  it("names each target's width and the readout's one spelling", () => {
    expect(motionTargetWidth("rest")).toBe(MOTION_REST_WIDTH);
    expect(motionTargetWidth("mid")).toBe(MOTION_MID_WIDTH);
    expect(motionTargetWidth("far")).toBe(MOTION_FAR_WIDTH);
    expect(motionInterruptReadout(MOTION_INTERRUPT_REST)).toBe("target=rest");
    expect(motionInterruptReadout({ target: "far" })).toBe("target=far");
  });

  it("reads a travelling width and refuses a settled endpoint", () => {
    expect(
      isTravellingBetween(191.5, MOTION_REST_WIDTH, MOTION_FAR_WIDTH),
    ).toBe(true);
    expect(
      isTravellingBetween(329.5, MOTION_REST_WIDTH, MOTION_FAR_WIDTH),
    ).toBe(true);

    expect(isTravellingBetween(120, MOTION_REST_WIDTH, MOTION_FAR_WIDTH)).toBe(
      false,
    );
    expect(isTravellingBetween(400, MOTION_REST_WIDTH, MOTION_FAR_WIDTH)).toBe(
      false,
    );
  });

  it("accepts a width that continues, and rejects both failure shapes", () => {
    expect(continuesFrom(191.5, 192)).toBe(true);
    expect(continuesFrom(329.5, 329.5)).toBe(true);

    expect(continuesFrom(191.5, MOTION_REST_WIDTH)).toBe(false);

    expect(continuesFrom(191.5, MOTION_FAR_WIDTH)).toBe(false);

    expect(continuesFrom(329.5, MOTION_FAR_WIDTH)).toBe(false);
    expect(continuesFrom(329.5, MOTION_REST_WIDTH)).toBe(false);
  });

  it("rejects a near-miss just outside the tolerance", () => {
    expect(continuesFrom(191.5, 191.5 + CONTINUATION_TOLERANCE + 1)).toBe(
      false,
    );
    expect(continuesFrom(191.5, 191.5 + CONTINUATION_TOLERANCE)).toBe(true);
  });
});

describe("the motion-interruption probe's record", () => {
  it("registers the probe with the layout capability", () => {
    expect(
      Arr.filter(liveRegistry, (probe) => probe.id === "motion-interruption"),
    ).toEqual([
      {
        id: "motion-interruption",
        title: expect.stringContaining("continues from the width on screen"),
        capability: "layout",
      },
    ]);
  });

  it("documents it under the version it was measured on", () => {
    expect(readme).toContain(
      "### `motion-interruption` — measured on 0.11.0 here",
    );
  });

  it("prints the check count the probe asserts", () => {
    const direct = motionInterruptSteps.match(/ctx\.expect/g) ?? [];
    const painted = motionInterruptSteps.match(/paintedBox\(ctx,/g) ?? [];
    const printed = Number(
      /(\d+) checks, `--only motion-interruption`/.exec(readme)?.[1] ??
        Number.NaN,
    );
    expect(printed).toBe(direct.length + painted.length);
    expect(printed).toBe(18);
  });

  it("prints the widths the window painted, both directions", () => {
    Arr.forEach(
      ["**120**", "**191.5**", "**192**", "**329.5**"],
      (measured) => {
        expect(flat).toContain(measured);
      },
    );
    expect(flat).toContain("continues from the width on screen");
    expect(flat).toContain("continues from the width on screen again");
  });

  it("states the runtime rule and what it does not measure", () => {
    expect(flat).toContain("A retarget starts from the painted value");
    expect(flat).toContain("The new run is re-timed from the cut");
    expect(flat).toContain("What it does not measure:");
  });
});

describe("the probe asks the question the section answers", () => {
  it("mounts one measured box and the three targets", () => {
    expect(scenarios).toContain("const MotionInterruptProbe");
    expect(scenarios).toContain("<MotionInterruptProbe />");
    expect(scenarios).toContain("steps: motionInterruptSteps");
    const ids = Object.values(MOTION_INTERRUPT_IDS);
    expect(new Set(ids).size).toBe(ids.length);
    expect(scenarios).toContain("testId={MOTION_INTERRUPT_IDS.box}");
  });

  it("cuts the target from the controls and reads the painted width", () => {
    expect(motionInterruptSteps).toContain(
      "yield* ctx.host.click(MOTION_INTERRUPT_IDS.far);",
    );
    expect(motionInterruptSteps).toContain(
      "yield* ctx.host.click(MOTION_INTERRUPT_IDS.mid);",
    );
    expect(motionInterruptSteps).toContain(
      "yield* ctx.host.click(MOTION_INTERRUPT_IDS.rest);",
    );
    expect(motionInterruptSteps).toContain("continuesFrom(");
    expect(motionInterruptSteps).toContain("isTravellingBetween(");
    expect(motionInterruptSteps).toContain("settledWidth(");
  });

  it("polls for the settle instead of sleeping the declared duration", () => {
    expect(motionInterruptSteps).not.toMatch(/millis\(3\d{3}\)/);
    expect(motionInterruptSteps).not.toContain("settleNumber(");
    const settles = motionInterruptSteps.match(/settledWidth\(/g) ?? [];

    expect(settles.length).toBe(6);
  });
});
