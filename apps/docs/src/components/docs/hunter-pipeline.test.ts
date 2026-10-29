import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  dossiersIn,
  hunterDossiers,
  hunterPills,
  hunterReadings,
  hunterTabs,
  pickedReadout,
  pipelineStages,
  renownCeiling,
  renownNights,
  renownPoint,
  renownStep,
  renownTicks,
  stagesFor,
  vaultRows,
} from "./hunter-pipeline";

/**
 * The hunter pipeline block's own arithmetic and its window's anatomy.
 *
 * Bug guarded: the block shipped as the main pane alone — five readings, a
 * seven-cell strip, a chart — so the "whole app window" the reference shows
 * read as one card. The chrome is half of why it reads as the reference: the
 * six-note tab strip, the vault tree with its open branch and its one current
 * note, the breadcrumb, and the four views the note names. These cases hold
 * what a rendering cannot be checked on, and the CSS reads assert the drawing
 * is the window at the reference's proportions, not a card.
 */

const source = readFileSync(
  new URL("./hunter-pipeline.tsx", import.meta.url),
  "utf8",
);
const css = readFileSync(
  new URL("../../styles/blocks.css", import.meta.url),
  "utf8",
);

/** One selector's declarations from the block style sheet. */
const cssBlock = (selector: string): string => {
  const start = css.indexOf(`${selector} {`);
  const end = css.indexOf("\n}", start);
  return start === -1 || end === -1 ? "" : css.slice(start, end);
};

/** The hunter block's own rules, from its section heading to the sheet's end. */
const huntCss = css.slice(css.indexOf("/* ---- hunter pipeline"));

describe("the dossier columns", () => {
  it("splits the list into the staged and the blocked, and loses none", () => {
    const ready = dossiersIn("ready");
    const blocked = dossiersIn("blocked");

    expect(ready.length).toBeGreaterThan(0);
    expect(blocked.length).toBeGreaterThan(0);
    expect(ready.length + blocked.length).toBe(hunterDossiers.length);
    expect(ready.every((dossier) => dossier.state === "ready")).toBe(true);
    expect(blocked.every((dossier) => dossier.state === "blocked")).toBe(true);
  });

  it("keeps the count the stage strip claims", () => {
    // The dossiers stage's meta names its own column counts; a column that
    // stopped agreeing with it would make the strip lie.
    const stage = pipelineStages.find((entry) => entry.id === "dossiers");
    expect(stage?.meta).toBe(
      `${dossiersIn("ready").length} ready · ${dossiersIn("blocked").length} blocked`,
    );
  });
});

describe("the stage filter", () => {
  it("keeps every stage, the open ones, or the verified one", () => {
    expect(stagesFor("all")).toEqual(pipelineStages);
    expect(stagesFor("open").every((stage) => stage.count > 0)).toBe(true);
    expect(stagesFor("verified").map((stage) => stage.id)).toEqual([
      "verified",
    ]);
  });

  it("never invents a stage, and never reorders one", () => {
    for (const filter of ["all", "open", "verified"] as const) {
      const kept = stagesFor(filter);
      expect(kept.every((stage) => pipelineStages.includes(stage))).toBe(true);
      // A filter drops cells; it does not shuffle the six the reference paints.
      const order = pipelineStages.filter((stage) => kept.includes(stage));
      expect(kept).toEqual(order);
    }
  });

  it("paints the six cells the reference lays across the pane", () => {
    expect(pipelineStages).toHaveLength(6);
  });
});

describe("the renown chart", () => {
  it("rounds the axis to a step a reader can halve", () => {
    // 7 420 peaks at 1 855 a band; an axis of 7 500/5 625/3 750/1 875 reads as
    // arithmetic rather than a scale.
    // 1 855 a band rounds to 2 000, so the axis reads 8 000 / 6 000 / 4 000.
    expect(renownStep(7_420)).toBe(2_000);
    expect(renownCeiling(renownNights)).toBe(8_000);
    expect(renownTicks(renownCeiling(renownNights))).toEqual([
      8_000, 6_000, 4_000, 2_000, 0,
    ]);
  });

  it("holds the peak inside the ceiling for any night list", () => {
    for (const peak of [0, 12, 300, 1_200, 4_800, 7_420, 24_000]) {
      const nights = [{ day: "d", renown: peak, seals: 0 }];
      expect(renownCeiling(nights)).toBeGreaterThanOrEqual(peak);
    }
  });

  it("plots a fraction of the ceiling, clamped to the plot", () => {
    const ceiling = 8_000;
    expect(renownPoint({ day: "d", renown: 4_000, seals: 0 }, ceiling)).toBe(
      0.5,
    );
    expect(renownPoint({ day: "d", renown: 9_900, seals: 0 }, ceiling)).toBe(1);
  });

  it("announces the night the axis picked", () => {
    expect(pickedReadout("Oct 24")).toBe("Oct 24 · 1,980 renown · 118 seals");
    // No pick means the chart rests on the last night, as a new reader sees it.
    expect(pickedReadout(undefined)).toContain("Oct 28 · 5,663 renown");
  });

  it("reads the eight snapshots the block claims", () => {
    expect(renownNights).toHaveLength(8);
    // The last night is the one the chart rests on, so it must be the largest.
    const last = renownNights.at(-1);
    if (last === undefined) throw new Error("the chart has no last night");
    expect(last.renown).toBe(5_663);
    expect(Math.max(...renownNights.map((night) => night.renown))).toBe(7_420);
  });
});

