/**
 * Holds the `diff-viewer-lifecycle` fixture, the probe that paints it and the
 * section the README records it in.
 *
 * The gap this guards: `@gpuixui/editor` ships `DiffViewer`, and its page makes
 * three claims no offscreen suite can hold — an added line tints the `success`
 * soft role and a removed line the `destructive` one, a split diff pairs one
 * change on one row with a blank cell where a side ran out, and a line that
 * outgrows its surface is clipped rather than wrapped. The headless
 * `editor-surface` scenario measured the raw `<diff>` host; this probe paints
 * the wrapper. The fixture's rows, numbers and pairing are derived from the
 * package's own logic, so this suite reads them back out of the source: a
 * rename or a changed rule there has to fail here rather than time out in a
 * window.
 *
 * `node:fs` is deliberate, as in the other live fixtures: this reads the
 * repository's own probe, package and prose, never a runtime path.
 */
import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { darkTheme, statusTone, textStyle } from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";
import {
  DIFF_CHECKS,
  DIFF_DESTRUCTIVE,
  DIFF_IDS,
  DIFF_LINE_HEIGHT,
  DIFF_LONG,
  DIFF_METRICS,
  DIFF_PAGE,
  DIFF_ROWS,
  DIFF_SIDE_BAND,
  DIFF_SPLIT_GUTTER,
  DIFF_SPLIT_ROWS,
  DIFF_SUCCESS,
  DIFF_SURFACE,
  DIFF_WIDTH,
  diffRowId,
  longRowText,
  splitRowText,
  unifiedRowText,
} from "./diff-viewer.js";
import { liveRegistry } from "./registry.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const probe = read("./diff-viewer-probe.tsx");
const scenarios = read("./scenarios.tsx");
const readme = read("../../README.md");
const component = read("../../../../packages/editor/src/diff/diff-viewer.tsx");

/** This probe's README section, so a value printed elsewhere cannot pass. */
const sectionOf = (): string => {
  const heading = "### `diff-viewer-lifecycle` — measured on 0.11.0 here";
  const start = readme.indexOf(heading);
  if (start === -1) return "";
  const end = readme.indexOf("\n## ", start + 1);
  // The record wraps its prose, so a clause is read from one line of text.
  return readme.slice(start, end === -1 ? undefined : end).replace(/\s+/g, " ");
};

/** The probe's own steps, so a count cannot be read out of another probe. */
const stepsOf = (): string => {
  const start = probe.indexOf("export const diffViewerSteps");
  return start === -1 ? "" : probe.slice(start);
};

describe("the shipped component's paint", () => {
  it("tints a change with its status tone and keeps the surface behind a context row", () => {
    // The component reads the tone's readable foreground and soft background;
    // the probe's colours are the same roles read from the shipped palette.
    expect(component).toContain(
      'statusTone(theme, kind === "added" ? "success" : "destructive")',
    );
    expect(component).toContain("const lineTint =");
    expect(component).toContain("lineTint(theme, kind)");
    expect(DIFF_SUCCESS).toBe(statusTone(darkTheme, "success").background);
    expect(DIFF_DESTRUCTIVE).toBe(
      statusTone(darkTheme, "destructive").background,
    );
    expect(DIFF_SURFACE).toBe(darkTheme.colors.background);
    expect(DIFF_PAGE).toBe(darkTheme.colors.card);
    expect(DIFF_LINE_HEIGHT).toBe(textStyle(darkTheme, "codeBlock").lineHeight);
  });

  it("paints the tint across the whole unified row", () => {
    // `lineStyle` is the row div's own style, not only the text run's: the probe
    // counts the tint over the row's whole area on that claim.
    expect(component).toContain("lineStyle(theme, metrics, row.kind)");
    expect(component).toContain('whiteSpace: "nowrap"');
    expect(component).toContain("overflow-hidden");
    expect(component).toContain("bg-background");
  });

  it("addresses every row the probe reads", () => {
    expect(component).toContain("testId={`${testId}-row-${index}`}");
    // Each viewer is mounted with its own root, so the row addresses cannot
    // collide across the four viewers in one window.
    expect(diffRowId(DIFF_IDS.unified, 1)).toBe("diff-unified-row-1");
    expect(diffRowId(DIFF_IDS.split, 1)).toBe("diff-split-row-1");
    expect(probe).toContain("testId={DIFF_IDS.unified}");
    expect(probe).toContain("testId={DIFF_IDS.split}");
    expect(probe).toContain("testId={DIFF_IDS.long}");
    expect(probe).toContain("testId={DIFF_IDS.same}");
  });
});

