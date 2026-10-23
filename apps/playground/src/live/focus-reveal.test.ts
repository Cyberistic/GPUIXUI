/**
 * Holds the `focus-reveal-lifecycle` fixture, the probe that drives it and the
 * section a reader plans from.
 *
 * The gap this guards: a window moves focus without moving the glass, so a `Tab`
 * into a pane taller than its viewport lands on a control nobody can see. The
 * probe turns that into an offset and a pixel count; if it stopped asserting
 * either, a runtime that started revealing the focus (good news) and a scroller
 * that moved when it should not (a regression) would both read as green. The
 * prediction the live run is held to is `revealOffset` here, so arithmetic that
 * drifts fails before a window opens.
 *
 * `node:fs` is deliberate, as in the other live fixtures: this reads the
 * repository's own probe and prose, never a runtime path.
 */
import { readFileSync } from "node:fs";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  FOCUS_REVEAL_BELOW,
  FOCUS_REVEAL_CHECKS,
  FOCUS_REVEAL_CONTENT,
  FOCUS_REVEAL_END,
  FOCUS_REVEAL_IDS,
  FOCUS_REVEAL_LAST,
  FOCUS_REVEAL_MARK,
  FOCUS_REVEAL_PANE,
  FOCUS_REVEAL_ROW,
  FOCUS_REVEAL_ROWS,
  focusRevealReadout,
  formRowId,
  insidePane,
  revealOffset,
  rovingRowId,
  rowBottom,
  rowTop,
} from "./focus-reveal.js";
import { liveRegistry } from "./registry.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const probe = read("./focus-reveal-probe.tsx");
const scenarios = read("./scenarios.tsx");
const readme = read("../../README.md");

/** This probe's own README section, so a value printed elsewhere cannot pass. */
const sectionOf = (): string => {
  const heading = "### `focus-reveal-lifecycle` — measured on 0.11.0 here";
  const start = readme.indexOf(heading);
  if (start === -1) return "";
  const end = readme.indexOf("\n### ", start + 1);
  return readme.slice(start, end === -1 ? undefined : end);
};

