/**
 * Guards the design-system rows in `COMPONENTS.md`.
 *
 * The bug these cases catch: plan 099 made `overlay` a measured role, but the
 * **Theme contrast check** row still listed it in the exemption list, so the
 * ledger contradicted itself in one sentence. The same row is the only place
 * outside test code that states the contract's pair counts and floor table, and
 * the neighbouring rows repeat the role, type-role, motion and platform counts
 * — none of it guarded, while `docs/tokens.md`, `docs/design-system.md` and the
 * package README all are.
 *
 * `node:fs` is used deliberately: this is a documentation test over the tree's
 * own ledger, and the tokens package ships zero runtime dependencies by design.
 *
 * Plan 313 found the row's second role count stale (`62 semantic roles` beside
 * “the current 58” after plan 311 added four), so every `<number> role` phrase in
 * the row is now held to `colorRoles.length`, not just the opening count.
 *
 * Plan 611 made `ring` the tenth check `themeFailures` composes. The ledger's
 * Total theme check row still said `inventory.test.ts` held "this row's nine
 * names", and its present-tense count ("the ten kinds") was the only count in
 * the ledger with no owner, so an eleventh kind would leave the row quoting the
 * old size while every suite stayed green. The row is count-free where it
 * reports history and its one present-tense count is held to `themeChecks`.
 *
 * Plan 787 closed the same gap for the Design tokens row's range parenthetical:
 * it quoted the avatar scale as `16…40` while the package has shipped
 * `20/26/32/40` since plan 054 — the range came from plan 725's own mis-measured
 * summary — and it quoted the density control ladder as two presets where
 * `densityNames` has three. No case read any of its four endpoints, so falsifying
 * them left the suite green. The four phrases now derive from `spacingSteps`,
 * `avatarSizeSteps` and the density index, and the case fails for every range
 * edit as well as for a shipped-value edit.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { colorRoles } from "./color.js";
import {
  contrastFloors,
  contrastPairClasses,
  contrastPairs,
  dialogSurfacePairs,
  inactivePanelActionPairs,
  nativeSyntaxPairs,
  overlayWashPairs,
  selectionFillPairs,
  selectionFillWashPairs,
  selectionInactivePairs,
  selectionInputPairs,
  selectionLinkPairs,
  selectionPairs,
  selectionPressPairs,
  selectionSoftPairs,
  selectionSoftWashPairs,
  selectionStatusPairs,
  selectionWashPairs,
  statusFillPairs,
  statusTextSurfaces,
} from "./contrast.js";
import { tierSurfaces } from "./figures.js";
import { motionLevels, motionPhases } from "./motion.js";
import { metricGroups } from "./metrics.js";
import { translucentRoles } from "./opacity.js";
import { platformNames, platformTypes } from "./platforms.js";
import {
  avatarSize,
  avatarSizeSteps,
  controlSizes,
  densityNames,
  densityPresets,
  spacing,
  spacingSteps,
} from "./scale.js";
import { statusTones } from "./styles.js";
import { themeChecks, type ThemeFailureKind } from "./theme-check.js";
import { typefaceRules } from "./typeface.js";
import { textRoles } from "./typography.js";

const ledger = readFileSync(
  new URL("../../../COMPONENTS.md", import.meta.url),
  "utf8",
);

/** One design-system row, found by its first cell and nothing else. */
const row = (firstCell: string): string => {
  const line = ledger
    .split("\n")
    .find((candidate) => candidate.startsWith(`| ${firstCell} |`));
  if (line === undefined) {
    throw new Error(`COMPONENTS.md has no "${firstCell}" row`);
  }
  return line;
};

const floorRow = (contrast: keyof typeof contrastFloors): string => {
  const floors = contrastFloors[contrast];
  return contrastPairClasses
    .map((pairClass) => floors[pairClass])
    .join(" / ")
    .concat(` ${contrast}`);
};

