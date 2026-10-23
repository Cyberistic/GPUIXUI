/**
 * Holds the `empty-error-states-lifecycle` fixture, the probe that paints it and
 * the section a reader plans from.
 *
 * The bug this guards: MISSION lists **empty and error states** among the
 * interactions a real runtime has to verify, and no probe drove either — the
 * shipped `EmptyState` had only been mounted, and the panel a list falls back to
 * on a failed load had never painted an error surface or recovered from one. The
 * probe settles both in a window; this suite keeps the fixture, the states it
 * moves through and the words the README prints pointing at one another.
 *
 * `node:fs` is deliberate, as in the other live fixtures: this reads the
 * repository's own probe and prose, never a runtime path.
 */
import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import { getTheme, statusTone } from "@gpuixui/tokens";
import {
  actionPaint,
  afterAction,
  contentPaint,
  EMPTY_ERROR_CHECKS,
  EMPTY_ERROR_COPY,
  EMPTY_ERROR_FRAMES,
  EMPTY_ERROR_IDS,
  EMPTY_ERROR_STAGES,
  EMPTY_ERROR_WIDTH,
  EMPTY_INSET,
  emptyErrorReadout,
  errorInkPaint,
  errorSurfacePaint,
  inside,
  PAINT_INSET,
  stagePaint,
} from "./empty-error.js";
import { liveRegistry } from "./registry.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const probe = read("./empty-error-probe.tsx");
const scenarios = read("./scenarios.tsx");
const readme = read("../../README.md");

const theme = getTheme("dark");

/** This probe's own README section, so a value printed elsewhere cannot pass. */
const sectionOf = (): string => {
  const heading =
    "### `empty-error-states-lifecycle` — measured on 0.11.0 here";
  const start = readme.indexOf(heading);
  if (start === -1) return "";
  const end = readme.indexOf("\n## ", start + 1);
  return readme.slice(start, end === -1 ? undefined : end);
};

describe("the panel's states", () => {
  it("moves error → empty → ready and never backwards on its own", () => {
    expect(EMPTY_ERROR_STAGES).toEqual(["error", "empty", "ready"]);
    expect(afterAction("error")).toBe("empty");
    expect(afterAction("empty")).toBe("ready");
    // A third press has nowhere to go: the panel is already showing its record.
    expect(afterAction("ready")).toBe("ready");
  });

  it("prints the state a check compares", () => {
    expect(EMPTY_ERROR_STAGES.map(emptyErrorReadout)).toEqual([
      "state=error",
      "state=empty",
      "state=ready",
    ]);
  });

  it("addresses every painted part with a distinct id", () => {
    const ids = Object.values(EMPTY_ERROR_IDS);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.includes("empty-error-alert")).toBe(true);
    expect(ids.includes("empty-error-empty")).toBe(true);
  });

  it("keeps the copy each state paints, and the record's word apart", () => {
    expect(EMPTY_ERROR_COPY.alertTitle.length).toBeGreaterThan(0);
    expect(EMPTY_ERROR_COPY.emptyTitle.length).toBeGreaterThan(0);
    expect(EMPTY_ERROR_COPY.content).not.toBe(EMPTY_ERROR_COPY.alertTitle);
    expect(EMPTY_ERROR_COPY.content).not.toBe(EMPTY_ERROR_COPY.emptyTitle);
  });
});

describe("the roles the probe reads", () => {
  it("derives every expected paint from the palette, not a literal", () => {
    expect(stagePaint(theme)).toBe(theme.colors.popover);
    expect(errorSurfacePaint(theme)).toBe(
      statusTone(theme, "destructive").background,
    );
    expect(errorInkPaint(theme)).toBe(
      statusTone(theme, "destructive").foreground,
    );
    expect(actionPaint(theme)).toBe(theme.colors.primary);
    expect(contentPaint(theme)).toBe(theme.colors.success);
    // The four surfaces are different paints, so a sample cannot pass by
    // matching the one behind it.
    const painted = [
      stagePaint(theme),
      errorSurfacePaint(theme),
      actionPaint(theme),
      contentPaint(theme),
    ];
    expect(new Set(painted).size).toBe(painted.length);
  });

  it("samples inside the padding each state owns", () => {
    // The empty state's root reserves a 32-point padding; the probe reads at 8,
    // which is inside the panel and clear of its words.
    expect(EMPTY_INSET).toBeLessThan(32);
    expect(PAINT_INSET).toBeLessThan(EMPTY_ERROR_WIDTH);
    expect(inside({ x: 100, y: 50 }, PAINT_INSET, PAINT_INSET)).toEqual({
      x: 100 + PAINT_INSET,
      y: 50 + PAINT_INSET,
    });
  });
});

