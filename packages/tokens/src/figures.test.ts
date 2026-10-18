/**
 * The regressions these cases guard: three figures `docs/tokens.md` states in
 * the present tense had drifted while every suite stayed green.
 *
 * - The Toast's tone cleared its floor at 11.9753…, which rounds to **11.98**;
 *   the page (and the ledger, and the task list) quoted 11.97, measured before
 *   a later palette step.
 * - The disabled action inside a status panel measured 4.343:1 identity dark
 *   and 5.199:1 AAA dark when plan `514` wrote the sentence; plan `520` moved
 *   `disabledForeground` in both dark sets afterwards, so the shipped values are
 *   **5.148** and **7.310**.
 * - The value groove's "tightest shipped pairs" named identity dark `track` on
 *   its `selected` fill at 1.06:1, but the sentence claims the whole
 *   `trackSurfacePairs` list: Linux light `track` on the `active` wash is the
 *   minimum at **1.050:1**, and identity dark on `selected` measures 1.058:1.
 *   `docs.test.ts` measured one surface, so it agreed with a superlative it
 *   never checked — the plan-350 failure mode, one document over.
 *
 * Each case derives the figure from the shipped enumeration with the checker's
 * own measurement and asserts both the set the sentence names and the sentence
 * that quotes it, so naming the wrong set fails even when the number is right.
 *
 * Plan `537` extends the same rule to the **text tiers**, whose figure is a
 * ratio of ratios. Two present-tense claims had drifted and the case that was
 * meant to hold them measured presence only: the catalogue named identity dark
 * for the panel action's 1.542:1 step, which only the high-contrast dark set
 * measures (identity dark is 1.877:1), and the design system still quoted plan
 * 392's 1.440:1 for the hint after plan 527 moved it to 1.157:1. The tier cases
 * assert the figure, the set **and** the surface, and the design-system summary
 * is rebuilt from the tier groups.
 */

import { readFileSync } from "node:fs";
import { assert, describe, expect, it } from "vitest";
import {
  documentedFigures,
  documentedTierFigures,
  deriveFigure,
  deriveTierFigure,
  quotesFigure,
  sameProvenance,
  tierMinimum,
  tierSurfaces,
  tightestProvenance,
  type FigureDocument,
} from "./figures.js";
import {
  extendTheme,
  getTheme,
  textTiers,
  themeTextTierFailures,
} from "./index.js";
import type { ThemeColors } from "./color.js";

const documents: Readonly<Record<FigureDocument, string>> = {
  "docs/tokens.md": readFileSync(
    new URL("../../../docs/tokens.md", import.meta.url),
    "utf8",
  ),
  "docs/design-system.md": readFileSync(
    new URL("../../../docs/design-system.md", import.meta.url),
    "utf8",
  ),
  "packages/tokens/README.md": readFileSync(
    new URL("../README.md", import.meta.url),
    "utf8",
  ),
  "COMPONENTS.md": readFileSync(
    new URL("../../../COMPONENTS.md", import.meta.url),
    "utf8",
  ),
};

describe("figures the catalogue states in the present tense", () => {
  documentedFigures.forEach((entry) => {
    it(`derives ${entry.name}`, () => {
      const derived = deriveFigure(entry);
      assert(derived.kind === "derived", `${entry.name}: names a shipped set`);
      expect(Number.isNaN(derived.ratio), entry.name).toBe(false);
      if (entry.claim === "tightest") {
        expect(
          sameProvenance(derived.provenance, tightestProvenance(entry)),
          `${entry.name}: the sentence names a set that does not produce the minimum`,
        ).toBe(true);
      }
      expect(
        quotesFigure(documents[entry.document], entry, derived.figure),
        `${entry.name}: ${entry.document} must quote ${derived.figure}:1`,
      ).toBe(true);
    });
  });

  it("derives a finite ratio for every figure", () => {
    const ratios = documentedFigures.map((entry) => {
      const derived = deriveFigure(entry);
      assert(derived.kind === "derived", entry.name);
      return derived.ratio;
    });

    expect(ratios.every((ratio) => Number.isFinite(ratio))).toBe(true);
  });
});

describe("tier figures the documents state in the present tense", () => {
  documentedTierFigures.forEach((entry) => {
    it(`derives ${entry.name}`, () => {
      const derived = deriveTierFigure(entry);
      assert(derived.kind === "derived", `${entry.name}: names a shipped set`);
      expect(Number.isNaN(derived.ratio), entry.name).toBe(false);
      expect(
        derived.figure,
        `${entry.name}: the quoted figure is not the tier's minimum`,
      ).toBe(tierMinimum(entry.tier).toFixed(entry.decimals));
      expect(
        quotesFigure(documents[entry.document], entry, derived.figure),
        `${entry.name}: ${entry.document} must quote ${derived.figure}:1`,
      ).toBe(true);
    });
  });

  it("names every published tier", () => {
    textTiers.forEach(([dimmer, brighter]) => {
      expect(
        documentedTierFigures.some(
          (entry) => entry.tier[0] === dimmer && entry.tier[1] === brighter,
        ),
        `${dimmer} below ${brighter}`,
      ).toBe(true);
    });
  });

  it("compares the surfaces the hierarchy check reports", () => {
    const identity = getTheme("light");

    textTiers.forEach(([dimmer, brighter]) => {
      const flattened = extendTheme(identity, {
        colors: { [dimmer]: identity.colors[brighter] },
      });

      const reported = themeTextTierFailures(flattened)
        .filter(
          (failure) =>
            failure.dimmer === dimmer && failure.brighter === brighter,
        )
        .map((failure) => failure.surface);

      expect(reported, `${dimmer} below ${brighter}`).toEqual([
        ...tierSurfaces([dimmer, brighter]),
      ]);
      expect(reported.length, `${dimmer} below ${brighter}`).toBeGreaterThan(0);
    });
  });

  it("quotes the design system's four groups from the tier list", () => {
    const bodyRoles: ReadonlyArray<keyof ThemeColors> = [
      "foreground",
      "cardForeground",
      "popoverForeground",
      "inputForeground",
    ];
    const bodyTiers = textTiers.filter(([, brighter]) =>
      bodyRoles.includes(brighter),
    );
    expect(bodyTiers.map(([, brighter]) => brighter)).toEqual([...bodyRoles]);

    // The sentence states one figure for all four body-role tiers, so the
    // derivation refuses to build it if they ever stop sharing a minimum.
    const bodyMinima = new Set(
      bodyTiers.map((tier) => tierMinimum(tier).toFixed(3)),
    );
    expect(bodyMinima.size).toBe(1);

    const minimum = (
      dimmer: (typeof textTiers)[number][0],
      brighter: (typeof textTiers)[number][1],
    ): string => tierMinimum([dimmer, brighter]).toFixed(3);

    const roles = bodyRoles.map((role) => `\`${role}\``);
    const bodyList = `${roles.slice(0, -1).join(", ")} and ${roles[roles.length - 1]}`;
    const sentence =
      `every shipped set clears it — secondary text sits ${[...bodyMinima][0]}:1 below ${bodyList}; ` +
      `the unavailable label ${minimum("disabledForeground", "mutedForeground")}:1 and the hint ${minimum("placeholder", "mutedForeground")}:1 below secondary text; ` +
      `and the disabled label of a status-panel action ${minimum("disabledForeground", "softActionForeground")}:1 below the enabled one.`;

    expect(
      documents["docs/design-system.md"].replaceAll(/\s+/g, " "),
    ).toContain(sentence);
  });
});
