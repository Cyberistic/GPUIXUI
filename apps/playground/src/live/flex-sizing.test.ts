/**
 * Holds the arithmetic the `flex-sizing` probe reads a window with, and the
 * claims its README section prints.
 *
 * The probe's answer is a width per box, and the interesting ones are easy to
 * get backwards: `flexBasis: 0` is an even split only while the content fits, an
 * auto basis grows from the content, and a grower whose content is wider than
 * its share keeps its content rather than its share. The window measured **200**
 * and **80** where an equal-split reading predicted 140 and 140, which is why
 * the case table is derived here and the section is held to it.
 *
 * `node:fs` is deliberate, as in `registry.test.ts` and `aspect-ratio.test.ts`:
 * this reads the repository's own probe, twin scenario and Markdown, never a
 * runtime path.
 */
import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  autoBasisShare,
  equalShares,
  FLEX_ALIGN_CASES,
  FLEX_ALIGN_COLUMN_WIDTH,
  FLEX_ALIGN_CONTENT,
  FLEX_CHECKS,
  FLEX_FIT_CONTENT,
  FLEX_FIXED_WIDTH,
  FLEX_FLOOR_CONTENT,
  FLEX_FLOOR_ROW_WIDTH,
  FLEX_IDS,
  FLEX_LONG_CONTENT,
  FLEX_MAX_WIDTH,
  FLEX_NARROW_WIDTH,
  FLEX_OVER_CONTENT,
  FLEX_ROW_WIDTH,
  FLEX_SHORT_CONTENT,
  FLEX_WIDTH_CASES,
  leftover,
  shareNextToContent,
} from "./flex-sizing.js";
import { liveRegistry } from "./registry.js";

const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);

const liveScenarios = readFileSync(
  new URL("./scenarios.tsx", import.meta.url),
  "utf8",
);

const headlessLayout = readFileSync(
  new URL("../scenarios/layout.tsx", import.meta.url),
  "utf8",
);

const headlessRegistry = readFileSync(
  new URL("../scenarios/registry.ts", import.meta.url),
  "utf8",
);

const headlessIndex = readFileSync(
  new URL("../scenarios/index.ts", import.meta.url),
  "utf8",
);

describe("the flex sizing arithmetic", () => {
  it("gives the leftover to the grower and splits it evenly", () => {
    expect(leftover(FLEX_ROW_WIDTH, FLEX_FIXED_WIDTH)).toBe(280);
    expect(equalShares(FLEX_ROW_WIDTH, FLEX_FIXED_WIDTH, 2)).toBe(140);
    expect(equalShares(FLEX_ROW_WIDTH, FLEX_FIXED_WIDTH, 1)).toBe(280);
  });

  it("grows an auto basis from its content plus an equal share", () => {
    // The free width is what the fixed item and both contents leave.
    expect(
      autoBasisShare(
        FLEX_ROW_WIDTH,
        FLEX_FIXED_WIDTH,
        [FLEX_SHORT_CONTENT, FLEX_LONG_CONTENT],
        0,
      ),
    ).toBe(70);
    expect(
      autoBasisShare(
        FLEX_ROW_WIDTH,
        FLEX_FIXED_WIDTH,
        [FLEX_SHORT_CONTENT, FLEX_LONG_CONTENT],
        1,
      ),
    ).toBe(210);
  });

  it("gives the share a wide grower refuses to the one beside it", () => {
    // Measured in the window: 200 + 80, not 140 + 140.
    expect(
      shareNextToContent(FLEX_ROW_WIDTH, FLEX_FIXED_WIDTH, FLEX_OVER_CONTENT),
    ).toBe(80);
    expect(FLEX_OVER_CONTENT).toBeGreaterThan(
      equalShares(FLEX_ROW_WIDTH, FLEX_FIXED_WIDTH, 2),
    );
  });
});

describe("the flex sizing case table", () => {
  it("derives one width per case from its constants", () => {
    expect(FLEX_WIDTH_CASES).toEqual([
      { id: FLEX_IDS.growFixed, width: 120 },
      { id: FLEX_IDS.growFill, width: 280 },
      { id: FLEX_IDS.basisZeroFixed, width: 120 },
      { id: FLEX_IDS.basisZeroShort, width: 140 },
      { id: FLEX_IDS.basisZeroFit, width: 140 },
      { id: FLEX_IDS.basisAutoFixed, width: 120 },
      { id: FLEX_IDS.basisAutoShort, width: 70 },
      { id: FLEX_IDS.basisAutoLong, width: 210 },
      { id: FLEX_IDS.overFixed, width: 120 },
      { id: FLEX_IDS.overShort, width: 80 },
      { id: FLEX_IDS.overItem, width: 200 },
      { id: FLEX_IDS.shrinkFixed, width: 120 },
      { id: FLEX_IDS.shrinkItem, width: 180 },
      { id: FLEX_IDS.noShrinkItem, width: 320 },
      { id: FLEX_IDS.floorItem, width: 300 },
      { id: FLEX_IDS.liftedItem, width: 200 },
      { id: FLEX_IDS.maxGrow, width: 120 },
      { id: FLEX_IDS.alignStart, width: 60 },
      { id: FLEX_IDS.alignCenter, width: 60 },
      { id: FLEX_IDS.alignEnd, width: 60 },
      { id: FLEX_IDS.alignStretch, width: 300 },
    ]);
    expect(FLEX_ALIGN_CASES).toEqual([
      { id: FLEX_IDS.alignStart, x: 0 },
      { id: FLEX_IDS.alignCenter, x: 120 },
      { id: FLEX_IDS.alignEnd, x: 240 },
    ]);
  });

  it("asks for every rule the section teaches, once per box", () => {
    const ids = Arr.map(FLEX_WIDTH_CASES, (box) => box.id);
    expect(new Set(ids).size).toBe(ids.length);
    // Every case reads a box the fixture declares: an id the view does not
    // paint would fail in the window for the wrong reason.
    const declared: ReadonlySet<string> = new Set(Object.values(FLEX_IDS));
    expect(Arr.filter(ids, (id) => !declared.has(id))).toEqual([]);
    // The widths a reader checks first, named so a constant edit cannot leave
    // the table quietly agreeing with itself.
    expect([
      FLEX_FIXED_WIDTH,
      FLEX_NARROW_WIDTH,
      FLEX_ROW_WIDTH,
      FLEX_SHORT_CONTENT,
      FLEX_FIT_CONTENT,
      FLEX_LONG_CONTENT,
      FLEX_OVER_CONTENT,
      FLEX_FLOOR_ROW_WIDTH,
      FLEX_FLOOR_CONTENT,
      FLEX_MAX_WIDTH,
      FLEX_ALIGN_COLUMN_WIDTH,
      FLEX_ALIGN_CONTENT,
    ]).toEqual([120, 300, 400, 20, 60, 160, 200, 200, 300, 120, 300, 60]);
  });

  it("counts the checks the probe asserts", () => {
    expect(FLEX_CHECKS).toBe(
      FLEX_WIDTH_CASES.length + FLEX_ALIGN_CASES.length + 3,
    );
    expect(FLEX_CHECKS).toBe(27);
  });
});

