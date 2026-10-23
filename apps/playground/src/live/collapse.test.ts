/**
 * Holds the arithmetic the `collapsible-lifecycle` probe reads a window with,
 * and the claims its README section prints.
 *
 * The finding this file guards is that a disclosure's height is the **content
 * box's**, not the caller's: the window settles the clipping box on the body
 * because `<AutoHeight>` is handed what the content reports through `onLayout`,
 * and the content recipe's padding is part of that number (94 for an 80 body,
 * measured when the negative control left it on). The presses are the other
 * half: the body is grown while the section is closed, when the reveal has
 * unmounted its subtree, so the next open has to measure the height on screen
 * rather than reuse the one it closed with.
 *
 * `node:fs` is deliberate, as in `scrollbar-both.test.ts`: this reads the
 * repository's own probe, view and Markdown, never a runtime path.
 */
import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import {
  COLLAPSE_BODY,
  COLLAPSE_CHECKS,
  COLLAPSE_CLOSES,
  COLLAPSE_GROW_BEFORE,
  COLLAPSE_GROWN,
  COLLAPSE_IDS,
  COLLAPSE_MOUNTED,
  COLLAPSE_OPENS,
  COLLAPSE_PRESSES,
  COLLAPSE_REST,
  COLLAPSE_WIDTH,
  collapseReadout,
} from "./collapse.js";
import { liveRegistry } from "./registry.js";

const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);

const liveScenarios = readFileSync(
  new URL("./scenarios.tsx", import.meta.url),
  "utf8",
);

/** The section's prose on one line, so a wrapped sentence still reads whole. */
const flat = readme.replace(/\s+/g, " ");

