import { readFileSync } from "node:fs";

/**
 * The reflow `floating-reflow-lifecycle` measured, derived from the probe.
 *
 * `capability-doc.test.ts` holds the durable record and `/docs/runtime` to these
 * numbers, so a fixture that grows a different gap — or a window that opens at
 * another size — fails by name instead of leaving two documents teaching the
 * retired placement. Test-only: the fixture belongs to the playground app, so it
 * is read as source, the way `column-drag.test-util.ts` reads its own. `node:fs`
 * is deliberate and synchronous, as in every docs guard: this reads the
 * repository at module load, not a runtime path.
 */

const read = (path: string): string =>
  readFileSync(new URL(`../../../../${path}`, import.meta.url), "utf8");

const fixture = read("apps/playground/src/live/floating-reflow.ts");
const runner = read("apps/playground/src/live/run.ts");
const scenarios = read("apps/playground/src/live/scenarios.tsx");
const readme = read("apps/playground/README.md");

interface Box {
  readonly width: number;
  readonly height: number;
}

interface Placement {
  readonly x: number;
  readonly y: number;
}

/** A `= 6;` constant, or `NaN` when the fixture no longer declares it. */
const constant = (name: string): number =>
  Number(new RegExp(`\\b${name} = (\\d+);`).exec(fixture)?.[1] ?? Number.NaN);

/** One `{ width, height } as const` pair, or `NaN`s. */
const pair = (name: string, source: string): Box => {
  const found = new RegExp(
    `const ${name} = \\{ width: (\\d+), height: (\\d+) \\} as const;`,
  ).exec(source);
  return {
    width: Number(found?.[1] ?? Number.NaN),
    height: Number(found?.[2] ?? Number.NaN),
  };
};

/** The probe's own section of the README, where it records a run. */
const section = (() => {
  const start = readme.indexOf("### `floating-reflow-lifecycle`");
  const end = readme.indexOf("\n## ", start + 1);
  return start === -1 ? "" : readme.slice(start, end === -1 ? undefined : end);
})();

/** The two window sizes the section prints, in the order it prints them. */
const sizes = [...section.matchAll(/\*\*(\d+)×(\d+)\*\*/g)].map((match) => ({
  width: Number(match[1] ?? Number.NaN),
  height: Number(match[2] ?? Number.NaN),
}));

const anchor = pair("REFLOW_ANCHOR", fixture);
const panel = pair("REFLOW_PANEL", fixture);
const gap = constant("REFLOW_SIDE_GAP");
const inset = constant("REFLOW_INSET");
const popoverInset = constant("REFLOW_POPOVER_INSET");
const top = constant("REFLOW_TOP");

/** The probe's steps, from its declaration to the next one. */
const steps = (() => {
  const start = scenarios.indexOf(
    'const floatingReflowSteps: Smoke.AsyncSmokeScenario["steps"]',
  );
  const end = scenarios.indexOf("\nconst ", start + 1);
  return start === -1 ? "" : scenarios.slice(start, end === -1 ? undefined : end);
})();

const opened = sizes[0] ?? { width: Number.NaN, height: Number.NaN };
const zoomed = sizes[1] ?? { width: Number.NaN, height: Number.NaN };

/** The right-hand anchor's left edge in a window `width` wide. */
const anchorLeft = (width: number): number => width - anchor.width - inset;

/** The bottom anchor's top edge in a window `height` tall. */
const anchorTop = (height: number): number => height - anchor.height - inset;

const rightAnchor = (width: number): Placement => ({
  x: anchorLeft(width),
  y: top,
});

const rightPanel = (width: number): Placement => ({
  x: anchorLeft(width) - gap - panel.width,
  y: top,
});

const bottom = (width: number, height: number): Placement => ({
  x: anchorLeft(width),
  y: anchorTop(height),
});

const popoverTrigger = (width: number, height: number): Placement => ({
  x: anchorLeft(width) - popoverInset,
  y: anchorTop(height),
});

export const reflow = {
  /** The window the runner opens, from the runner rather than from a print. */
  runnerWindow: pair("WINDOW", runner),
  window: { opened, zoomed },
  gap,
  anchor,
  panel,
  top,
  /** The least either anchor must travel before the run counts. */
  minTravel: constant("REFLOW_MIN_TRAVEL"),
  /**
   * The checks the probe asserts: `paintedPair` counts once per call site and
   * once in its own body, the same arithmetic `floating-reflow.test.ts` uses.
   */
  checks:
    [...steps.matchAll(/ctx\.expect/g)].length -
    1 +
    [...steps.matchAll(/yield\* paintedPair\(/g)].length,
  right: {
    anchor: { rest: rightAnchor(opened.width), zoomed: rightAnchor(zoomed.width) },
    panel: { rest: rightPanel(opened.width), zoomed: rightPanel(zoomed.width) },
  },
  bottom: {
    rest: bottom(opened.width, opened.height),
    zoomed: bottom(zoomed.width, zoomed.height),
  },
  popoverTrigger: {
    rest: popoverTrigger(opened.width, opened.height),
    zoomed: popoverTrigger(zoomed.width, zoomed.height),
  },
  travel: {
    dx: zoomed.width - opened.width,
    dy: zoomed.height - opened.height,
  },
} as const;