describe("the flex-sizing probe's record", () => {
  it("registers the probe with the layout capability", () => {
    expect(
      Arr.filter(liveRegistry, (probe) => probe.id === "flex-sizing"),
    ).toEqual([
      {
        id: "flex-sizing",
        title: expect.stringContaining("growers"),
        capability: "layout",
      },
    ]);
  });

  it("documents it under the version it was measured on", () => {
    expect(readme).toContain("### `flex-sizing` — measured on 0.11.0 here");
    const printed = Number(
      /(\d+) checks, `--only flex-sizing`/.exec(readme)?.[1] ?? Number.NaN,
    );
    expect(printed).toBe(FLEX_CHECKS);
  });

  it("prints the widths the fixture expects, not remembered ones", () => {
    Arr.forEach(FLEX_WIDTH_CASES, (box) => {
      // The table prints the interesting widths in bold; the align boxes are
      // only described, so they are held by the align sentence below.
      if (box.width === FLEX_ALIGN_CONTENT) return;
      expect(readme).toContain(`**${box.width}**`);
    });
    expect(readme.replace(/\s+/g, " ")).toContain(
      "`start`, `center` and `end` place that width at **0 / 120 / 240**",
    );
    // The rule the window taught, stated as the measurement rather than as
    // "a basis of zero splits evenly". The section is wrapped prose, so the
    // sentences are read from one line of text.
    const flat = readme.replace(/\s+/g, " ");
    expect(flat).toContain(
      "a grower holding content wider than its share keeps its content",
    );
    expect(flat).toContain(
      "A column that must truncate declares `minWidth: 0`",
    );
  });

  it("states both negative controls it measured", () => {
    expect(readme.replace(/\s+/g, " ")).toContain(
      "dropping `minWidth: 0` from the lifted row fails `flex-lifted-item paints the width its rule expects` (`expected 200 ± 1, got 300`)",
    );
    expect(readme.replace(/\s+/g, " ")).toContain(
      "a hand-written **212** for the long auto-basis grower fails",
    );
  });
});

describe("both views ask for the rules the section claims", () => {
  it("mounts every case in the window and declares each property", () => {
    const entries = Object.entries(FLEX_IDS);
    const names = Arr.getSomes(
      Arr.map(FLEX_WIDTH_CASES, (box) =>
        Option.map(
          Arr.findFirst(entries, ([, id]) => id === box.id),
          ([name]) => name,
        ),
      ),
    );
    // A case the view does not name would fail in the window for the wrong
    // reason, so the table and the view are held together here.
    expect(names).toHaveLength(FLEX_WIDTH_CASES.length);
    Arr.forEach(names, (name) => {
      expect(liveScenarios).toContain(`FLEX_IDS.${name}`);
    });
    expect(liveScenarios).toContain("flexGrow: 1");
    expect(liveScenarios).toContain("flexShrink: 0");
    expect(liveScenarios).toContain("flexBasis: 0");
    expect(liveScenarios).toContain("maxWidth: FLEX_MAX_WIDTH");
    expect(liveScenarios).toContain("minWidth: 0");
    expect(liveScenarios).toContain("alignSelf");
  });

  it("registers the headless twin and maps its implementation", () => {
    expect(headlessRegistry).toContain('id: "layout-flex-sizing"');
    expect(headlessRegistry).toContain('capability: "layout"');
    expect(headlessIndex).toContain(
      '"layout-flex-sizing": layoutFlexSizingScenario',
    );
    expect(headlessLayout).toContain("layoutFlexSizingScenario");
    // The twin walks the same tables, so the renderer and the window cannot
    // disagree about which rule they measure.
    expect(headlessLayout).toMatch(/Effect\.forEach\(\s*FLEX_WIDTH_CASES/);
    expect(headlessLayout).toMatch(/Effect\.forEach\(\s*FLEX_ALIGN_CASES/);
    expect(liveScenarios).toMatch(/Effect\.forEach\(\s*FLEX_WIDTH_CASES/);
    expect(liveScenarios).toMatch(/Effect\.forEach\(\s*FLEX_ALIGN_CASES/);
  });
});
