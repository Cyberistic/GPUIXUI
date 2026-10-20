/**
 * Guards the figures the find-highlight contract states. The two JSDoc blocks in
 * `src/highlight.ts` quote seven current ratios and no test reads them; the
 * catalogue paragraph's figures are derived by `native-highlight.test.ts`, but
 * only as a presence check — it cannot tell which sentence a number belongs to.
 *
 * Five JSDoc figures were stale after plan 574 moved eight light platform text
 * roles and plans 590/649 moved the Aero inks: the plain minima still read
 * 5.59/4.80 (now 5.77/4.99), the painted-ink minima 5.21/4.51 (now 5.38/4.64),
 * and syntax through the hover wash 6.30 (now 6.74). The step JSDoc printed the
 * washes' own plain-tone ratios as if they were the step, while the step itself
 * is 1.06:1 at its weakest on a painted surface.
 *
 * This file derives each figure from the composition its sentence names and
 * asserts that sentence, in the module and on the page.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { alpha } from "./color.js";
import { compositeOver, contrastRatio } from "./contrast.js";
import { nativeHighlight, nativeHighlightPairs } from "./highlight.js";
import { nativeInk, nativeInkOpacity } from "./native-ink.js";
import { nativeSyntaxTints } from "./native-text-check.js";
import {
  nativeSyntaxRoles,
  nativeTextRoles,
  nativeTextSurfaces,
} from "./native-text.js";
import { shippedThemes } from "./shipped-themes.js";

const source = readFileSync(new URL("./highlight.ts", import.meta.url), "utf8");
const page = readFileSync(
  new URL("../../../docs/tokens.md", import.meta.url),
  "utf8",
).replaceAll(/\s+/g, " ");

const two = (value: number): string => value.toFixed(2);

/** A minimum and the set and composition that produced it, for a failure. */
interface Minimum {
  readonly ratio: number;
  readonly theme: string;
  readonly where: string;
}

const start = (): Minimum => ({
  ratio: Number.POSITIVE_INFINITY,
  theme: "",
  where: "",
});

const keep = (
  current: Minimum,
  ratio: number,
  theme: string,
  where: string,
): Minimum => (ratio < current.ratio ? { ratio, theme, where } : current);

const roles = [...new Set(Object.values(nativeSyntaxRoles))];

/**
 * The minima the paragraph and the JSDoc quote, in the composition each one
 * names: the two washes over a plain tone and over the code block's ink, body
 * text alone, the step between the washes on every paint, and the neutral
 * `hover` wash beside the syntax roles it leaves.
 */
const measure = () => {
  const minima = {
    plainMatch: start(),
    plainActive: start(),
    inkMatch: start(),
    inkActive: start(),
    bodyPlainMatch: start(),
    bodyPlainActive: start(),
    bodyInkMatch: start(),
    bodyInkActive: start(),
    step: start(),
    matchTone: start(),
    activeTone: start(),
    activeInkTone: start(),
    stepPlain: start(),
    hoverTone: start(),
    hoverSyntax: start(),
  };

  shippedThemes.forEach(({ theme }) => {
    const highlight = nativeHighlight(theme);
    const washes = [
      ["match", highlight.color],
      ["active", highlight.activeColor],
    ] as const;

    nativeTextSurfaces.forEach((surface) => {
      const plain = theme.colors[surface];
      const ink = nativeInk(theme, surface, nativeInkOpacity);

      washes.forEach(([wash, color]) => {
        const onTone = compositeOver(color, plain);
        const onInk = compositeOver(color, ink);
        const match = wash === "match";
        nativeHighlightPairs.forEach(([role]) => {
          minima[match ? "plainMatch" : "plainActive"] = keep(
            minima[match ? "plainMatch" : "plainActive"],
            contrastRatio(theme.colors[role], onTone),
            theme.name,
            `${role}/${surface}`,
          );
          minima[match ? "inkMatch" : "inkActive"] = keep(
            minima[match ? "inkMatch" : "inkActive"],
            contrastRatio(theme.colors[role], onInk),
            theme.name,
            `${role}/${surface} ink`,
          );
        });
        minima[match ? "bodyPlainMatch" : "bodyPlainActive"] = keep(
          minima[match ? "bodyPlainMatch" : "bodyPlainActive"],
          contrastRatio(theme.colors.foreground, onTone),
          theme.name,
          surface,
        );
        minima[match ? "bodyInkMatch" : "bodyInkActive"] = keep(
          minima[match ? "bodyInkMatch" : "bodyInkActive"],
          contrastRatio(theme.colors.foreground, onInk),
          theme.name,
          `${surface} ink`,
        );
      });

      minima.stepPlain = keep(
        minima.stepPlain,
        contrastRatio(
          compositeOver(highlight.activeColor, plain),
          compositeOver(highlight.color, plain),
        ),
        theme.name,
        surface,
      );
      minima.matchTone = keep(
        minima.matchTone,
        contrastRatio(compositeOver(highlight.color, plain), plain),
        theme.name,
        surface,
      );
      minima.activeTone = keep(
        minima.activeTone,
        contrastRatio(compositeOver(highlight.activeColor, plain), plain),
        theme.name,
        surface,
      );
      minima.hoverTone = keep(
        minima.hoverTone,
        contrastRatio(theme.colors.hover, plain),
        theme.name,
        surface,
      );
      roles.forEach((role) => {
        minima.hoverSyntax = keep(
          minima.hoverSyntax,
          contrastRatio(theme.colors[role], theme.colors.hover),
          theme.name,
          `${role}/${surface}`,
        );
      });

      const paints = [
        { name: "ink", color: ink },
        ...nativeSyntaxTints.map((tint) => ({
          name: `tint:${tint.wash}`,
          color: compositeOver(
            alpha(theme.colors[nativeTextRoles[tint.wash]], tint.opacity),
            plain,
          ),
        })),
      ];
      paints.forEach((paint) => {
        const match = compositeOver(highlight.color, paint.color);
        const active = compositeOver(highlight.activeColor, paint.color);
        minima.step = keep(
          minima.step,
          contrastRatio(active, match),
          theme.name,
          `${paint.name}/${surface}`,
        );
        if (paint.name === "ink") {
          minima.activeInkTone = keep(
            minima.activeInkTone,
            contrastRatio(active, paint.color),
            theme.name,
            `${paint.name}/${surface}`,
          );
        }
      });
    });
  });

  return minima;
};

