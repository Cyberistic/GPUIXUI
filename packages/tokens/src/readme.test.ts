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
import {
  contrastFloors,
  elevationContentSurfaces,
  elevationSurfaces,
  skeletonPulsePairs,
  stateFillSurfaces,
  statusFillPairs,
} from "./contrast.js";
import { stateLadderNames } from "./direction.js";
import {
  deriveFigure,
  documentedFigures,
  quotesFigure,
} from "./figures.js";
import { motionLevels, motionPhases } from "./motion.js";
import {
  platformNames,
  platformStyles,
  platformTypes,
  type PlatformName,
} from "./platforms.js";
import { shippedThemes } from "./shipped-themes.js";
import { platformMonoCell, platformTableCells } from "./platform-table.js";
import { filledControlFamilies, statusTones } from "./styles.js";
import { themeChecks, type ThemeFailureKind } from "./theme-check.js";
import { contosoDensityPlatformStyle } from "./platform-extension.example.js";
import { typefaceRules } from "./typeface.js";
import { textRoles } from "./typography.js";

const readme = readFileSync(
  new URL("../README.md", import.meta.url),
  "utf8",
).replace(/\s+/g, " ");

const sentenceList = (values: ReadonlyArray<string>): string =>
  values.length < 2
    ? values.join("")
    : `${values.slice(0, -1).join(", ")} and ${values.slice(-1).join("")}`;

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
  "twenty-one",
  "twenty-two",
  "twenty-three",
  "twenty-four",
  "twenty-five",
] as const;

const countWord = (count: number): string => countWords[count] ?? String(count);

/** Every count spelling the front door may use: words up to ten, then digits. */
const numbers = "zero|one|two|three|four|five|six|seven|eight|nine|ten|\\d+";

/** The failure type each check returns, keyed by the kind that tags it. */
const failureTypes = {
  color: "ColorFailure",
  opacity: "OpacityFailure",
  typeface: "TypefaceFailure",
  contrast: "ContrastFailure",
  ring: "RingFailure",
  highlight: "HighlightFailure",
  nativeText: "NativeTextFailure",
  hierarchy: "TextTierFailure",
  direction: "DirectionFailure",
  metric: "MetricFailure",
} as const satisfies Record<ThemeFailureKind, string>;

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