describe("a collapsible's measured height", () => {
  it("presses the section through three opens and two closes", () => {
    expect(Arr.map(COLLAPSE_PRESSES, (press) => press.open)).toEqual([
      true,
      false,
      true,
      false,
      true,
    ]);
    // The counters only ever climb: an open increments `opens`, a close
    // increments `closes`, and neither replays after a press.
    expect(Arr.map(COLLAPSE_PRESSES, (press) => press.opens)).toEqual([
      1, 1, 2, 2, 3,
    ]);
    expect(Arr.map(COLLAPSE_PRESSES, (press) => press.closes)).toEqual([
      0, 1, 1, 2, 2,
    ]);
    expect(COLLAPSE_OPENS).toHaveLength(3);
    expect(COLLAPSE_CLOSES).toHaveLength(2);
  });

  it("grows the body while the section is closed, never while it is open", () => {
    // The gap the probe exists for: the tree is unmounted on the press before
    // the grow, so the reopened section has nothing to reuse.
    expect(COLLAPSE_PRESSES[COLLAPSE_GROW_BEFORE - 1]?.open).toBe(false);
    expect(COLLAPSE_PRESSES[COLLAPSE_GROW_BEFORE]?.open).toBe(true);
    expect(COLLAPSE_PRESSES[COLLAPSE_GROW_BEFORE]?.height).toBe(COLLAPSE_GROWN);
    expect(COLLAPSE_PRESSES[COLLAPSE_GROW_BEFORE]?.open).toBe(true);
    // The grow press is between a close at the old height and an open at the
    // new one, so a reorder cannot keep the pass by opening at the grown body.
    expect(COLLAPSE_PRESSES[COLLAPSE_GROW_BEFORE - 1]?.height).toBe(
      COLLAPSE_BODY,
    );
    expect(COLLAPSE_GROW_BEFORE).toBe(2);
  });

  it("keeps the body heights apart from each other and from the width", () => {
    expect(COLLAPSE_MOUNTED).toBeLessThan(COLLAPSE_BODY);
    expect(COLLAPSE_BODY).toBeLessThan(COLLAPSE_GROWN);
    expect(COLLAPSE_WIDTH).toBeGreaterThan(COLLAPSE_GROWN);
    // Three different heights are what let the reopen prove it measured again:
    // two equal numbers could not tell a re-measurement from a stale target.
    expect(
      new Set([COLLAPSE_MOUNTED, COLLAPSE_BODY, COLLAPSE_GROWN]).size,
    ).toBe(3);
  });

  it("prints the one readout shape every press is checked against", () => {
    expect(collapseReadout(COLLAPSE_REST)).toBe(
      "open=false opens=0 closes=0 height=120",
    );
    expect(
      collapseReadout({
        open: true,
        opens: 3,
        closes: 2,
        height: COLLAPSE_GROWN,
      }),
    ).toBe("open=true opens=3 closes=2 height=200");
  });

  it("counts the checks the probe asserts", () => {
    // Every body read is a `paintedBox` check plus the size it returns.
    expect(COLLAPSE_CHECKS).toBe(
      5 + 4 + 1 + COLLAPSE_OPENS.length * 5 + COLLAPSE_CLOSES.length * 3,
    );
    expect(COLLAPSE_CHECKS).toBe(31);
  });

  it("keeps every locator apart", () => {
    const ids = Object.values(COLLAPSE_IDS);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("the collapsible-lifecycle probe's record", () => {
  it("registers the probe with the layout capability", () => {
    expect(
      Arr.filter(liveRegistry, (probe) => probe.id === "collapsible-lifecycle"),
    ).toEqual([
      {
        id: "collapsible-lifecycle",
        title: expect.stringContaining("Collapsible"),
        capability: "layout",
      },
    ]);
  });

  it("documents it under the version it was measured on", () => {
    expect(readme).toContain(
      "### `collapsible-lifecycle` — measured on 0.11.0 here",
    );
    const printed = Number(
      /(\d+) checks, `--only collapsible-lifecycle`/.exec(readme)?.[1] ??
        Number.NaN,
    );
    expect(printed).toBe(COLLAPSE_CHECKS);
  });

  it("prints the heights the window read, not only the constants", () => {
    // The three settled heights and the recipe's padding are measurements; a
    // page that printed only the fixture's numbers would claim none of them.
    Arr.forEach([80, 120, 200], (height) => {
      expect(flat).toContain(`**${height}**`);
    });
    expect(flat).toContain("the same box measures **94** for an **80** body");
    expect(flat).toContain("the recipe's 6 + 8");
  });

  it("states the four rules the section claims", () => {
    expect(flat).toContain("A closed section keeps nothing mounted");
    expect(flat).toContain("The measurement is the content box's");
    expect(flat).toContain(
      "A body that changes while closed is measured on the next open",
    );
    expect(flat).toContain("Height is animated and width is not");
  });

  it("states the negative control it measured", () => {
    expect(flat).toContain(
      "fails `the mount measurement sets the clipping box` (`expected 80 ± 1, got 94`)",
    );
  });
});

describe("the probe asks the question the section answers", () => {
  it("mounts the shipped Collapsible instead of a local measured box", () => {
    expect(liveScenarios).toContain("<Collapsible");
    expect(liveScenarios).toContain("<CollapsibleTrigger");
    expect(liveScenarios).toContain("<CollapsibleContent");
    // Both mount paths are driven: the pressed section and the one that is
    // open at mount.
    expect(liveScenarios).toContain("<Collapsible defaultOpen>");
    expect(liveScenarios).toContain("testId={COLLAPSE_IDS.initialClip}");
  });

  it("drops the content recipe's padding on both sections", () => {
    // The probe's arithmetic is one number per read because of this class; a
    // section mounted without it would settle 14 px past the body.
    const padded = liveScenarios.match(/className="p-0 gap-0"/g) ?? [];
    expect(padded).toHaveLength(2);
  });

  it("grows the body from a control outside the section", () => {
    expect(liveScenarios).toContain("testId={COLLAPSE_IDS.grow}");
    expect(liveScenarios).toContain("index === COLLAPSE_GROW_BEFORE");
    expect(liveScenarios).toContain("COLLAPSE_IDS.grow");
  });
});
