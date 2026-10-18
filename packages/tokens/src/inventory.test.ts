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
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { colorRoles } from "./color.js";
import {
  contrastFloors,
  contrastPairs,
  dialogSurfacePairs,
  overlayWashPairs,
  selectionLinkPairs,
  selectionPairs,
  selectionSoftPairs,
  selectionSoftWashPairs,
  selectionStatusPairs,
  selectionWashPairs,
} from "./contrast.js";
import { motionLevels, motionPhases } from "./motion.js";
import { metricGroups } from "./metrics.js";
import { translucentRoles } from "./opacity.js";
import { platformNames, platformTypes } from "./platforms.js";
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
  return [
    floors.body,
    floors.secondary,
    floors.inactive,
    floors.boundary,
    floors.mark,
    floors.surface,
    floors.step,
    floors.divider,
  ]
    .join(" / ")
    .concat(` ${contrast}`);
};

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

  it("states the contract's pair counts from the pair lists", () => {
    const contrast = row("Theme contrast check");
    [
      `${contrastPairs.length} contrast pairs`,
      `${selectionPairs.length} selection pairs`,
      `${selectionStatusPairs.length} status-selection text pairs`,
      `${selectionLinkPairs.length} link-selection text pairs`,
      `${selectionSoftPairs.length} soft-selection text pairs`,
      `${selectionWashPairs.length} wash pairs`,
      `${selectionSoftWashPairs.length} soft wash pairs`,
      `${overlayWashPairs.length} scrim pairs`,
      `${dialogSurfacePairs.length} dialog-face pairs`,
    ].forEach((phrase) => {
      expect(contrast, phrase).toContain(phrase);
    });
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
});
