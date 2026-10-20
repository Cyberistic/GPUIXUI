/**
 * The regression these cases guard: a tone-tinted status panel paints its title
 * with the panel's own `xSoftForeground` and its caption with `mutedForeground`,
 * but `textTiers` compared only the four plain body roles with secondary text.
 * At the default floors the 7:1 body floor implied the step above the 4.5:1
 * caption; at AAA both floors are 7:1, so the six high-contrast light sets
 * measured a caption **1.003–1.042:1** from the panel's ink — visually the same
 * strength — and a theme whose caption *was* the panel ink returned `[]` from
 * `themeFailures`. The four tiers exist so the hierarchy reports it, and the
 * four light inks moved one step below the ramp's 950 stop so every shipped set
 * clears the step (plan 729).
 *
 * The same audit found the selected row's fill count in two documents: both
 * said "four row fills" while `tierSurfaces` has measured five since plan 651
 * added the pressed `selectedActive`.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  contrastFloors,
  contrastRatio,
  extendTheme,
  getTheme,
  shippedThemes,
  statusTones,
  textTiers,
  themeTextTierFailures,
} from "./index.js";
import { tierSurfaces } from "./figures.js";

const panelTiers = statusTones.map(
  (tone) =>
    ["mutedForeground", `${tone}SoftForeground`] as const satisfies readonly [
      "mutedForeground",
      `${typeof tone}SoftForeground`,
    ],
);

const readDocument = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

describe("the soft status panel's caption tier", () => {
  it("publishes a tier for every panel ink", () => {
    panelTiers.forEach(([dimmer, brighter]) => {
      expect(textTiers).toContainEqual([dimmer, brighter]);
    });
    expect(textTiers).toHaveLength(12);
  });

  it("compares each tier on the panel and the card the ink is painted on", () => {
    statusTones.forEach((tone) => {
      const surfaces = tierSurfaces([
        "mutedForeground",
        `${tone}SoftForeground`,
      ]);
      expect(surfaces, tone).toContain(`${tone}Soft`);
      expect(surfaces, tone).toContain("popover");
    });
  });

  it("holds every shipped set to the step", () => {
    const failures = shippedThemes.flatMap(({ theme }) =>
      statusTones.flatMap((tone) => {
        const brighter = `${tone}SoftForeground` as const;
        const step = contrastFloors[theme.contrast].step;
        return tierSurfaces(["mutedForeground", brighter]).flatMap(
          (surface) => {
            const ratio =
              contrastRatio(theme.colors[brighter], theme.colors[surface]) /
              contrastRatio(
                theme.colors.mutedForeground,
                theme.colors[surface],
              );
            return ratio >= step
              ? []
              : [{ set: theme.name, tone, surface, ratio }];
          },
        );
      }),
    );

    expect(failures).toEqual([]);
  });

  it("reports a caption painted with the panel's own ink", () => {
    statusTones.forEach((tone) => {
      const base = getTheme("light", "high");
      const brighter = `${tone}SoftForeground` as const;
      const flattened = extendTheme(base, {
        colors: { mutedForeground: base.colors[brighter] },
      });

      const failures = themeTextTierFailures(flattened).filter(
        (failure) =>
          failure.dimmer === "mutedForeground" && failure.brighter === brighter,
      );

      expect(failures.length, tone).toBeGreaterThan(0);
      expect(
        failures.map((failure) => failure.surface),
        tone,
      ).toEqual([...tierSurfaces(["mutedForeground", brighter])]);
      expect(failures[0]?.step, tone).toBe(contrastFloors.high.step);
    });
  });

  it("keeps the high-contrast light inks readable and a step below the caption", () => {
    const theme = getTheme("light", "high");
    const steps = statusTones.map((tone) => {
      const ink = theme.colors[`${tone}SoftForeground`];
      const fill = theme.colors[`${tone}Soft`];
      const body = contrastRatio(ink, fill);
      expect(body, tone).toBeGreaterThanOrEqual(contrastFloors.high.body);
      return {
        tone,
        body,
        step: body / contrastRatio(theme.colors.mutedForeground, fill),
      };
    });

    expect(
      steps.filter(({ step }) => step < contrastFloors.high.step),
      "the AAA light panel ink is not a step above its caption",
    ).toEqual([]);
  });
});

describe("the selected row's documented fills", () => {
  it("names the five fills the contract measures, in both documents", () => {
    const fills = tierSurfaces(["selectedForeground", "foreground"]);
    expect(fills).toHaveLength(5);

    ["../README.md", "../../../docs/tokens.md"].forEach((path) => {
      const document = readDocument(path).replaceAll(/\s+/g, " ");
      const claim = document.indexOf("five row fills");
      expect(claim, `${path} names the five row fills`).toBeGreaterThanOrEqual(
        0,
      );
      const sentence = document.slice(Math.max(0, claim - 220), claim + 220);
      fills.forEach((fill) => {
        expect(sentence, `${path} names \`${fill}\``).toContain(`\`${fill}\``);
      });
    });
  });
});
