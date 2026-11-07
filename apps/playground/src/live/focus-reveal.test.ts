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

const sectionOf = (): string => {
  const heading = "### `focus-reveal-lifecycle` — measured on 0.11.0 here";
  const start = readme.indexOf(heading);
  if (start === -1) return "";
  const end = readme.indexOf("\n### ", start + 1);
  return readme.slice(start, end === -1 ? undefined : end);
};

describe("the geometry the two panes rest on", () => {
  it("puts the third row exactly on the pane's bottom edge", () => {
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
    expect(revealOffset(0, FOCUS_REVEAL_END)).toStrictEqual(Option.some(0));
    expect(revealOffset(1, FOCUS_REVEAL_END)).toStrictEqual(Option.some(-40));

    expect(revealOffset(FOCUS_REVEAL_LAST, FOCUS_REVEAL_END)).toStrictEqual(
      Option.none(),
    );
  });

  it("clamps at the content's end rather than aligning the last row", () => {
    expect(revealOffset(FOCUS_REVEAL_LAST, -200)).toStrictEqual(
      Option.some(FOCUS_REVEAL_END),
    );
    expect(FOCUS_REVEAL_END).toBe(-240);
  });

  it("tells a row inside its pane from one a point below it", () => {
    const pane = { y: 100, height: FOCUS_REVEAL_PANE.height };
    expect(insidePane({ y: 100, height: FOCUS_REVEAL_ROW }, pane)).toBe(true);
    expect(insidePane({ y: 180, height: FOCUS_REVEAL_ROW }, pane)).toBe(true);

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
    expect(probe).toContain("ctx.host.scrollOffset");
    expect(probe).toContain("countPaint(");
    expect(probe).toContain(
      "the focused control paints nothing inside its pane",
    );
    expect(probe).toContain("the revealed row paints inside its pane");
  });

  it("counts the checks it asserts", () => {
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

    expect(section).toContain("-40");
    expect(section).toContain("-240");
    expect(section).toContain("200");
  });
});
