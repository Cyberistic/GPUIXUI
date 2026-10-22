/**
 * Holds `docs/design-system.md`'s numbers to the tokens they describe.
 *
 * The bug this guards: the design-system page is the reasoning a consumer reads
 * before adopting the library, and it prints concrete numbers — role count,
 * density heights, type sizes, spacing, radii, platform radii and avatar
 * diameters. `docs.test.ts` guards the token catalogue in `docs/tokens.md`, but
 * nothing read this page, so a scale change could leave it teaching a system the
 * package no longer ships. Each check fails on a changed token or a contradiction
 * in the prose, whichever drifts first.
 *
 * `node:fs` is deliberate, as in `docs.test.ts` and `inventory.test.ts`: this
 * checks the repository's own Markdown, and the package keeps zero runtime
 * dependencies.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { colorRoles, darkColors, lightColors } from "./color.js";
import {
  contrastFloors,
  contrastPairs,
  contrastRatio,
  highContrastFloors,
} from "./contrast.js";
import { decorativeFloor } from "./decorative.js";
import { keyboardDimPairs, keyboardFocusDimOpacity } from "./focus-dim.js";
import { platformNames, platformStyles } from "./platforms.js";
import {
  avatarSize,
  densityPresets,
  radius,
  spacing,
  targetSize,
} from "./scale.js";
import { seriesDeficiencyFloor, seriesDistinctnessFloor } from "./series.js";
import { typography } from "./typography.js";

const doc = readFileSync(
  new URL("../../../docs/design-system.md", import.meta.url),
  "utf8",
);

/** The three platforms with their own style; `default` is the identity. */
const styled = platformNames.filter((name) => name !== "default");
const styleOf = (platform: (typeof styled)[number]) => platformStyles[platform];

/** The one capture group of `pattern`, asserted to exist. */
const capture = (pattern: RegExp): string => {
  const match = pattern.exec(doc)?.[1];
  expect(
    match,
    `docs/design-system.md no longer matches ${pattern}`,
  ).toBeDefined();
  return match ?? "";
};

/** The integers a captured list prints, in order. */
const numbers = (text: string): ReadonlyArray<number> =>
  (text.match(/\d+/g) ?? []).map(Number);

/** The numbers a captured `4/6/10/14` list prints. */
const slashed = (text: string): ReadonlyArray<number> =>
  text.split("/").map(Number);