const minima = measure();

describe("the find-highlight figures", () => {
  it("are the ones the shipped sets produce", () => {
    const actual = {
      plainMatch: two(minima.plainMatch.ratio),
      plainActive: two(minima.plainActive.ratio),
      inkMatch: two(minima.inkMatch.ratio),
      inkActive: two(minima.inkActive.ratio),
      bodyPlainMatch: two(minima.bodyPlainMatch.ratio),
      bodyPlainActive: two(minima.bodyPlainActive.ratio),
      bodyInkMatch: two(minima.bodyInkMatch.ratio),
      bodyInkActive: two(minima.bodyInkActive.ratio),
      step: two(minima.step.ratio),
      stepPlain: two(minima.stepPlain.ratio),
      matchTone: two(minima.matchTone.ratio),
      activeTone: two(minima.activeTone.ratio),
      activeInkTone: two(minima.activeInkTone.ratio),
      hoverTone: two(minima.hoverTone.ratio),
      hoverSyntax: two(minima.hoverSyntax.ratio),
    };

    expect(actual).toEqual({
      plainMatch: "5.77",
      plainActive: "4.99",
      inkMatch: "5.38",
      inkActive: "4.64",
      bodyPlainMatch: "9.65",
      bodyPlainActive: "8.03",
      bodyInkMatch: "8.93",
      bodyInkActive: "7.31",
      step: "1.06",
      stepPlain: "1.08",
      matchTone: "1.17",
      activeTone: "1.28",
      activeInkTone: "1.25",
      hoverTone: "1.06",
      hoverSyntax: "6.74",
    });
  });

  it("holds the module JSDoc to them", () => {
    expect(source).toContain(
      `still leaves syntax at ${two(minima.hoverSyntax.ratio)}:1`,
    );
    expect(source).toContain(
      `every shipped role at ${two(minima.plainMatch.ratio)}:1 (match) and ${two(minima.plainActive.ratio)}:1 (active)`,
    );
    expect(source).toContain(
      `painted ink surface at ${two(minima.inkMatch.ratio)}:1 and ${two(minima.inkActive.ratio)}:1`,
    );
    expect(source).toContain(
      `(${two(minima.bodyPlainMatch.ratio)}:1 match, ${two(minima.bodyPlainActive.ratio)}:1 active; ${two(minima.bodyInkMatch.ratio)}:1 and ${two(minima.bodyInkActive.ratio)}:1`,
    );
    expect(source).toContain(
      `${two(minima.step.ratio)}:1 at the weakest on a painted surface`,
    );
    expect(source).toContain(
      `clear a plain tone by ${two(minima.matchTone.ratio)}:1 (match) or ${two(minima.activeTone.ratio)}:1 (active)`,
    );
  });

  it("holds the catalogue paragraph to them", () => {
    expect(page).toContain(
      `The active wash is at least **${two(minima.stepPlain.ratio)}:1** from the match and **${two(minima.activeTone.ratio)}:1** from the tone it paints on`,
    );
    expect(page).toContain(
      `the neutral \`hover\` wash is **${two(minima.hoverTone.ratio)}:1** at its weakest and still leaves syntax at **${two(minima.hoverSyntax.ratio)}:1**`,
    );
    expect(page).toContain(
      `the tightest shipped pairs are **${two(minima.plainMatch.ratio)}:1** for the match and **${two(minima.plainActive.ratio)}:1** for the active match, while body text stays at **${two(minima.bodyPlainMatch.ratio)}:1** and **${two(minima.bodyPlainActive.ratio)}:1**`,
    );
    expect(page).toContain(
      `the tightest painted pairs are **${two(minima.inkMatch.ratio)}:1** and **${two(minima.inkActive.ratio)}:1**, body text **${two(minima.bodyInkMatch.ratio)}:1** and **${two(minima.bodyInkActive.ratio)}:1**`,
    );
    expect(page).toContain(
      `the step **${two(minima.step.ratio)}:1** from the match and **${two(minima.activeInkTone.ratio)}:1** from the tone`,
    );
  });
});
