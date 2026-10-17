/**
 * Guards `packages/tokens/README.md` against drift. The README is the package's
 * front door and repeats claims that already have a tested source: the role
 * count, the type-role count, the motion levels, the status families and every
 * platform row. Before this file, a palette, type or platform edit could ship a
 * README that lies while the whole suite stayed green — the motion paragraph had
 * already lost the `none` level.
 *
 * It also holds the install path: a private workspace package is on no registry,
 * so `nub add @gpuixui/tokens` is a dead command until Phase G publishes it. The
 * manifest's `private` flag decides which instruction the front door must give.
 *
 * The assertions build the exact sentence or row from the implementation and
 * require it to appear, the same one-way method as `docs.test.ts`. `node:fs` is
 * deliberate: this is a documentation test over the package's own files, and the
 * package ships zero runtime dependencies by design.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import packageJson from "../package.json";
import { colorRoles } from "./color.js";
import { contrastFloors } from "./contrast.js";
import { motion } from "./motion.js";
import {
  platformNames,
  platformStyles,
  platformTypes,
  type PlatformName,
} from "./platforms.js";
import { defaultDensity, radius } from "./scale.js";
import { statusTones } from "./styles.js";
import { themes } from "./theme.js";
import { textRoles } from "./typography.js";

const readme = readFileSync(
  new URL("../README.md", import.meta.url),
  "utf8",
).replace(/\s+/g, " ");

const sentenceList = (values: ReadonlyArray<string>): string =>
  values.length < 2
    ? values.join("")
    : `${values.slice(0, -1).join(", ")} and ${values.slice(-1).join("")}`;

describe("packages/tokens/README.md", () => {
  it("presents an install path that exists today", () => {
    // A private workspace package is never on a registry, so `nub add` would be
    // a dead command. The truthful instruction changes at publication, so the
    // manifest decides which half the README must present.
    const install =
      packageJson.private === true
        ? '"@gpuixui/tokens": "workspace:*"'
        : "nub add @gpuixui/tokens";
    expect(readme).toContain(install);
  });

  it("states the role count the shipped themes carry", () => {
    expect(readme).toContain(`same ${colorRoles.length} roles`);
  });

  it("states the type-role count textRoles lists", () => {
    expect(readme).toContain(`all ${textRoles.length} typographic roles`);
  });

  it("states that a theme records the floor set it is designed against", () => {
    expect(readme).toContain(
      "The `Theme` records the floor set it is designed against",
    );
    expect(readme).toContain(
      "`themeContrastFailures(theme, contrast = theme.contrast)`",
    );
  });

  it("states the state washes and floating surface the ring is checked on", () => {
    expect(readme).toContain(
      "The focus ring is checked on the canvas, card, popover and the `hover`, `active` and `selected` washes, so a ring that vanishes on a selected row is caught.",
    );
  });

  it("states where default body text is checked", () => {
    expect(readme).toContain(
      "Default body text is checked on the canvas, card, the `muted` panel, `popover` and the `hover`/`active` washes",
    );
  });

  it("states how the theme groups merge", () => {
    expect(readme).toContain(
      "Typography merges field by field, density metrics size by size, elevation levels replace whole arrays, and the mode is not overridable.",
    );
  });

  it("states the skeleton floor the checker enforces", () => {
    expect(readme).toContain(
      `the soft status surfaces and the loading skeleton at ${contrastFloors.default.surface}:1 against \`background\`, \`card\` and \`popover\``,
    );
  });

  it("states that secondary text and the wash itself are checked through selection", () => {
    expect(readme).toContain(
      "Secondary text is measured through the same wash on all nine surfaces (`mutedForeground`)",
    );
    expect(readme).toContain(
      `\`selectionWashPairs\` also holds the wash itself to ${contrastFloors.default.surface}:1 against each surface`,
    );
  });

  it("states the fills a bordered control paints its edge on", () => {
    expect(readme).toContain(
      "the `secondary`, `hover`, `active` and `accent` fills a bordered control paints",
    );
  });

  it("lists every motion level, including the zero one", () => {
    const levelNames = Object.entries(motion)
      .filter(([, value]) => typeof value === "number")
      .map(([level]) => `\`${level}\``);
    expect(readme).toContain(`${sentenceList(levelNames)} are the levels`);
    expect(levelNames).toContain("`none`");
  });

  it("lists every status family in documentation order", () => {
    expect(statusTones.length).toBe(4);
    const toneNames = statusTones.map((tone) => `\`${tone}\``);
    expect(readme).toContain(
      `The four status families — ${sentenceList(toneNames)} —`,
    );
  });
});

const platformRow = (platform: PlatformName): string => {
  const style = platformStyles[platform];
  const variantRadius = style.structure.radius ?? radius;
  const density = style.structure.density ?? defaultDensity.name;
  const light = style.colors.light.primary ?? themes.light.colors.primary;
  const dark = style.colors.dark.primary ?? themes.dark.colors.primary;
  return `| ${platformTypes[platform].label} (\`${platform}\`) | \`${style.types.mono}\` | ${variantRadius.sm} / ${variantRadius.md} / ${variantRadius.lg} / ${variantRadius.xl} | \`${density}\` | \`${light}\` | \`${dark}\` |`;
};

describe("packages/tokens/README.md platform table", () => {
  it("states every variant's real family, shape, density and accent", () => {
    platformNames.forEach((platform) => {
      expect(readme, platform).toContain(platformRow(platform));
    });
  });

  it("lists the variants in toggle order", () => {
    const positions = platformNames.map((platform) =>
      readme.indexOf(platformRow(platform)),
    );
    expect(positions).not.toContain(-1);
    expect(positions).toEqual(positions.toSorted((a, b) => a - b));
  });
});
