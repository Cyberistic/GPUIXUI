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
import { contrastFloors, stateFillSurfaces } from "./contrast.js";
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
      "The focus ring is checked on the canvas, card, popover and the `hover`, `active` and `selected` washes, so a ring that vanishes on a selected row is caught, and on the four soft status fills, because a toast's action button is focused while it sits on its own tint",
    );
  });

  it("states the interactive fills and the surfaces they are checked on", () => {
    const surfaces = sentenceList(
      stateFillSurfaces.map((surface) => `\`${surface}\``),
    );
    expect(readme).toContain(
      "`stateFillSurfacePairs` holds every interactive fill — the two washes, the `accent` family at rest, hover and press, `selected` and the `primary`/`secondary`/`destructive` families — to " +
        `${contrastFloors.default.surface}:1 on ${surfaces}`,
    );
  });

  it("states where default body text is checked", () => {
    expect(readme).toContain(
      "Default body text is checked on the canvas, card, the `muted` panel, `popover`, the `hover`/`active`/`accent`/`selected` washes and the four soft status fills an Alert's description and ghost dismiss control paint",
    );
  });

  it("states how the theme groups merge", () => {
    expect(readme).toContain(
      "Typography merges field by field, density metrics size by size, elevation levels replace whole arrays, and the mode is not overridable.",
    );
  });

  it("states the skeleton floor the checker enforces", () => {
    expect(readme).toContain(
      `the loading skeleton on those three, the \`muted\` panel and the \`hover\`/\`active\`/\`accent\`/\`selected\` washes a loading row paints`,
    );
    expect(readme).toContain(
      "the identity and high-contrast skeletons *were* the pressed fill (1.000:1) until plan 094 moved them one ramp step",
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
      "the `secondary`, `secondaryHover`, `secondaryActive`, `hover`, `active`, `accent`, `accentHover` and `accentActive` fills a bordered control paints and on the four soft status fills a status panel divides",
    );
    expect(readme).toContain(
      "macOS light and Windows light measured 1.000:1 and Linux light 1.009:1 on the pressed fill, and both AAA sets sat under their 3:1 floor",
    );
    expect(readme).toContain(
      "The inherited dark `successSoft` measured 1.015:1 on Windows, 1.023:1 on the identity and 1.047:1 on Linux until plan 095 darkened it and the soft `destructive` fill one step while keeping the surface floor.",
    );
  });

  it("states that a control inside a soft status fill keeps its edge", () => {
    expect(readme).toContain(
      "the `muted` panel, the same four washes and the four soft status fills, so a checkbox or field inside a row, or an action inside an Alert or Toast, keeps its `borderStrong` edge",
    );
    expect(readme).toContain(
      "identity dark's edge measured 2.77:1 on `successSoft`, 2.94:1 on `destructiveSoft` and 2.97:1 on `infoSoft` until plan 092 moved it to `#868FA0`",
    );
  });

  it("states that a soft status fill is a selection surface", () => {
    expect(readme).toContain(
      "is measured the same way: the tone's `xSoftForeground` is held to the body floor",
    );
    expect(readme).toContain(
      "Windows dark's wash over `destructiveSoft` at 1.005:1 — an invisible highlight",
    );
  });

  it("states the soft status edge is a measured role", () => {
    expect(readme).toContain(
      "Each soft status surface has a designed edge (`xSoftBorder`) held to the divider floor on that surface",
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