describe("docs/design-system.md", () => {
  it("prints the role count the themes expose", () => {
    expect(Number(capture(/exactly the same (\d+) roles/))).toBe(
      colorRoles.length,
    );
    expect(Object.keys(lightColors).length).toBe(colorRoles.length);
    expect(Object.keys(darkColors).length).toBe(colorRoles.length);
  });

  it("prints the spacing scale in order", () => {
    const printed = numbers(
      capture(/Spacing is a 4px-derived scale: ([\d,\s]+)\./),
    );
    expect(printed).toEqual(Object.values(spacing));
  });

  it("prints the radius scale in order", () => {
    const printed = numbers(capture(/Radii: ([\d,\s]+), full\./));
    expect(printed).toEqual([
      radius.none,
      radius.sm,
      radius.md,
      radius.lg,
      radius.xl,
    ]);
  });

  it("prints the avatar diameters", () => {
    expect(numbers(capture(/diameter scale — ([\d,\s]+) —/))).toEqual(
      Object.values(avatarSize),
    );
  });

  it("prints each density preset's control heights and row height", () => {
    const drift = Object.values(densityPresets).flatMap((preset) => {
      const pattern = new RegExp(
        `- \`${preset.name}\` — ([\\d/]+) controls, (\\d+)px rows`,
      );
      const match = pattern.exec(doc);
      return match !== null &&
        slashed(match[1] ?? "").join() ===
          Object.values(preset.controlHeight).join() &&
        Number(match[2]) === preset.rowHeight
        ? []
        : [`${preset.name}: ${match?.[0] ?? "no row"}`];
    });

    expect(drift).toEqual([]);
  });

  it("prints each platform's radius scale", () => {
    const printed = [
      slashed(capture(/macOS ([\d/]+), Linux/)),
      slashed(capture(/Linux ([\d/]+), Windows/)),
      slashed(capture(/Windows ([\d/]+),\s+against/)),
      slashed(capture(/against the default ([\d/]+)/)),
    ];
    const shipped = styled.map((platform) => {
      const scale = styleOf(platform).radius;
      return [scale.sm, scale.md, scale.lg, scale.xl];
    });

    expect(printed).toEqual([
      ...shipped,
      [radius.sm, radius.md, radius.lg, radius.xl],
    ]);
  });

  it("names the density each platform style carries", () => {
    const printed: ReadonlyArray<readonly [string, RegExp]> = [
      ["darwin", /macOS `(\w+)`/],
      ["linux", /GNOME `(\w+)`/],
      ["win32", /Windows `(\w+)`/],
    ];
    const drift = printed.flatMap(([platform, pattern]) => {
      const name = capture(pattern);
      const carries = styled.find((known) => known === platform);
      return carries !== undefined && styleOf(carries).density === name
        ? []
        : [`${platform}: ${name}`];
    });

    expect(drift).toEqual([]);
  });

  it("prints type sizes that are the scale's own", () => {
    const sizes = new Set(
      Object.values(typography)
        .filter((role) => typeof role === "object")
        .map((role) => `${role.fontSize}/${role.lineHeight}`),
    );
    const section = doc.slice(
      doc.indexOf("## 5. Typography"),
      doc.indexOf("## 6."),
    );
    const printed = [...section.matchAll(/(\d+)\/(\d+)/g)].map(
      (match) => `${match[1]}/${match[2]}`,
    );

    expect(printed.length).toBeGreaterThanOrEqual(5);
    expect(printed.filter((pair) => !sizes.has(pair))).toEqual([]);
  });

  it("prints the pressable-target floors", () => {
    const floors =
      /`targetSize\.minimum` — (\d+)px — and a touch-first surface may raise it to\s+`targetSize\.comfortable`, (\d+)px/.exec(
        doc,
      );

    expect(
      floors,
      "docs/design-system.md no longer states the target floors by name",
    ).toBeDefined();
    expect(Number(floors?.[1])).toBe(targetSize.minimum);
    expect(Number(floors?.[2])).toBe(targetSize.comfortable);
  });

  it("holds a theme's control heights and row height to the floor in the prose it prints", () => {
    const rule =
      /`invalidNumbers` reports a `controlHeight` under `targetSize\.minimum`\s+\((\d+)px\) as `pressable`/.exec(
        doc,
      );
    const row =
      /`rowHeight` is reported as `pressable` under the same floor/.exec(doc);

    expect(
      rule?.[0],
      "docs/design-system.md no longer holds a brand's control height to the pressable floor",
    ).toBeDefined();
    expect(Number(rule?.[1])).toBe(targetSize.minimum);
    expect(
      row?.[0],
      "docs/design-system.md no longer holds a brand's row height to the pressable floor",
    ).toBeDefined();
  });

  it("prints the data-series distances", () => {
    const measured =
      /any two data series apart from each other \(OKLab distance\) \| ([\d.]+) \| ([\d.]+) \|/.exec(
        doc,
      );
    const vision =
      /any two data series apart after protanopia, deuteranopia and tritanopia \(OKLab distance\) \| ([\d.]+) \| ([\d.]+) \|/.exec(
        doc,
      );

    expect(
      measured,
      "docs/design-system.md no longer states the series distinctness floor",
    ).toBeDefined();
    expect(
      vision,
      "docs/design-system.md no longer states the colour-vision floor",
    ).toBeDefined();
    expect([Number(measured?.[1]), Number(measured?.[2])]).toEqual([
      seriesDistinctnessFloor,
      seriesDistinctnessFloor,
    ]);
    expect([Number(vision?.[1]), Number(vision?.[2])]).toEqual([
      seriesDeficiencyFloor,
      seriesDeficiencyFloor,
    ]);
  });

  it("prints the disabled floor and the surfaces it applies to", () => {
    const line = doc
      .split("\n")
      .find((text) => text.startsWith("| disabled text on its own"));
    const floors = /(\d+(?:\.\d+)?):1 \| (\d+(?:\.\d+)?):1 \|/.exec(line ?? "");

    expect(
      line,
      "docs/design-system.md no longer states the disabled floor by name",
    ).toBeDefined();
    expect(Number(floors?.[1])).toBe(contrastFloors.disabled);
    expect(Number(floors?.[2])).toBe(highContrastFloors.disabled);

    // The row lists the surfaces the table actually measures, so a pair the
    // contract gains cannot go unprinted here.
    const unprinted = contrastPairs
      .filter(
        (pair) =>
          pair.foreground === "disabledForeground" && pair.floor === "disabled",
      )
      .map((pair) => pair.background)
      .filter((background) => !(line ?? "").includes(`\`${background}\``));

    expect(unprinted).toEqual([]);
    // The §8 interaction-state table points at the floor by its export name, so
    // a reader who lands there rather than in §9 still finds it.
    expect(doc).toContain("`contrastFloors.disabled`");
  });

  it("prints the indicator-mark floors and why a status mark is not its fill", () => {
    const row = /an indicator mark[^\n|]*\| ([\d.]+):1 \| ([\d.]+):1 \|/.exec(
      doc,
    );

    expect(
      row,
      "docs/design-system.md no longer states the indicator-mark floor",
    ).toBeDefined();
    expect(Number(row?.[1])).toBe(contrastFloors.boundary);
    expect(Number(row?.[2])).toBe(highContrastFloors.boundary);

    // The page's reason is a measurement, not an opinion: the solid status role
    // is a surface that carries text, so it is below the mark floor.
    const warning = contrastRatio(lightColors.warning, lightColors.background);
    expect(warning).toBeDefined();
    expect(doc).toContain(`\`warning\` is ${warning?.toFixed(2)}:1`);

    // §8 states the busy state the mission asks for, and that it is not the
    // disabled fade: a faded control says "unavailable", a busy one "wait".
    expect(doc).toContain(
      "**Busy is a state of its own, and it is not faded.**",
    );
    expect(doc).toContain("`disabledOpacity` is never the busy");
  });

  it("prints the keyboard dim's measured share, floor and opt-out", () => {
    const row =
      /the dim another focusable[^\n|]*\| ([\d.]+):1 \| ([\d.]+):1 \|/.exec(
        doc,
      );

    expect(
      row,
      "docs/design-system.md no longer states the keyboard dim's floor",
    ).toBeDefined();
    expect(Number(row?.[1])).toBe(decorativeFloor);
    expect(Number(row?.[2])).toBe(decorativeFloor);

    // §8 names the runtime constant and the per-element escape hatch, and states
    // the measured reason a control opts out rather than asking for a floor the
    // mechanism cannot keep.
    expect(doc).toContain("`keyboardFocusDimOpacity`");
    expect(doc).toContain("`keyboardFocusDim: false`");
    expect(doc).toContain(
      `the tightest shipped placement is Linux light's \`primary\` over a card`,
    );

    // The measured share is the page's number, not an assumption.
    expect(doc).toContain(`(\`${keyboardFocusDimOpacity}\`, on by default`);
    expect(doc).toMatch(new RegExp(`${keyboardDimPairs.length}\\s+placements`));
  });
});