describe("the rows the fixture hands the viewers", () => {
  it("reads the unified rows out of the package's own diff", () => {
    expect(Arr.map(DIFF_ROWS, (row) => row.kind)).toEqual([
      "context",
      "removed",
      "added",
      "context",
      "added",
    ]);
    expect(Arr.map(DIFF_ROWS, unifiedRowText)).toEqual([
      " 11const total = add(1, 2);",
      "-2export const doubled = total * 2;",
      "+2export const doubled = total * 3;",
      " 33console.log(doubled);",
      "+4console.log(summary);",
    ]);
  });

  it("pairs a replacement on one split row and pads the appended line", () => {
    expect(Arr.length(DIFF_SPLIT_ROWS)).toBe(4);
    const replacement = Arr.getUnsafe(DIFF_SPLIT_ROWS, 1);
    expect(Option.isSome(replacement.left)).toBe(true);
    expect(Option.isSome(replacement.right)).toBe(true);
    expect(splitRowText(replacement)).toBe(
      "2export const doubled = total * 2;2export const doubled = total * 3;",
    );
    // The appended line has no before side at all: its left cell is blank, not
    // a copy of the neighbour.
    const appended = Arr.getUnsafe(DIFF_SPLIT_ROWS, 3);
    expect(Option.isNone(appended.left)).toBe(true);
    expect(Option.isSome(appended.right)).toBe(true);
    expect(splitRowText(appended)).toBe("4console.log(summary);");
  });

  it("gives the long line a length its surface cannot hold", () => {
    // A conservative half-em advance is enough: even at 6 points a character the
    // line is twice the surface, so a row that wrapped would be several tall.
    expect(DIFF_LONG.length).toBeGreaterThan(150);
    expect(DIFF_LONG.length * DIFF_METRICS.fontSize * 0.5).toBeGreaterThan(
      DIFF_WIDTH * 2,
    );
    expect(longRowText()).toBe(`+${DIFF_LONG}`);
    expect(longRowText()).not.toContain("1console");
  });

  it("samples each split side at a band its content cannot cross", () => {
    // The measured rule: the cells are sized by their own lines, so a probe that
    // read the row's midpoint read the other side's content. The band is well
    // inside each side and the measured gutter is past the midpoint.
    expect(DIFF_SIDE_BAND).toBeLessThan(0.5);
    expect(DIFF_SIDE_BAND).toBeGreaterThan(0.2);
    expect(DIFF_SPLIT_GUTTER).toBeGreaterThan(0.5);
    expect(probe).toContain("bandOf(changed.box, 0, DIFF_SIDE_BAND)");
    expect(probe).toContain("bandOf(changed.box, 1 - DIFF_SIDE_BAND, 1)");
    expect(probe).not.toContain("width: box.width / 2");
  });
});

describe("the probe", () => {
  it("mounts the shipped wrapper instead of composing a diff", () => {
    expect(probe).toContain('import { DiffViewer } from "@gpuixui/editor";');
    expect(probe).toContain("<DiffViewer");
    expect(probe).toContain('mode="split"');
    expect(probe).toContain("lineNumbers={false}");
    // The arithmetic is the package's; the probe must not carry a second copy.
    expect(probe).not.toContain("diffStrings");
    expect(probe).not.toContain("splitPairs");
    expect(probe).not.toMatch(/#[0-9A-Fa-f]{6}/);
  });

  it("bounded every viewer to the caller's width", () => {
    expect(probe.match(/style=\{\{ width: DIFF_WIDTH \}\}/g)?.length).toBe(4);
  });

  it("is registered under the content capability", () => {
    const entry = liveRegistry.find(
      (candidate) => candidate.id === "diff-viewer-lifecycle",
    );
    expect(entry?.capability).toBe("content");
  });

  it("is mounted by the live runner", () => {
    expect(scenarios).toContain('"diff-viewer-lifecycle": {');
    expect(scenarios).toContain("view: () => <DiffViewerProbe />");
    expect(scenarios).toContain("steps: diffViewerSteps");
    expect(scenarios).toContain(
      'import { DiffViewerProbe, diffViewerSteps } from "./diff-viewer-probe.js";',
    );
  });

  it("counts the checks the probe can assert", () => {
    const sites = Arr.length(
      Arr.fromIterable(stepsOf().matchAll(/ctx\.expect\w+\(/g)),
    );
    expect(sites).toBeGreaterThan(20);
    // The helpers assert per call and the row loops repeat their sites, so the
    // printed count floors the source-level sites.
    expect(DIFF_CHECKS).toBeGreaterThanOrEqual(sites);
    expect(DIFF_CHECKS).toBeGreaterThan(60);
  });
});

describe("the record", () => {
  it("documents the probe under the version it was measured on", () => {
    const section = sectionOf();
    expect(section).not.toBe("");
    expect(section).toContain(`${DIFF_CHECKS} checks`);
    expect(section).toContain("`--only diff-viewer-lifecycle`");
    expect(section).toContain("four captures");
  });

  it("prints the measured tints, heights and roles", () => {
    const section = sectionOf();
    expect(section).toContain(DIFF_SUCCESS);
    expect(section).toContain(DIFF_DESTRUCTIVE);
    expect(section).toContain(DIFF_SURFACE);
    expect(section).toContain(DIFF_PAGE);
    expect(section).toContain(`**${DIFF_LINE_HEIGHT}** tall`);
    expect(section).toContain(`**${DIFF_WIDTH}** points wide`);
    expect(section).toContain(`**${DIFF_ROWS.length}** rows`);
    expect(section).toContain(`**${DIFF_SPLIT_ROWS.length}** rows`);
  });

  it("prints the split layout the window measured, not a promise of halves", () => {
    const section = sectionOf();
    expect(section).toContain(`${Math.round(DIFF_SPLIT_GUTTER * 100)}%`);
    expect(section).toContain("crosses the midpoint");
    expect(section).toContain("clipped");
    // The retracted expectation: the page's own behaviour suite may read halves;
    // the window measured content-sized cells, and the record must say so.
    expect(section).not.toContain("split evenly");
    expect(section).not.toContain("two equal halves");
  });

  it("names the long line and the gutter switch it measures", () => {
    const section = sectionOf();
    expect(section).toContain(`**${DIFF_LONG.length}**-character`);
    expect(section).toContain("`lineNumbers={false}`");
    expect(section).toContain("`+console.log('xxx…");
  });

  it("names the negative controls it measured", () => {
    const section = sectionOf();
    expect(section).toContain("Negative controls measured");
    expect(section).toContain(
      "the pushed added line is clipped at the surface's edge",
    );
    expect(section).toContain("the right band paints none of the removed role");
  });

  it("names the probe among those measured alone", () => {
    const start = readme.indexOf("Measured alone since then:");
    const clause = readme.slice(start, readme.indexOf("(", start));
    expect(clause).toContain("`diff-viewer-lifecycle`");
  });
});
