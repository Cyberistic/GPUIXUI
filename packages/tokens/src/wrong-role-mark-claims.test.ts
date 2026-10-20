/**
 * Bug guarded: the design system's §9 closes the mark section with the three
 * shipped marks that paint the *wrong* role, and quotes each one's evidence —
 * the light `warning` fill on the canvas, the timeline dot's `muted` on the
 * identity canvas, and both `accent` ranges on the menu's `popover` and the
 * `hover` fill. No test read any of those five figures.
 *
 * Two further passages restated the *avatar* figure as "1.78:1 on a light card"
 * (`mark-contrast.test.ts`) and "**1.78:1** on its card" (`TODO.md`), but the
 * light `card` is `#FFFFFF` and the fill measures **1.89:1** there; `1.78:1` is
 * the canvas (`background`) figure the catalogue publishes beside it. So the
 * documents a consumer reads to judge the dot's own ring named a number that
 * ring does not produce, and a palette edit in any of the 24 shipped sets could
 * leave the ranges, the premise ("under the 3:1 mark floor") and both
 * attributions unedited while every suite stayed green.
 *
 * `node:fs` is deliberate, like `warning-fill-claims.test.ts` and
 * `skeleton-pulse-claims.test.ts`: this is a documentation test over the tree's
 * own prose, and the tokens package ships zero runtime dependencies by design.
 */
import { readFileSync } from "node:fs";
import { assert, describe, expect, it } from "vitest";
import type { ThemeColors } from "./color.js";
import { contrastFloors, contrastRatio } from "./contrast.js";
import { shippedThemes } from "./shipped-themes.js";
import { extendTheme, getTheme } from "./theme.js";

const prose = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8").replace(/\s+/g, " ");

/** The three-decimal form the pages quote a range in. */
const fixed = (value: number): string => value.toFixed(3);

/** The two-decimal form the pages quote the `warning` fill's figures in. */
const fixed2 = (value: number): string => value.toFixed(2);

/** A passage, sliced between two anchors that appear once each. */
const slice = (text: string, start: string, end: string): string => {
  const from = text.indexOf(start);
  const to = text.indexOf(end, from);
  assert(from !== -1 && to !== -1, `no slice from ${JSON.stringify(start)}`);
  return text.slice(from, to);
};

/** The ordered minimum and maximum of one pair over every shipped set. */
const range = (
  foreground: keyof ThemeColors,
  background: keyof ThemeColors,
) => {
  const ordered = shippedThemes
    .map(({ theme }) => ({
      name: theme.name,
      ratio: contrastRatio(theme.colors[foreground], theme.colors[background]),
    }))
    .toSorted((left, right) => left.ratio - right.ratio);
  const low = ordered[0];
  const high = ordered[ordered.length - 1];
  assert(low !== undefined && high !== undefined, "no shipped themes");
  return { low, high, text: `${fixed(low.ratio)}–${fixed(high.ratio)}:1` };
};

const design = prose("../../../docs/design-system.md");
const marks = slice(
  design,
  "A fill is not automatically a surface.",
  "It can fail:",
);
const todo = prose("../../../TODO.md");
const avatarRow = slice(
  todo,
  "moves the Avatar presence dot off the solid status",
  "moves the Timeline upcoming dot off",
);
const timelineRow = slice(
  todo,
  "moves the Timeline upcoming dot off",
  "paints the Notification centre's unread dot",
);
const menuRow = slice(
  todo,
  "moves the menu row's highlight bar off",
  "moves the Avatar presence dot off the solid status",
);
const header = readFileSync(
  new URL("./mark-contrast.test.ts", import.meta.url),
  "utf8",
)
  .replaceAll(/\n \* ?/g, " ")
  .replace(/\s+/g, " ");

const light = getTheme("light");