const countWords = [
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

const countWord = (count: number): string => countWords[count] ?? String(count);

/** The individual check function each kind belongs to. */
const checkFunctions = {
  color: "themeColorFailures",
  opacity: "themeOpacityFailures",
  typeface: "themeTypefaceFailures",
  contrast: "themeContrastFailures",
  ring: "themeRingFailures",
  highlight: "themeHighlightFailures",
  nativeText: "themeNativeTextFailures",
  hierarchy: "themeTextTierFailures",
  direction: "themeDirectionFailures",
  metric: "themeMetricFailures",
} as const satisfies Record<ThemeFailureKind, string>;

describe("COMPONENTS.md design-system rows", () => {
  it("states the role and type-role counts the package ships", () => {
    const tokens = row("Design tokens");
    expect(tokens).toContain(`${colorRoles.length} semantic roles`);
    expect(tokens).toContain(`${textRoles.length} type roles`);
    expect(row("High-contrast theme")).toContain(
      `same ${colorRoles.length} roles`,
    );
  });

  it("states only the shipped role count, however it is written", () => {
    const tokens = row("Design tokens");
    const counts = [
      ...tokens.matchAll(/(\d+)[-\s]roles?\b/g),
      ...tokens.matchAll(/(\d+)\s+semantic\s+roles\b/g),
      ...tokens.matchAll(/\bcurrent\s+(\d+)\b/g),
    ].map((match) => Number(match[1]));
    expect(counts.length).toBeGreaterThan(0);
    counts.forEach((count) => expect(count).toBe(colorRoles.length));
  });

  it("states the scale ranges the indexes derive", () => {
    const range = (values: ReadonlyArray<number>) =>
      `${Math.min(...values)}…${Math.max(...values)}`;
    const controlLadder = densityNames
      .map((name) =>
        controlSizes
          .map((size) => densityPresets[name].controlHeight[size])
          .join("/"),
      )
      .join(" → ");
    const rowLadder = densityNames
      .map((name) => densityPresets[name].rowHeight)
      .join(" → ");

    const tokens = row("Design tokens");
    expect(tokens).toContain(
      `spacing ${range(spacingSteps.map((step) => spacing[step]))}`,
    );
    expect(tokens).toContain(
      `avatars ${range(avatarSizeSteps.map((step) => avatarSize[step]))}`,
    );
    expect(tokens).toContain(`controls ${controlLadder}`);
    expect(tokens).toContain(`rows ${rowLadder}`);

    // The stale range plan 725 copied from its own mis-measured avatar ladder.
    expect(tokens).not.toContain("avatars 16…40");
  });

  it("states the contract's pair counts from the pair lists", () => {
    const contrast = row("Theme contrast check");
    [
      `${contrastPairs.length} contrast pairs`,
      `${nativeSyntaxPairs.length} native syntax pairs`,
      `${selectionPairs.length} selection pairs`,
      `${selectionStatusPairs.length} status-selection text pairs`,
      `${selectionPressPairs.length} pressed-row pairs`,
      `${countWord(statusTones.length)} status labels on the pressed row`,
      `${selectionLinkPairs.length} link-selection text pairs`,
      `${selectionSoftPairs.length} soft-selection text pairs`,
      `${selectionInputPairs.length} field-selection text pairs`,
      `${selectionInactivePairs.length} inactive-selection text pairs`,
      `${selectionWashPairs.length} wash pairs`,
      `${selectionSoftWashPairs.length} soft wash pairs`,
      `${selectionFillPairs.length} fill-selection text pairs`,
      `${selectionFillWashPairs.length} fill-veil pairs`,
      `${inactivePanelActionPairs.length} panel-action inactive pair`,
      `${overlayWashPairs.length} scrim pairs`,
      `${dialogSurfacePairs.length} dialog-face pairs`,
    ].forEach((phrase) => {
      expect(contrast, phrase).toContain(phrase);
    });
  });

  it("states the hierarchy's selected-label fill count from its tier", () => {
    const fills = tierSurfaces(["selectedForeground", "foreground"]);
    const total = row("Total theme check");

    // Derived, not typed: a sixth shared fill moves the word with it.
    expect(fills).toContain("selectedActive");
    expect(total).toContain(`on the ${countWord(fills.length)} fills it keeps`);
    expect(total).not.toContain("on the four fills it keeps");
  });

  it("states the floor table the checker reads", () => {
    expect(row("Theme contrast check")).toContain(
      `${floorRow("default")}, ${floorRow("high")} contrast`,
    );
  });

  it("states the elevation walk the checker adds", () => {
    expect(row("Theme contrast check")).toContain("`elevationSurfaces`");
    expect(row("Theme contrast check")).toContain("`elevationLevels`");
    expect(row("High-contrast theme")).toContain("`highContrastDarkElevation`");
  });

  it("names the floor-class index its table is built from", () => {
    expect(row("Theme contrast check")).toContain("`contrastPairClasses`");
  });

  it("names the pressed field edge the ring role paints", () => {
    expect(row("Focus state")).toContain(
      "pressed field border on the `input` fill",
    );
  });

  it("does not keep a stale exemption list beside the measured roles", () => {
    const contrast = row("Theme contrast check");
    expect(contrast).not.toContain("`overlay`, `scrollbar`");
    expect(contrast).toContain("contrast.test.ts");
  });

  it("names every motion level and easing it claims", () => {
    const motionRow = row("Motion tokens");
    motionLevels.forEach((level) => {
      expect(motionRow, level).toContain(`\`${level}\``);
    });
    motionPhases.forEach((phase) => {
      expect(motionRow, phase).toContain(phase);
    });
  });

  it("names the eight designed filled-control roles", () => {
    const filled = row("Filled control states");
    ["primary", "secondary", "destructive", "accent"].forEach((family) => {
      ["Hover", "Active"].forEach((state) => {
        const role = `${family}${state}`;
        expect(colorRoles, role).toContain(role);
        expect(filled, role).toContain(`\`${role}\``);
      });
    });
  });

  it("names every shipped platform variant", () => {
    const platforms = row("Platform style variants");
    expect(platformNames).toHaveLength(4);
    platformNames.forEach((platform) => {
      expect(platforms, platform).toContain(platformTypes[platform].label);
    });
  });

  it("names the metric groups the numeric contract governs", () => {
    const metrics = row("Theme metric check");
    expect(metrics).toContain(`${metricGroups.length} groups`);
    metricGroups.forEach((group) => {
      expect(metrics, group).toContain(`\`${group}\``);
    });
    expect(metrics).toContain("`themeMetricFailures(theme)`");
    expect(metrics).toContain("only focus indicator");
    expect(metrics).toContain("**Theme contrast check**");
  });

  it("states the colour-format check beside the other format half", () => {
    const colour = row("Theme colour check");
    expect(colour).toContain("`themeColorFailures(theme)`");
    expect(colour).toContain(`${colorRoles.length} \`colorRoles\``);
    expect(colour).toContain("`isHexColor(value)`");
  });

  it("states the typeface check and both indexes", () => {
    const typeface = row("Theme typeface check");
    expect(typeface).toContain("`themeTypefaceFailures(theme)`");
    expect(typeface).toContain("`typefaceRoles`");
    expect(typeface).toContain("`typefaceRules`");
    typefaceRules.forEach((rule) => {
      expect(typeface, rule).toContain(rule);
    });
  });

  it("names the inline avatar's row bound", () => {
    const metrics = row("Theme metric check");
    expect(metrics).toContain("inline avatar");
    expect(metrics).toContain("`rowHeight`");
  });

  it("states the opacity check, its index and its rule", () => {
    const opacity = row("Theme opacity check");
    expect(opacity).toContain("`themeOpacityFailures(theme)`");
    expect(opacity).toContain("`translucentRoles`");
    expect(opacity).toContain("`roleForm`");
    translucentRoles.forEach((role) => {
      expect(opacity, role).toContain(`\`${role}\``);
    });
  });

  it("states the checks from the index, never a subset", () => {
    const total = row("Total theme check");
    expect(total).toContain("`themeChecks`");
    expect(total).toContain("`ThemeFailureKind`");
    expect(ledger).not.toMatch(/\ball (?:three|four) checks\b/);
  });

  it("states the checks and the diagnostic order from the index", () => {
    const total = row("Total theme check");
    themeChecks.forEach((kind) => {
      expect(total, kind).toContain(`\`${checkFunctions[kind]}\``);
    });
    const order = themeChecks.map((kind) => `\`${kind}\``).join(", then ");
    expect(total).toContain(
      `in diagnostic order — ${order} — tagging each entry with its \`kind\``,
    );
  });

  it("states the check count from the index, never a stale total", () => {
    const total = row("Total theme check");
    expect(total).toContain(
      `\`themeChecks\` is the ordered index of the ${countWord(themeChecks.length)} kinds`,
    );
    expect(total).toContain(
      "`inventory.test.ts` holds this row's names and order to `themeChecks`",
    );

    // A past audit keeps its fact ("every check returned []"), not the
    // population it ran over; plan 567's rule applied to the last ledger row
    // that retyped it. Only word numerals are matched, so a `(plan 596)` or a
    // pair count is not a false positive.
    const retypedCheckCount =
      /\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+checks\b/;
    ["Theme contrast check", "Total theme check", "Theme metric check"].forEach(
      (firstCell) => {
        expect(row(firstCell), firstCell).not.toMatch(retypedCheckCount);
      },
    );

    // The pattern is a guard, not a tautology: both historical spellings it
    // replaces fail it, and the replacement prose passes.
    expect(retypedCheckCount.test("while all six checks returned")).toBe(true);
    expect(retypedCheckCount.test("while all nine checks returned")).toBe(true);
    expect(retypedCheckCount.test("while every check returned")).toBe(false);
  });

  it("names every surface the status lists measure", () => {
    const status = row("Status tones");
    const chipSurfaces = [
      ...new Set(statusFillPairs.map(([, background]) => background)),
    ];
    const labelClause = status.slice(
      status.indexOf("`xText` for labels"),
      status.indexOf(";", status.indexOf("`xText` for labels")),
    );

    expect(chipSurfaces).toHaveLength(9);
    expect(chipSurfaces.toSorted()).toEqual([...statusTextSurfaces].toSorted());
    expect(status).toContain(
      `on the ${countWord(chipSurfaces.length)} surfaces a chip sits on`,
    );
    expect(status).not.toContain("on the eight surfaces a chip sits on");
    statusTextSurfaces.forEach((surface) => {
      expect(labelClause, surface).toContain(`\`${surface}\``);
    });
  });

  it("names the Toast countdown's groove exception", () => {
    const tokens = row("Design tokens");
    expect(tokens).toContain(
      "the shipped Toast countdown still paints its 2px groove with `muted`",
    );
    expect(tokens).toContain(
      "1.000:1 on every default-contrast dark `popover`",
    );
    expect(tokens).toContain("(plan 603)");
  });
});
