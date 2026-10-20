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

import { readdirSync, readFileSync } from "node:fs";
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
  caretPairs,
  contrastPairs,
  extendTheme,
  getTheme,
  selectionSurfaces,
  statusTones,
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
  "packages/tokens/src/ring.ts": readFileSync(
    new URL("./ring.ts", import.meta.url),
    "utf8",
  ),
  "packages/tokens/src/contrast.ts": readFileSync(
    new URL("./contrast.ts", import.meta.url),
    "utf8",
  ),
  "packages/tokens/src/native-text-check.ts": readFileSync(
    new URL("./native-text-check.ts", import.meta.url),
    "utf8",
  ),
  "packages/tokens/src/styles.ts": readFileSync(
    new URL("./styles.ts", import.meta.url),
    "utf8",
  ),
  "packages/tokens/src/toast-countdown.example.ts": readFileSync(
    new URL("./toast-countdown.example.ts", import.meta.url),
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
    const bodyTiers = textTiers.filter(
      ([dimmer, brighter]) =>
        dimmer === "mutedForeground" && bodyRoles.includes(brighter),
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
    const fillCountWords = [
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
    ] as const;
    const countWord = (count: number): string =>
      fillCountWords[count] ?? String(count);
    const selectedLabelFills = tierSurfaces([
      "selectedForeground",
      "foreground",
    ]);
    const panelTiers = textTiers.filter(
      ([dimmer, brighter]) =>
        dimmer === "mutedForeground" &&
        bodyRoles.includes(brighter) === false &&
        brighter.endsWith("SoftForeground"),
    );
    expect(panelTiers).toHaveLength(statusTones.length);
    const panelMinimum = Math.min(
      ...panelTiers.map((tier) => tierMinimum(tier)),
    ).toFixed(3);
    const sentence =
      `every shipped set clears it — secondary text sits ${[...bodyMinima][0]}:1 below ${bodyList}; ` +
      `a status panel's caption ${panelMinimum}:1 below its own ink; ` +
      `the unavailable label ${minimum("disabledForeground", "mutedForeground")}:1 and the hint ${minimum("placeholder", "mutedForeground")}:1 below secondary text; ` +
      `the disabled label of a status-panel action ${minimum("disabledForeground", "softActionForeground")}:1 below the enabled one; ` +
      `and a selected row's inherited label ${minimum("selectedForeground", "foreground")}:1 below its title on the ${countWord(selectedLabelFills.length)} fills it keeps.`;

    expect(
      documents["docs/design-system.md"].replaceAll(/\s+/g, " "),
    ).toContain(sentence);
  });
});

/**
 * Plan 717: five current figures quoted in six places had no test behind them —
 * falsifying every one in place (`5.587 → 5.586`, `3.595 → 3.594`,
 * `2.082 → 2.081`, `4.389 → 4.388`) left all 195 files and 6835 tests green.
 * The entries above derive them; these cases hold the table's own rules.
 */
describe("the figures the package's own JSDoc states", () => {
  it("composes the paints each kind needs", () => {
    const composed = (kind: string) => kind === "fade" || kind === "over-wash";
    const inUnit = (value: number | undefined) =>
      value !== undefined && value > 0 && value <= 1;

    // Listed rather than branched on, so a missing composition is a report and
    // not a silently skipped assertion.
    expect(
      documentedFigures
        .filter(
          (entry) => composed(entry.kind) && entry.composition === undefined,
        )
        .map((entry) => entry.name),
    ).toEqual([]);
    expect(
      documentedFigures
        .filter(
          (entry) => !composed(entry.kind) && entry.composition !== undefined,
        )
        .map((entry) => entry.name),
    ).toEqual([]);
    expect(
      documentedFigures
        .filter((entry) => {
          const composition = entry.composition;
          if (!composed(entry.kind) || composition === undefined) {
            return false;
          }
          const wash = composition.wash;
          return entry.kind === "over-wash"
            ? wash === undefined || !inUnit(wash.opacity)
            : !inUnit(composition.opacity) || wash !== undefined;
        })
        .map((entry) => entry.name),
    ).toEqual([]);
  });

  it("measures the caret on the nine surfaces a field sits on", () => {
    const expected = [
      "background",
      "card",
      "popover",
      "muted",
      "hover",
      "active",
      "accent",
      "selected",
      "input",
    ];
    const derived = contrastPairs
      .filter(
        ([foreground, background]) =>
          foreground === "primaryText" &&
          selectionSurfaces.some((surface) => surface === background),
      )
      .map(([, background]) => background);

    expect(derived).toEqual(expected);
    expect(caretPairs.map(([, surface]) => surface)).toEqual(["input"]);

    documentedFigures
      .filter((entry) => entry.name.startsWith("the caret's nine surfaces"))
      .forEach((entry) => {
        expect(
          entry.pairs.map(([, background]) => background),
          entry.name,
        ).toEqual(expected);
      });
  });

  it("states the shipped-set count nowhere in its own prose", () => {
    // The count is `shippedThemes.length` and a source JSDoc has no derivation
    // site, so the sentence says "every shipped set" instead. This case fails
    // on the tree before plan 717 (`styles.ts` said "in all 24 shipped sets").
    const modules: ReadonlyArray<readonly [string, string]> = readdirSync(
      new URL(".", import.meta.url),
    )
      .filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts"))
      .map((file): readonly [string, string] => [
        file,
        readFileSync(new URL(file, import.meta.url), "utf8"),
      ]);
    const counted = modules.filter(([, source]) =>
      /\b\d+ (?:of the )?shipped sets\b/.test(source),
    );

    expect(counted.map(([file]) => file)).toEqual([]);
  });

  it("rejects the pre-717 figures", () => {
    // Each of the five measured values was in place before this plan; a guard
    // that cannot fail is no guard, so the table refuses the old digits.
    const stale = ["5.586", "3.594", "2.081", "4.388", "1.068"];

    documentedFigures.forEach((entry) => {
      stale.forEach((figure) => {
        expect(
          quotesFigure(documents[entry.document], entry, figure),
          `${entry.name} must not accept ${figure}`,
        ).toBe(false);
      });
    });
  });
});