describe("the wrong-role marks' figures", () => {
  it("measures the avatar dot's card at 1.89, not the canvas's 1.78", () => {
    const { colors } = light;
    const canvas = fixed2(contrastRatio(colors.warning, colors.background));
    const card = fixed2(contrastRatio(colors.warning, colors.card));

    expect([canvas, card]).toEqual(["1.78", "1.89"]);
    expect(Number(card)).toBeLessThan(contrastFloors.default.mark);

    expect(marks).toContain("`warning` fill is **1.78:1** on the canvas");
    expect(header).toContain("1.89:1 on the `card`");
    expect(header).not.toContain("1.78");
    expect(avatarRow).toContain("`card`-coloured ring");
    expect(avatarRow).toContain(`**${card}:1** on its card`);
    expect(avatarRow).not.toContain("1.78:1");
  });

  it("measures the timeline dot on the identity canvas and names Aero light's", () => {
    const identity = fixed(
      contrastRatio(light.colors.muted, light.colors.background),
    );
    const shipped = range("muted", "background");

    expect(identity).toBe("1.036");
    expect(shipped.low.name).toBe("Light · Windows 7");
    expect(fixed(shipped.low.ratio)).toBe("1.014");

    expect(header).toContain(`${identity}:1`);
    expect(timelineRow).toContain(`**${identity}:1**`);
    expect(timelineRow).toContain("on Aero light");
    expect(timelineRow).toContain(fixed(shipped.low.ratio));
  });

  it("derives both menu-bar ranges from the shipped sets", () => {
    const popover = range("accent", "popover");
    const hover = range("accent", "hover");

    expect(popover.text).toBe("1.118–1.392:1");
    expect([popover.low.name, popover.high.name]).toEqual([
      "Dark · Windows",
      "Light · Windows XP",
    ]);
    expect(hover.text).toBe("1.000–1.113:1");
    expect(hover.low.name).toBe("Light");
    expect(hover.high.name.startsWith("High contrast dark")).toBe(true);

    expect(marks).toContain(popover.text);
    expect(marks).toContain(hover.text);
    expect(menuRow).toContain(popover.text);
    expect(menuRow).toContain(hover.text);
    expect(header).toContain(popover.text);
  });

  it("holds every quoted figure under its own set's mark floor", () => {
    const figures = [
      ["accent", "popover"],
      ["accent", "hover"],
    ] as const satisfies ReadonlyArray<
      readonly [keyof ThemeColors, keyof ThemeColors]
    >;

    const failures = shippedThemes.flatMap(({ theme }) => {
      const floor = contrastFloors[theme.contrast].mark;
      return figures.flatMap(([foreground, background]) => {
        const ratio = contrastRatio(
          theme.colors[foreground],
          theme.colors[background],
        );
        return ratio < floor
          ? []
          : [`${theme.name}: ${foreground} on ${background} at ${ratio}`];
      });
    });

    expect(failures).toEqual([]);
    expect(contrastFloors.default.mark).toBe(3);
    expect(contrastFloors.high.mark).toBe(4.5);
  });

  it("reads the pages instead of a constant", () => {
    const popover = range("accent", "popover");
    const rewritten = marks.replace(popover.text, "1.119–1.392:1");
    expect(rewritten).not.toBe(marks);
    expect(rewritten).not.toContain(popover.text);

    const preFix = avatarRow.replace(
      "**1.89:1** on its card",
      "**1.78:1** on its card",
    );
    expect(preFix).not.toBe(avatarRow);
    expect(preFix).toContain("1.78:1");
  });

  it("moves both endpoints with a planted accent", () => {
    const shipped = range("accent", "popover");
    const planted = extendTheme(light, { colors: { accent: "#000000" } });
    const moved = fixed(
      contrastRatio(planted.colors.accent, planted.colors.popover),
    );

    expect(moved).not.toBe(fixed(shipped.low.ratio));
    expect(moved).not.toBe(fixed(shipped.high.ratio));
    expect(Number(moved)).toBeGreaterThan(contrastFloors.default.mark);
  });
});