const ordinals = [
  "first",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
  "seventh",
  "eighth",
  "ninth",
  "tenth",
] as const;

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

  it("states the number of checks from the index", () => {
    expect(readme).toContain(`That is one of ${countWord(themeChecks.length)} checks`);
    expect(readme).toContain(`composes all ${countWord(themeChecks.length)}`);
  });

  it("states the diagnostic order from the index", () => {
    expect(readme).toContain(
      `The order is diagnostic — ${sentenceList(
        themeChecks.map((kind) => `\`${kind}\``),
      )} — and \`themeChecks\` is that order as a list`,
    );
  });

  it("states the payload type of every check", () => {
    const types = themeChecks.map((kind) => `\`${failureTypes[kind]}\``);
    expect(readme).toContain(
      `The payload is the same ${types.slice(0, -1).join(", ")} or ${types.at(-1)} the individual check returns`,
    );
  });

  it("names every interaction ladder from the index", () => {
    expect(readme).toContain("`stateLadderNames`");
    const fixed = stateLadderNames.filter(
      (name) => !filledControlFamilies.some((family) => family === name),
    );
    expect(fixed.length).toBeGreaterThan(0);
    fixed.forEach((name) => expect(readme, name).toContain(`\`${name}\``));
  });

  it("states each check's ordinal from the index", () => {
    const claims = [
      ...readme.matchAll(/`(theme[A-Za-z]+Failures)` is the ([a-z]+) check/g),
    ];
    expect(claims.length).toBeGreaterThan(0);
    claims.forEach(([, fn, word]) => {
      const kind = themeChecks.find(
        (candidate) => checkFunctions[candidate] === fn,
      );
      expect(kind, fn).toBeDefined();
      expect(word, fn).toBe(
        kind === undefined ? undefined : ordinals[themeChecks.indexOf(kind)],
      );
    });
  });

  it("names the one check the composition suites run", () => {
    expect(readme).toContain("holds each result to `themeFailures`");
    expect(readme).not.toContain(
      "`themeContrastFailures`, `themeMetricFailures` and `themeColorFailures`",
    );
  });

  it("does not describe a subset as the guarantee", () => {
    expect(readme).not.toMatch(/\ball (?:three|four) checks\b/);
  });

  it("states that a theme records the floor set it is designed against", () => {
    expect(readme).toContain(
      "The `Theme` records the floor set it is designed against",
    );
    expect(readme).toContain(
      "`themeContrastFailures(theme, contrast = theme.contrast)`",
    );
  });

  it("names the floor-class order beside the contract's data", () => {
    expect(readme).toContain(
      "`contrastRatio`, `contrastPairs`, `contrastFloors`, `contrastPairClasses` and `compositeOver` expose the parts",
    );
  });

  it("states the state washes and floating surface the ring is checked on", () => {
    expect(readme).toContain(
      "The focus ring is checked on the canvas, card, popover, the `muted` panel and the `accent` wash, the `hover`, `active` and `selected` washes, the four soft status fills — because an Alert's action button is focused while it sits on its own tint — and the `track` groove a focused slider's thumb is centred on (`ringTrackPairs`), so a ring that vanishes on a selected row or a value indicator is caught",
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
      "Default body text is checked on the canvas, card, the `muted` panel, `popover`, the `hover`/`active`/`accent`/`selected` washes and the four soft status fills an Alert's description paints",
    );
  });

  it("states how the theme groups merge", () => {
    expect(readme).toContain(
      "Typography merges field by field, density metrics merge size by size over the preset an override names or the base's, component dimensions field by field, elevation levels replace whole arrays, and the mode is not overridable.",
    );
  });

  it("states the preset a platform density override starts from", () => {
    const density = contosoDensityPlatformStyle.structure.density;

    if (typeof density !== "object") {
      expect.unreachable("the copied example must name a density preset");
    }

    expect(density.preset).toBe("compact");
    expect(readme).toContain(
      `density: { preset: "${density.preset}", rowHeight: ${density.rowHeight} }`,
    );
  });

  it("states the skeleton floor the checker enforces", () => {
    expect(readme).toContain(
      "the loading skeleton on those three, the `muted` panel and the",
    );
    expect(readme).toContain(
      "the identity and high-contrast skeletons *were* the pressed fill (1.000:1) until plan 094 moved them one ramp step",
    );
  });

  it("states the nine surfaces the skeleton pulse is measured on", () => {
    const surfaces = [
      ...new Set(skeletonPulsePairs.map(([, background]) => background)),
    ];
    expect(surfaces).toHaveLength(9);
    expect(readme).toContain(
      `on the same ${countWord(surfaces.length)} surfaces (\`skeletonPulsePairs\`)`,
    );
    expect(readme).toContain(
      "`hover`/`active`/`accent`/`selected`/`selectedActive` washes a loading row paints",
    );
  });

  it("states that secondary text and the wash itself are checked through selection", () => {
    expect(readme).toContain(
      "Secondary text is measured through the same wash on all nine surfaces (`mutedForeground`)",
    );
    expect(readme).toContain(
      "Status labels are measured through the same wash on the same nine surfaces (`selectionStatusPairs`)",
    );
    expect(readme).toContain(
      "XP light `successText` measured 3.671:1 on `active` until plan 366 moved the six light status roles one half-step",
    );
    expect(readme).toContain(
      `\`selectionWashPairs\` also holds the wash itself to ${contrastFloors.default.surface}:1 against each surface`,
    );
  });

  it("states the fills a bordered control paints its edge on", () => {
    expect(readme).toContain(
      "the `secondary`, `secondaryHover`, `secondaryActive`, `hover`, `active`, `accent`, `accentHover` and `accentActive` fills a bordered control paints, on the `selected` fill an outline action sits on in a selected row and on the four soft status fills a status panel divides",
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
      "the `muted` panel, the same four washes and the four soft status fills, so a checkbox or field inside a row, or an action inside a tone-tinted Alert, keeps its `borderStrong` edge",
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

  it("separates the mark floor from the interactive-fill floor", () => {
    expect(readme).toContain(
      "A solid role painted as a mark — a progress segment, slider fill, " +
        "thumb ring, rating star or timeline dot — is held to " +
        `${contrastFloors.default.mark}:1 ` +
        `(${contrastFloors.high.mark}:1 at AAA) by \`markPairs\`, not to the ` +
        `${contrastFloors.default.surface}:1 an interactive fill's wash needs`,
    );
  });

  it("states the soft status edge is a measured role", () => {
    expect(readme).toContain(
      "Each soft status surface has a designed edge (`xSoftBorder`) held to the divider floor on that surface",
    );
  });

  it("states the nine surfaces the solid status fills are measured on", () => {
    const surfaces = [
      ...new Set(statusFillPairs.map(([, background]) => background)),
    ];
    expect(surfaces).toHaveLength(9);
    expect(readme).toContain(
      `to the same ${contrastFloors.default.surface}:1 floor on those ${countWord(surfaces.length)} surfaces (the four \`destructive\` base surfaces are already the action fill's pairs)`,
    );
    expect(readme).not.toContain("on those eight surfaces");
  });

  it("states the typeface check and every rule", () => {
    expect(readme).toContain("`themeTypefaceFailures(theme)`");
    expect(readme).toContain(
      "GPUix 0.10.0's `StyleDesc.fontFamily` is one string",
    );
    expect(readme).toContain("`typefaceRoles`");
    expect(readme).toContain("`typefaceRules`");
    expect(readme).toContain("`cssGenericFamilies`");
    typefaceRules.forEach((rule) => {
      expect(readme, rule).toContain(`\`${rule}\``);
    });
  });

  it("holds the shipped-set count to the enumeration", () => {
    // The front door said "all 20 shipped sets" while the suites enumerated 4,
    // 20, 24 and 28 depending on the file (plan 387). `shippedThemes` is the
    // one list, so the sentence is derived from it.
    expect(readme).toContain(
      `and all ${shippedThemes.length} shipped sets pass`,
    );
  });

  it("lists every motion level, including the zero one", () => {
    const levelNames = motionLevels.map((level) => `\`${level}\``);
    expect(readme).toContain(`${sentenceList(levelNames)} are the levels`);
    expect(levelNames).toContain("`none`");
  });

  it("lists every status family in documentation order", () => {
    const toneNames = statusTones.map((tone) => `\`${tone}\``);
    expect(readme).toContain(
      `The ${countWord(statusTones.length)} status families — ${sentenceList(toneNames)} —`,
    );
  });

  it("states the index catalogues' sizes from the indexes", () => {
    // The index paragraph says how big four catalogues are, and all four were
    // hand-typed: replacing them with five/five/seven/five left the whole suite
    // green at 7030 tests (plan 775). Every occurrence is captured, not the
    // first, so a stale second copy elsewhere in the README fails too.
    const catalogues: ReadonlyArray<readonly [string, number]> = [
      ["status families", statusTones.length],
      ["platform variants", platformNames.length],
      ["timings", motionLevels.length],
      ["easing phases", motionPhases.length],
    ];

    catalogues.forEach(([phrase, size]) => {
      const stated = [
        ...readme.matchAll(new RegExp(`\\b(${numbers})\\s+${phrase}\\b`, "g")),
      ].map(([, count]) => count);

      expect(stated.length, phrase).toBeGreaterThan(0);
      stated.forEach((count) => expect(count, phrase).toBe(countWord(size)));
    });
  });

  it("states the elevation walk's surface and group counts from their lists", () => {
    // §Shadows enumerates the `md` content fills by group rather than by name,
    // and every count there was hand-typed: mutating the page-surface count and
    // the three group counts left the whole suite green (plan 777). The words
    // join the indexes that own them, and the groups must reconstruct
    // `elevationContentSurfaces` — a fill that joins the walk without joining a
    // group leaves the prose short.
    const solidChips = statusTones.filter(
      (tone) => !filledControlFamilies.some((family) => family === tone),
    );
    const softPanels = statusTones.map((tone) => `${tone}Soft`);
    const grouped: ReadonlyArray<string> = [
      ...filledControlFamilies,
      ...solidChips,
      "softAction",
      ...softPanels,
    ];
    const rest = elevationContentSurfaces
      .filter((surface) => !grouped.some((name) => name === surface))
      .toSorted();

    expect(readme).toContain(
      `\`elevationSurfaces\` the ${countWord(elevationSurfaces.length)} persistent page surfaces`,
    );
    expect(readme).toContain(
      `the ${countWord(elevationContentSurfaces.length)} resting content fills`,
    );
    expect(readme).toContain(
      `the ${countWord(filledControlFamilies.length)} filled actions, the ${countWord(solidChips.length)} solid status chips, the raised panel action, the ${countWord(softPanels.length)} soft status panels`,
    );
    expect(rest).toEqual(["disabled", "skeleton", "track"]);
    expect(readme).toContain(
      "a disabled control, a loading row and a value indicator's groove",
    );
  });

  it("quotes the elevation figures from the figure table", () => {
    // The two ratios in §Shadows were the last hand-typed figures on the page:
    // a palette or alpha move left them behind while `readme.test.ts` stayed
    // green at 36/36 (plan 777). `figures.ts` composes each level the way the
    // contrast checker does and derives both the ratio and the shipped set.
    const names = [
      "the md shadow across the page and content fills",
      "the page shadow across the persistent surfaces",
    ];

    names.forEach((name) => {
      const entry = documentedFigures.find(
        (candidate) => candidate.name === name,
      );
      if (entry === undefined) {
        expect.unreachable(`${name} is in the figure table`);
      }
      const derived = deriveFigure(entry);
      if (derived.kind === "missing") {
        expect.unreachable(`${name} names a shipped set`);
      }
      expect(quotesFigure(readme, entry, derived.figure), name).toBe(true);
    });
  });
});

const platformRow = (platform: PlatformName): string => {
  const style = platformStyles[platform];
  const cells = platformTableCells(style);
  return `| ${platformTypes[platform].label} (\`${platform}\`) | ${platformMonoCell(platform)} | ${cells.radius.sm} / ${cells.radius.md} / ${cells.radius.lg} / ${cells.radius.xl} | \`${cells.density}\` | \`${cells.light}\` | \`${cells.dark}\` |`;
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

  it("states that a row prints the resolved theme", () => {
    expect(readme).toContain(
      "A row states the **resolved** theme: a style that names one radius inherits the rest, and a density override prints the preset it starts from.",
    );
  });

  it("explains the Default row's platform-dependent family", () => {
    expect(platformMonoCell("default")).toBe(
      platformNames
        .filter((platform) => platform !== "default")
        .map((platform) => `\`${platformTypes[platform].mono}\``)
        .join(" / "),
    );
    expect(readme).toContain("The Default row");
    expect(readme).toContain(
      "names the identity's mono on each shipped platform",
    );
    expect(readme).toContain("`systemMonoFamily`");
  });

  it("states that a style names the dark tint it owns", () => {
    platformNames
      .filter((platform) => platform !== "default")
      .forEach((platform) => {
        // Also holds the sentence's claim: every real dark style names it.
        expect(
          platformStyles[platform].colors.dark.destructiveSoft,
          platform,
        ).toBeDefined();
      });
    expect(readme).toContain("platform-composition.test.ts");
    expect(readme).toContain("`destructiveSoft`");
    expect(readme).toContain("(plan 374)");
  });
});
