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
 */

import { readFileSync } from "node:fs";
import { assert, describe, expect, it } from "vitest";
import {
  documentedFigures,
  quotesFigure,
  deriveFigure,
  sameProvenance,
  tightestProvenance,
  type FigureDocument,
} from "./figures.js";

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