describe("the geometry the two panes rest on", () => {
  it("puts the third row exactly on the pane's bottom edge", () => {
    // The premise a reader plans from: 0–2 fit, so 3 is the first control that
    // costs a scroll. A pane or row that drifted would move the whole table.
    expect(FOCUS_REVEAL_PANE.height).toBe(3 * FOCUS_REVEAL_ROW);
    expect(rowBottom(2)).toBe(FOCUS_REVEAL_PANE.height);
    expect(rowTop(FOCUS_REVEAL_BELOW)).toBe(FOCUS_REVEAL_PANE.height);
    expect(FOCUS_REVEAL_CONTENT).toBe(FOCUS_REVEAL_ROWS * FOCUS_REVEAL_ROW);
    expect(FOCUS_REVEAL_END).toBe(
      FOCUS_REVEAL_PANE.height - FOCUS_REVEAL_CONTENT,
    );
  });

  it("addresses each pane's rows with its own ids", () => {
    const ids = [
      formRowId(FOCUS_REVEAL_LAST),
      rovingRowId(FOCUS_REVEAL_LAST),
      FOCUS_REVEAL_IDS.form,
      FOCUS_REVEAL_IDS.roving,
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("paints the marked row in a colour no role on the page uses", () => {
    // The count is only evidence if the fill is the row's own: a role another
    // surface paints would make "0 px" and "> 0" mean nothing.
    expect(FOCUS_REVEAL_MARK).toBe("#FF3B30");
    expect(FOCUS_REVEAL_MARK).not.toContain("var(");
  });
});

describe("the reveal a minimal scroll owes", () => {
  it("moves a row just inside the fold it crossed", () => {
    expect(revealOffset(0, 0)).toStrictEqual(Option.none());
    expect(revealOffset(2, 0)).toStrictEqual(Option.none());
    expect(revealOffset(FOCUS_REVEAL_BELOW, 0)).toStrictEqual(
      Option.some(-FOCUS_REVEAL_ROW),
    );
    expect(revealOffset(FOCUS_REVEAL_LAST, 0)).toStrictEqual(
      Option.some(FOCUS_REVEAL_END),
    );
  });

  it("brings a row back from above the fold", () => {
    // Above the fold the minimal move puts the row's **top** on the edge: row 1
    // starts at 40 in the content, so it needs offset -40, not -0 — a reveal
    // that scrolled all the way to the top would move the reader two rows more
    // than it has to.
    expect(revealOffset(0, FOCUS_REVEAL_END)).toStrictEqual(Option.some(0));
    expect(revealOffset(1, FOCUS_REVEAL_END)).toStrictEqual(Option.some(-40));
    // A row already in sight is not moved at all.
    expect(revealOffset(FOCUS_REVEAL_LAST, FOCUS_REVEAL_END)).toStrictEqual(
      Option.none(),
    );
  });

  it("clamps at the content's end rather than aligning the last row", () => {
    // The end is where the content stops, not where the row would sit at the
    // top: a reveal that top-aligned the last row would ask for -320 here.
    expect(revealOffset(FOCUS_REVEAL_LAST, -200)).toStrictEqual(
      Option.some(FOCUS_REVEAL_END),
    );
    expect(FOCUS_REVEAL_END).toBe(-240);
  });

  it("tells a row inside its pane from one a point below it", () => {
    const pane = { y: 100, height: FOCUS_REVEAL_PANE.height };
    expect(insidePane({ y: 100, height: FOCUS_REVEAL_ROW }, pane)).toBe(true);
    expect(insidePane({ y: 180, height: FOCUS_REVEAL_ROW }, pane)).toBe(true);
    // The negative control: two points past the fold is outside, beyond the
    // one-point slack an antialiased edge is allowed.
    expect(insidePane({ y: 182, height: FOCUS_REVEAL_ROW }, pane)).toBe(false);
    expect(insidePane({ y: 98, height: FOCUS_REVEAL_ROW }, pane)).toBe(false);
  });
});

describe("the readout", () => {
  it("prints the cursor and the keys it answered", () => {
    expect(focusRevealReadout(0, 0)).toBe("cursor=0 keys=0");
    expect(focusRevealReadout(FOCUS_REVEAL_LAST, FOCUS_REVEAL_LAST + 1)).toBe(
      "cursor=8 keys=9",
    );
  });
});

describe("the probe", () => {
  it("mounts the shipped scroller and the shipped action", () => {
    expect(probe).toContain('from "@gpuixui/primitives"');
    expect(probe).toContain("<ScrollArea");
    expect(probe).toContain("<Button");
    expect(probe).toContain("viewportTestId={FOCUS_REVEAL_IDS.form}");
    expect(probe).toContain("viewportTestId={FOCUS_REVEAL_IDS.roving}");
  });

  it("reveals through the renderer's own route, not a copied algorithm", () => {
    // The alternative a plan adopts: `scrollIntoView` on the row the cursor
    // reached. Hand-rolling the arithmetic (the library's `revealScroll`) would
    // measure a second implementation rather than the runtime.
    expect(probe).toContain("renderer?.scrollIntoView?.(row.id)");
    expect(probe).toContain("renderer?.focusElement?.(row.id)");
    expect(probe).not.toContain("revealScroll(");
    expect(probe).not.toContain("renderer?.scrollTo?.(");
  });

  it("keeps one tab stop for the roving list and one per form row", () => {
    expect(probe).toContain("tabIndex={index === cursor ? 0 : -1}");
    expect(probe).toContain('role="option"');
    expect(probe).toContain('event.key === "down"');
  });

  it("reads the offset and the paint, in that order", () => {
    // The offset is what the runtime holds; the marker is what the reader sees.
    // Both are asserted for the clipped control and for the revealed row.
    expect(probe).toContain("ctx.host.scrollOffset");
    expect(probe).toContain("countPaint(");
    expect(probe).toContain(
      "the focused control paints nothing inside its pane",
    );
    expect(probe).toContain("the revealed row paints inside its pane");
  });

  it("counts the checks it asserts", () => {
    // A planted assertion has to move the count: this is the sum the groups in
    // `focus-reveal.ts` are written as, and the number the live report printed.
    expect(FOCUS_REVEAL_CHECKS).toBe(
      1 + 2 + 1 + 2 + 3 + 2 + 2 + 6 + 1 + 1 + 2 + 7 + 6 + 3 + 5,
    );
    expect(FOCUS_REVEAL_CHECKS).toBe(44);
  });
});

describe("the registry and the README", () => {
  it("registers the probe once, in the focus capability", () => {
    const declared = liveRegistry.filter(
      (entry) => entry.id === "focus-reveal-lifecycle",
    );
    expect(declared).toHaveLength(1);
    expect(declared[0]?.capability).toBe("focus");
    expect(declared[0]?.title).toContain("traversal");
    expect(scenarios).toContain("FocusRevealProbe");
    expect(scenarios).toContain("focusRevealSteps");
    expect(scenarios).toContain('"focus-reveal-lifecycle"');
  });

  it("documents the measurement under the version it was made on", () => {
    const section = sectionOf();
    expect(section).toContain(`${FOCUS_REVEAL_CHECKS} checks`);
    expect(section).toContain("`--only focus-reveal-lifecycle`");
    expect(section).toContain("`src/live/focus-reveal.ts`");
    expect(section).toContain("focus-reveal.test.ts");
    // The numbers a reader plans from, printed by the measured run.
    expect(section).toContain("-40");
    expect(section).toContain("-240");
    expect(section).toContain("200");
  });
});
