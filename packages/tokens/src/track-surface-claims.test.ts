/**
 * Guards the defect this plan fixes: `trackSurfacePairs` grew to thirteen
 * surfaces when plan `651` added the pressed `selectedActive` a chosen row keeps
 * under the pointer, but the three present-tense enumerations of that list — the
 * catalogue's groove paragraph, the design system's §8 narrative and the package
 * README — still named twelve. They listed the four base surfaces, the
 * persistent `accent`/`selected` fills and the `hover`/`active` washes, and
 * omitted the pressed fill a reader drags a slider across.
 *
 * The existing `docs.test.ts` cases could not see it. One holds the catalogue's
 * *role table row* to `trackSurfacePairs`, another holds the §8 `unchecked` row
 * as a whole — and a neighbouring clause of that row (the disabled label) names
 * `selectedActive`, so the row satisfied the guard while its track clause
 * deferred to "the row washes". The cases here read each clause, derive every
 * surface, group and count word from the published lists, and fail on the
 * pre-plan sentences.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { statusTones, trackSurfacePairs } from "./index.js";

/** A document as one line, so a wrapped sentence is a single string. */
const prose = (relative: string): string =>
  readFileSync(new URL(relative, import.meta.url), "utf8").replaceAll(
    /\s+/g,
    " ",
  );

/** The slice between two visible markers. */
const between = (text: string, start: string, end: string): string => {
  const from = text.indexOf(start);
  const to = text.indexOf(end, from + start.length);
  if (from === -1 || to === -1) {
    throw new Error(`missing slice: "${start}" … "${end}"`);
  }
  return text.slice(from, to);
};

const words = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
  "twenty",
] as const;

const countWord = (count: number): string => words[count] ?? String(count);

const surfaces = trackSurfacePairs.map(([, background]) => background);
const base = ["background", "card", "popover", "muted"] as const;
const soft = statusTones.map((tone) => `${tone}Soft`);
const state = surfaces.filter(
  (surface) =>
    !base.some((name) => name === surface) && !soft.includes(surface),
);

const catalogue = prose("../../../docs/tokens.md");
const designSystem = prose("../../../docs/design-system.md");
const readme = prose("../README.md");

const groove = between(
  catalogue,
  "So `track` is a designed neutral step",
  "`primary`, `success`, `destructive` and",
);
const systemGroove = between(
  designSystem,
  "A value indicator's unfilled groove is `track`",
  "A rail that disappears while the row",
);
const systemRow = between(
  designSystem,
  "a switch that is off is the `track` groove",
  "with its knob as `foreground`",
);
const frontDoor = between(
  readme,
  "The groove those value indicators sit in is `track`",
  "`trackMarkPairs` holds the four progress fills",
);

describe("the value groove's surface list", () => {
  it("is the four base surfaces, the five state washes and the four soft fills", () => {
    expect(surfaces).toEqual([
      "background",
      "card",
      "popover",
      "muted",
      "hover",
      "active",
      "accent",
      "selected",
      "selectedActive",
      "infoSoft",
      "successSoft",
      "warningSoft",
      "destructiveSoft",
    ]);
    expect(base).toHaveLength(4);
    expect(soft).toHaveLength(statusTones.length);
    expect(state).toEqual([
      "hover",
      "active",
      "accent",
      "selected",
      "selectedActive",
    ]);
  });

  it("every page names each surface it counts, the pressed fill included", () => {
    [groove, systemGroove, frontDoor].forEach((slice) => {
      [...base, ...state].forEach((surface) => {
        expect(slice, surface).toContain(`\`${surface}\``);
      });
      expect(slice).toContain("`selectedActive`");
      expect(slice).toContain(`${countWord(soft.length)} soft status fills`);
    });
  });

  it("every page states the count and the split the lists derive", () => {
    [groove, systemGroove, frontDoor].forEach((slice) => {
      expect(slice).toContain(`${countWord(surfaces.length)} surfaces`);
      expect(slice).toContain(`${countWord(base.length)} base surfaces`);
      expect(slice).toContain(`${countWord(state.length)} state washes`);
      expect(slice).toContain(`${countWord(soft.length)} soft status fills`);
      expect(slice).not.toContain("twelve surfaces");
      expect(slice).not.toContain("the persistent `accent`/`selected`");
    });
  });

  it("the state table's track clause names its own washes", () => {
    state.forEach((surface) => {
      expect(systemRow, surface).toContain(`\`${surface}\``);
    });
    expect(systemRow).toContain("`selectedActive`");
    expect(systemRow).toContain("`track`");
  });

  it("detects the pre-plan sentences it replaced", () => {
    const claimsTwelve = (text: string): boolean =>
      text.includes("the persistent `accent`/`selected`") &&
      text.includes("the `hover`/`active` washes") &&
      !text.includes("`selectedActive`");

    [
      "It is measured on the four base surfaces, the persistent `accent`/`selected` row fills, the `hover`/`active` washes a row or a slider paints under the pointer and the four soft status fills an Alert or Badge provides, at 1.05:1 (`trackSurfacePairs`)",
      "The role is measured on the four base surfaces, the persistent `accent`/`selected` row fills, the `hover`/`active` washes a row or a slider paints under the pointer and the four soft status fills a status panel provides",
      "`trackSurfacePairs` holds it to 1.05:1 on the four base surfaces, the persistent `accent`/`selected` fills, the `hover`/`active` washes a row or a slider paints under the pointer and the four soft status fills a status panel provides",
    ].forEach((historical) => expect(claimsTwelve(historical)).toBe(true));

    [groove, systemGroove, frontDoor].forEach((slice) =>
      expect(claimsTwelve(slice)).toBe(false),
    );
  });
});
