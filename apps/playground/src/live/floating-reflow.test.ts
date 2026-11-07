import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  REFLOW_ANCHOR,
  REFLOW_CHECKS,
  REFLOW_IDS,
  REFLOW_MIN_TRAVEL,
  REFLOW_PANEL,
  REFLOW_POPOVER_INSET,
  REFLOW_SIDE_GAP,
  REFLOW_TOP,
  reflowAnchorLeft,
  reflowAnchorTop,
  reflowOffset,
  sameOffset,
  trailingGap,
} from "./floating-reflow.js";
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

const OPENED = { width: 900, height: 520 } as const;
const ZOOMED = { width: 1680, height: 923 } as const;

const stepsOf = (name: string): string => {
  const start = scenarios.indexOf(
    `const ${name}: Smoke.AsyncSmokeScenario["steps"]`,
  );
  expect(start, `${name} declares its steps`).toBeGreaterThan(-1);
  const end = scenarios.indexOf("\nconst ", start + 1);
  return scenarios.slice(start, end === -1 ? undefined : end);
};

describe("an open panel under a reflow", () => {
  it("derives every anchor from the window the zoom changes", () => {
    expect(reflowAnchorLeft(OPENED.width)).toBe(700);
    expect(reflowAnchorLeft(ZOOMED.width)).toBe(1480);
    expect(
      reflowAnchorLeft(ZOOMED.width) - reflowAnchorLeft(OPENED.width),
    ).toBe(780);

    expect(reflowAnchorTop(OPENED.height)).toBe(440);
    expect(reflowAnchorTop(ZOOMED.height)).toBe(843);
    expect(
      reflowAnchorTop(ZOOMED.height) - reflowAnchorTop(OPENED.height),
    ).toBe(403);

    expect(reflowAnchorLeft(OPENED.width) - REFLOW_POPOVER_INSET).toBe(460);
    expect(reflowAnchorLeft(ZOOMED.width) - REFLOW_POPOVER_INSET).toBe(1240);

    expect(REFLOW_MIN_TRAVEL).toBeLessThan(403);
    expect(REFLOW_MIN_TRAVEL).toBeLessThan(780);
  });

  it("measures a gap and an alignment, never an absolute pixel", () => {
    const anchor = { x: 700, y: 120, width: 160, height: 40 } as const;
    const panel = {
      x: anchor.x - REFLOW_SIDE_GAP - REFLOW_PANEL.width,
      y: anchor.y,
      width: REFLOW_PANEL.width,
      height: REFLOW_PANEL.height,
    };
    expect(trailingGap(anchor, panel)).toBe(6);
    expect(reflowOffset(anchor, panel)).toEqual({
      dx: -REFLOW_PANEL.width - REFLOW_SIDE_GAP,
      dy: 0,
    });

    const moved = { ...anchor, x: 1480, y: 843 };
    const movedPanel = { ...panel, x: moved.x - 146, y: moved.y };
    expect(
      sameOffset(reflowOffset(anchor, panel), reflowOffset(moved, movedPanel)),
    ).toBe(true);

    expect(
      sameOffset(reflowOffset(anchor, panel), {
        dx: reflowOffset(anchor, panel).dx + 2,
        dy: 0,
      }),
    ).toBe(false);
    expect(REFLOW_PANEL.width).toBeLessThan(REFLOW_ANCHOR.width);
    expect(REFLOW_SIDE_GAP).toBe(6);
    expect(REFLOW_TOP).toBe(120);
  });

  it("keeps every locator apart and names the probe the registry declares", () => {
    const ids = Object.values(REFLOW_IDS);
    expect(new Set(ids).size).toBe(ids.length);
    const entry = Arr.findFirst(
      liveRegistry,
      (probe) => probe.id === "floating-reflow-lifecycle",
    );
    expect(Option.map(entry, (probe) => probe.capability)).toStrictEqual(
      Option.some("floating"),
    );
  });

  it("counts the checks the probe asserts", () => {
    const steps = stepsOf("floatingReflowSteps");
    const expectSites = [...steps.matchAll(/ctx\.expect/g)].length;
    const pairSites = [...steps.matchAll(/yield\* paintedPair\(/g)].length;
    expect(pairSites).toBe(7);
    expect(expectSites - 1 + pairSites).toBe(REFLOW_CHECKS);
    expect(REFLOW_CHECKS).toBe(27);
    expect(flat).toContain(`${REFLOW_CHECKS} checks`);
    expect(flat).toContain("--only floating-reflow-lifecycle");
  });

  it("drives a layout reflow and re-reads both axes", () => {
    const steps = stepsOf("floatingReflowSteps");

    expect(steps).toContain("ctx.host.zoomWindow()");
    expect(steps).toContain("settledReflow(");
    expect([...steps.matchAll(/ctx\.host\.zoomWindow\(\)/g)].length).toBe(2);

    expect(scenarios).toContain("reflowAnchorLeft(window.width)");
    expect(scenarios).toContain("reflowAnchorTop(window.height)");

    expect(
      [...steps.matchAll(/the .* panel keeps its top alignment/g)].length,
    ).toBe(2);
    expect(steps).toContain("the popover keeps its vertical offset");

    expect(steps).toContain("ctx.host.click(REFLOW_IDS.popoverTrigger)");
  });

  it("prints the numbers the window measured", () => {
    expect(flat).toContain("**900×520**");
    expect(flat).toContain("**1680×923**");
    expect(flat).toContain("700,120 → 1480,120");
    expect(flat).toContain("554,120 → 1334,120");
    expect(flat).toContain("y 440 → 843");
    expect(flat).toContain("460,440 → 1240,843");
    expect(flat).toContain("y 382 → 785");
    expect(flat).toContain("780");
    expect(flat).toContain("403");

    expect(flat).toContain("expected 554 ± 1, got 1334");
    expect(flat).toContain(".artifacts/live/floating-reflow-zoomed.png");
  });

  it("keeps the honest limit, so a reader does not take it for a divider drag", () => {
    expect(flat).toContain("drives a **window zoom**");
    expect(flat).toContain("not a divider drag");

    expect(flat).toContain("decided once per open");
    expect(flat).toContain("a source read, not a measurement");
  });
});