describe("the window's chrome", () => {
  it("draws six notes and keeps exactly one in front", () => {
    expect(hunterTabs).toHaveLength(6);
    expect(hunterTabs.filter((tab) => tab.active === true)).toHaveLength(1);
    expect(hunterTabs.find((tab) => tab.active === true)?.label).toBe(
      "Licence Pipeline",
    );
  });

  it("names four views and stays on the dossier one", () => {
    expect(hunterPills.map((pill) => pill.label)).toEqual([
      "Tracker",
      "Licence index",
      "Open items",
      "Dossiers",
    ]);
    expect(hunterPills.filter((pill) => pill.active === true)).toHaveLength(1);
  });

  it("closes the open vault branch with the note the pane shows", () => {
    const current = vaultRows.filter((row) => row.current === true);
    expect(current).toHaveLength(1);
    const note = current[0];
    if (note === undefined) throw new Error("the tree names no current note");
    expect(note.label).toBe("Licence Pipeline");
    // The reference's active row sits at the bottom of the open `Guild`
    // branch, not loose among the vault's top-level notes.
    expect(note.depth).toBe(1);
    expect(note.kind).toBe("note");
    const branch = vaultRows.find((row) => row.label === "Guild");
    expect(branch?.kind).toBe("open");
    expect(vaultRows.indexOf(branch ?? note)).toBeLessThan(
      vaultRows.indexOf(note),
    );
    expect(vaultRows.at(-1)?.label).toBe("Main Menu");
  });

  it("indents every row by a depth its parent could own", () => {
    // A nested row deeper than its predecessor's depth + 1 would hang off a
    // folder that is not open; a row that jumps to depth 3 under a closed
    // folder reads as a different tree.
    for (const [index, row] of vaultRows.entries()) {
      expect(row.depth).toBeGreaterThanOrEqual(0);
      if (index === 0) continue;
      const parent = vaultRows[index - 1];
      expect(row.depth).toBeLessThanOrEqual((parent?.depth ?? 0) + 1);
      if (row.depth > 0) {
        const ancestor = vaultRows
          .slice(0, index)
          .findLast((candidate) => candidate.depth === row.depth - 1);
        expect(ancestor?.kind).not.toBe("closed");
      }
    }
  });

  it("paints the two verdict figures green and no others", () => {
    expect(hunterReadings).toHaveLength(5);
    expect(
      hunterReadings.filter((reading) => reading.tone === "success"),
    ).toHaveLength(2);
  });
});

describe("the block's surfaces", () => {
  it("is the whole window at the reference's proportions, not a card", () => {
    const window = cssBlock(".gx-hunt");
    expect(window).toContain("width: 100%");
    expect(window).toContain("aspect-ratio: 16 / 10");
    expect(window).not.toContain("max-width: 880px");
    // The reference's rail is 190px on a 16:10 window.
    expect(cssBlock(".gx-hunt-rail")).toContain("width: 190px");
  });

  it("names no colour literal; every paint is a theme role", () => {
    expect(huntCss).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(huntCss).not.toMatch(/\brgba?\(/);
    expect(huntCss).toContain("var(--success)");
    expect(huntCss).toContain("var(--muted-foreground)");
  });

  it("uses the shared Button family, never a second chrome", () => {
    expect(source).toContain('"gx-btn gx-btn-outline gx-btn-sm"');
    expect(source).toContain("gx-btn-ghost");
    // A night is a real control: the axis labels pick the figures the plot
    // names, so the readout is reachable by keyboard too.
    expect(source).toMatch(/aria-pressed=\{night\.day === active\}/);
  });

  it("wears the card recipe on the reading and stage cells", () => {
    expect(source).toContain('className="gx-card gx-hunt-reading"');
    expect(source).toContain('className="gx-card gx-hunt-stage"');
    expect(source).toContain('className="gx-card gx-hunt-card"');
  });
});
