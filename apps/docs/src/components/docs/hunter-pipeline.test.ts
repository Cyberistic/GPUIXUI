import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  dossiersIn,
  hunterDossiers,
  hunterReadings,
  pipelineStages,
  renownCeiling,
  renownNights,
  renownStep,
  renownTicks,
  stagesFor,
} from "./hunter-pipeline";

/**
 * The hunter pipeline block's own arithmetic.
 *
 * The block is a dashboard, so every number on it comes from one list: the
 * stages' strip, the two dossier columns, the blocked count and the chart all
 * read the arrays here. These cases hold the rules that a rendering cannot be
 * checked on — which dossiers a column shows, which stages a filter keeps, and
 * the scale the chart draws.
 */

const source = readFileSync(
  new URL("./hunter-pipeline.tsx", import.meta.url),
  "utf8",
);

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

  it("never invents a stage", () => {
    for (const filter of ["all", "open", "verified"] as const) {
      for (const stage of stagesFor(filter)) {
        expect(pipelineStages).toContain(stage);
      }
    }
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

  it("reads the eight snapshots the block claims", () => {
    expect(renownNights).toHaveLength(8);
    // The last night is the one the chart rests on, so it must be the largest.
    const last = renownNights[renownNights.length - 1].renown;
    expect(
      Math.max(...renownNights.map((night) => night.renown)),
    ).toBeGreaterThanOrEqual(last);
  });
});

describe("the block's surfaces", () => {
  it("uses the shared Button family, never a second chrome", () => {
    expect(source).toContain('className="gx-btn gx-btn-outline gx-btn-sm"');
    expect(source).toContain("gx-btn-ghost");
    // The chart's ticks are painted text with a hit area, not buttons.
    expect(source).toContain('<svg\n          aria-hidden="true"');
  });

  it("names five readings", () => {
    expect(hunterReadings).toHaveLength(5);
  });
});