describe("the probe", () => {
  it("mounts the shipped error and empty panels, and presses both actions", () => {
    expect(probe).toContain('from "@gpuixui/components"');
    expect(probe).toContain("<Alert");
    expect(probe).toContain("<EmptyState");
    expect(probe).toContain('from "@gpuixui/primitives"');
    expect(probe).toContain('variant="primary"');
    // Both actions advance the same state machine, and the probe presses both.
    expect(probe.match(/onClick=\{advance\}/g)?.length).toBe(2);
    expect(probe).toContain("ctx.host.click(EMPTY_ERROR_IDS.retry)");
    expect(probe).toContain("ctx.host.click(EMPTY_ERROR_IDS.newProject)");
  });

  it("reads paint from three frames and writes no colour literal", () => {
    expect(probe).toContain("capture(EMPTY_ERROR_FRAMES.error)");
    expect(probe).toContain("capture(EMPTY_ERROR_FRAMES.empty)");
    expect(probe).toContain("capture(EMPTY_ERROR_FRAMES.ready)");
    expect(EMPTY_ERROR_FRAMES.error).toBe("empty-error-error");
    expect(EMPTY_ERROR_FRAMES.empty).toBe("empty-error-empty");
    expect(EMPTY_ERROR_FRAMES.ready).toBe("empty-error-ready");
    expect(/backgroundColor: "#[0-9a-fA-F]{3,8}"/.test(probe)).toBe(false);
    expect(probe).toContain("stagePaint(dark)");
    expect(probe).toContain("errorSurfacePaint(dark)");
  });

  it("asserts the surface, the recovery and the absence it claims", () => {
    expect(probe).toContain("the error paints the destructive soft role");
    expect(probe).toContain(
      "the error's readable role paints inside the alert",
    );
    expect(probe).toContain("the empty state paints no surface of its own");
    expect(probe).toContain(
      "the error state unpaints when the empty state replaces it",
    );
    expect(probe).toContain(
      "the empty state unpaints when a record replaces it",
    );
    // The count in the fixture is the floor a step can add to; an assertion
    // planted without a matching count fails here.
    const sites = Arr.length(
      Arr.fromIterable(probe.matchAll(/ctx\.expect\w+\(/g)),
    );
    expect(sites).toBeGreaterThan(0);
    expect(EMPTY_ERROR_CHECKS).toBeGreaterThanOrEqual(sites);
  });
});

describe("the registry and the README", () => {
  it("registers the probe once, in the layout capability", () => {
    const declared = Arr.filter(
      liveRegistry,
      (entry) => entry.id === "empty-error-states-lifecycle",
    );
    expect(declared).toHaveLength(1);
    expect(declared[0]?.capability).toBe("layout");
    expect(declared[0]?.title).toContain("error");
    expect(scenarios).toContain("EmptyErrorProbe");
    expect(scenarios).toContain("emptyErrorSteps");
    expect(scenarios).toContain('"empty-error-states-lifecycle"');
  });

  it("documents the measurement under the version it was made on", () => {
    const section = sectionOf();
    // Scoped to this section: another probe's "33 checks" must not satisfy the
    // count a reader of *this* measurement is told.
    expect(section).toContain(`${EMPTY_ERROR_CHECKS} checks`);
    expect(section).toContain("`src/live/empty-error.ts`");
    expect(section).toContain("empty-error.test.ts");
  });

  it("names the probe in the critical-interaction table it belongs to", () => {
    const flat = readme.replace(/\s+/g, " ");
    expect(flat).toContain(
      "| empty and error states | `empty-error-states-lifecycle`, `validation-lifecycle` |",
    );
  });

  it("prints the roles the probe samples", () => {
    const flat = sectionOf().replace(/\s+/g, " ");
    for (const role of [
      stagePaint(theme),
      errorSurfacePaint(theme),
      errorInkPaint(theme),
      actionPaint(theme),
      contentPaint(theme),
    ]) {
      expect(flat).toContain(role);
    }
  });
});
