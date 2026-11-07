import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fadedPair } from "./fade.js";
import * as Tokens from "./index.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const catalogue = read("../../../docs/tokens.md");
const readme = read("../README.md");
const designSystem = read("../../../docs/design-system.md");
const inventory = read("../../../.agents/slop/COMPONENTS.md");

const inventoryRow = (name: string): string => {
  const start = inventory.indexOf(`| ${name} |`);
  const end = inventory.indexOf("\n", start);
  return start === -1
    ? ""
    : inventory.slice(start, end === -1 ? undefined : end);
};

const sourceFiles: ReadonlyArray<string> = readdirSync(
  new URL("./", import.meta.url),
).filter(
  (name) =>
    (name.endsWith(".ts") || name.endsWith(".tsx")) &&
    !name.includes(".test.") &&
    !name.includes(".example."),
);

const declared: ReadonlySet<string> = new Set(
  sourceFiles.flatMap((file) =>
    [
      ...read(`./${file}`).matchAll(
        /export\s+(?:declare\s+)?(?:type|interface|class|function|const|enum)\s+([A-Za-z_$][\w$]*)/g,
      ),
    ].map((match) => match[1] ?? ""),
  ),
);

const importedNames = (document: string): ReadonlyArray<string> =>
  [
    ...document.matchAll(
      /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+"@gpuixui\/tokens(?:\/react)?"/g,
    ),
  ]
    .flatMap((match) => (match[1] ?? "").split(","))
    .map(
      (name) =>
        name
          .trim()
          .replace(/^type\s+/, "")
          .split(/\s+as\s+/)[0] ?? "",
    )
    .filter((name) => name.length > 0);

const roleRow = (role: string): string => `| \`${role}\` |`;

const section = (heading: string): string => {
  const start = catalogue.indexOf(heading);
  const end = catalogue.indexOf("\n## ", start + 1);
  return catalogue.slice(start, end).replace(/\s+/g, " ");
};

const exportedValues = Object.keys(Tokens);

const packageSources = (directory: string): ReadonlyArray<string> =>
  readdirSync(new URL(directory, import.meta.url), {
    withFileTypes: true,
  }).flatMap((entry) => {
    const path = `${directory}${entry.name}`;
    if (entry.isDirectory()) {
      return packageSources(`${path}/`);
    }
    const isSource =
      (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) &&
      !entry.name.includes(".test.");
    return isSource ? [read(path)] : [];
  });

const componentSources: ReadonlyArray<string> = [
  "../../../packages/primitives/src/",
  "../../../packages/components/src/",
].flatMap(packageSources);

describe("token catalogue", () => {
  it("documents every public export", () => {
    const missing = exportedValues.filter((name) => !catalogue.includes(name));

    expect(missing).toEqual([]);
  });

  it("gives every colour role a row in both colour tables", () => {
    const missing = Tokens.colorRoles.filter(
      (role) => catalogue.split(roleRow(role)).length - 1 < 2,
    );

    expect(missing).toEqual([]);
  });

  it("gives every type role a table row", () => {
    const roles = Object.keys(Tokens.typography).filter(
      (role) => role !== "sans" && role !== "mono",
    );
    const missing = roles.filter((role) => !catalogue.includes(roleRow(role)));

    expect(missing).toEqual([]);
  });

  it("counts the roles and the pairs it documents", () => {
    expect(catalogue).toContain(`There are ${Tokens.colorRoles.length} roles.`);
    expect(catalogue).toContain(
      `The ${Tokens.contrastPairs.length} pairs cover`,
    );
  });
});

describe("the styles a sweep walks", () => {
  const styles = [
    ...Object.values(Tokens.themes),
    ...Object.values(Tokens.highContrastThemes),
    ...Tokens.platformNames.flatMap((name) => [
      Tokens.platformTheme(Tokens.themes.light, name),
      Tokens.platformTheme(Tokens.themes.dark, name),
    ]),
    ...Tokens.retroNames.flatMap((look) => [
      Tokens.retroTheme(Tokens.themes.light, look),
      Tokens.retroTheme(Tokens.themes.dark, look),
    ]),
  ];
  const all = styles.length;
  const prose = (text: string): string => text.replace(/\s+/g, " ");

  it("counts the set its lists name, once per style", () => {
    expect(all).toBe(
      4 + Tokens.platformNames.length * 2 + Tokens.retroNames.length * 2,
    );
    expect(new Set(styles.map((style) => style.name)).size).toBe(all);
  });

  it("is the count each page prints where it claims the set is clean", () => {
    const page = prose(catalogue);
    const guide = prose(designSystem);
    const readmeProse = prose(readme);

    expect(page).toContain(
      `in all ${all} shipped, high-contrast, platform and authored styles`,
    );
    expect(page).toContain(
      `over all ${all} shipped, high-contrast, platform and authored styles`,
    );
    expect(page).toContain(
      `holds all ${all} shipped, high-contrast, platform and authored themes`,
    );
    expect(page).toContain(
      `holds all ${all} shipped, platform and authored themes`,
    );
    expect(page).toContain(`holds all ${all} styles to the body floor`);
    expect(page).toContain(`every ring placement in all ${all} styles`);
    expect(
      page.match(new RegExp(`sweeps all ${all} styles`, "g"))?.length,
    ).toBe(2);
    expect(page).toContain(`clears the floor in all ${all} styles`);
    expect(page).toContain(
      `${all} shipped, high-contrast, platform and authored styles, the press was invisible`,
    );

    expect(guide).toContain(`clears the floor in all ${all} shipped styles`);
    expect(guide).toContain(`holds all ${all} shipped styles to the floor`);

    expect(readmeProse).toContain(`in all ${all} shipped styles`);
    expect(readmeProse).toContain(
      `over the ${all} shipped, high-contrast, platform and authored styles`,
    );

    expect(prose(inventory)).toContain(`in all ${all} shipped styles`);
    expect(prose(inventory)).toContain(`across the ${all} styles`);
  });
});

describe("the audit's report list", () => {
  const reports = Object.keys(Tokens.auditTheme(Tokens.lightTheme)).filter(
    (key) => key !== "passed",
  );
  const words = [
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
  ] as const;
  const count = words[reports.length] ?? `${reports.length}`;

  const surfaces = [
    {
      name: "docs/tokens.md",
      text: catalogue,
      phrases: [`all ${count} reports`, `\`auditTheme\`'s ${count} reports`],
    },
    {
      name: "README.md",
      text: readme,
      phrases: [`all ${count} reports`, `the audit's ${count} reports`],
    },
    {
      name: "docs/design-system.md",
      text: designSystem,
      phrases: [`reports all ${count} in one call`, `runs all ${count} checks`],
    },
  ];
  const named = (text: string): ReadonlySet<string> =>
    new Set(
      [...text.matchAll(/\baudit\.([A-Za-z][A-Za-z0-9]*)\b(?!\.)/g)].map(
        (match) => match[1] ?? "",
      ),
    );

  it("names every report the gate returns", () => {
    const missing = surfaces.flatMap(({ name, text }) =>
      reports
        .filter(
          (report) =>
            !named(text).has(report) && !text.includes(`\`${report}\``),
        )
        .map((report) => `${name}: audit.${report}`),
    );

    expect(missing).toEqual([]);
  });

  it("names no property the gate does not return", () => {
    const known = new Set([...reports, "passed"]);
    const stale = surfaces.flatMap(({ name, text }) =>
      [...named(text)]
        .filter((property) => !known.has(property))
        .map((property) => `${name}: audit.${property}`),
    );

    expect(stale).toEqual([]);
  });

  it("prints the report count the gate has", () => {
    const silent = surfaces.flatMap(({ name, text, phrases }) => {
      const flat = text.replace(/\s+/g, " ");
      return phrases
        .filter((phrase) => !flat.includes(phrase))
        .map((phrase) => `${name}: ${phrase}`);
    });

    expect(silent).toEqual([]);
  });

  it("lists the reports the gate returns, in its order, in the inventory", () => {
    const row = inventoryRow("Contrast contract");
    const open = row.indexOf("returns all ");
    const start = row.indexOf("(", open);
    const end = row.indexOf(")", start);
    const listed = row.slice(start + 1, end).split(", ");

    expect(listed).toEqual(reports.map((report) => `\`${report}\``));
  });

  it("prints the pair count the contrast table holds", () => {
    const row = inventoryRow("Contrast contract");
    const printed = /the (\d+) role pairs/.exec(row)?.[1];

    expect(Number(printed)).toBe(Tokens.contrastPairs.length);
  });

  it("does not teach the secondary action's retired wash pair", () => {
    const row = inventoryRow("Contrast contract");

    expect(row).not.toContain("keeps on the `hover`/`active` wash");
    expect(row).toContain("`filledHover`/`filledPressed`");
    expect(row).toContain("actionFeedbackFailures");
  });
});

describe("focus adoption claim", () => {
  it("no longer says the packages paint the shadow ring on every focus path", () => {
    expect(catalogue).not.toContain(
      "still paint that shadow on every focus path",
    );
  });

  it("names both seams the adoption went through", () => {
    expect(catalogue).toContain("packages/primitives/src/core/focus.ts");
    expect(catalogue).toContain("packages/components/src/internal/theme.ts");
  });

  it("matches the sources: neither package paints the shadow ring itself", () => {
    const callers = componentSources.filter((source) =>
      source.includes("focusRing("),
    );

    expect(callers).toEqual([]);
  });
});

describe("the motion claim", () => {
  it("no longer says nothing consumes the motion package", () => {
    expect(catalogue).not.toContain("No component consumes it yet");
  });

  it("names the seam, the hook and the package that owns the timing", () => {
    expect(catalogue).toContain("`@gpuixui/motion`");
    expect(catalogue).toContain("`internal/presence.tsx`");
    expect(catalogue).toContain("`useSurfaceTiming`");
    expect(catalogue).toContain("`@gpuixui/motion/timing`");
    expect(catalogue).toContain("`@gpuixui/motion/presence`");
    expect(catalogue).toContain("`@gpuixui/motion/react`");
  });

  it("matches the sources: the seam composes the timing and components use it", () => {
    const seam = read("../../../packages/components/src/internal/presence.tsx");

    expect(seam).toContain('from "@gpuixui/motion/presence"');
    expect(seam).toContain("transitionWindowMs");

    expect(seam).toContain('from "@gpuixui/motion/react/presence"');
    expect(seam).toContain("useSurfaceTiming");
    expect(seam).toContain("useMotionPreference");

    const consumers = componentSources.filter((source) =>
      source.includes("internal/presence"),
    );
    expect(consumers.length).toBeGreaterThan(10);
    expect(
      componentSources.filter((source) => source.includes("@gpuixui/motion"))
        .length,
    ).toBeGreaterThan(1);
  });
});

describe("the control ring's claim", () => {
  const focus = section("## Focus");

  it("names the helper and both of its states", () => {
    expect(focus).toContain("controlFocusRing");
    expect(focus).toContain("destructive");
    expect(focus).toContain("disabled");
    expect(focus).toContain("no ring at all");
  });

  it("holds the page to the paint the helper resolves", () => {
    const source = read("../src/styles.ts");

    expect(source).toContain("themeColors(theme).destructive");
    expect(source).toContain("if (state.disabled === true)");
  });
});

describe("the ring seams delegate", () => {
  const seams = [
    "../../../packages/primitives/src/core/focus.ts",
    "../../../packages/components/src/internal/theme.ts",
  ];

  it("says both seams delegate, not that one is owed", () => {
    const focus = section("## Focus");

    expect(focus).toContain("delegate");
    expect(focus).not.toContain("has not delegated");
    expect(focus).not.toContain("tracked in `.agents/slop/TODO.md`");
  });

  it("holds that sentence to the sources", () => {
    const own = seams.filter(
      (path) => !read(path).includes("controlFocusRing("),
    );

    expect(own).toEqual([]);
  });
});

describe("filled action adoption claim", () => {
  const limitation = (() => {
    const start = catalogue.indexOf("- The derived fills");
    const end = catalogue.indexOf("\n- ", start + 1);
    return catalogue.slice(start, end).replace(/\s+/g, " ");
  })();

  it("names the components package as the adopter", () => {
    const source = read("../../../packages/components/src/internal/button.tsx");
    const variants = read("../../../packages/primitives/src/core/variants.ts");

    expect(source).toContain("@gpuixui/primitives/button");
    expect(variants).toContain("filledHover(theme, action)");
    expect(limitation).toContain("packages/components/src/internal/button.tsx");
    expect(limitation).toContain("packages/primitives/src/core/variants.ts");
    expect(limitation).toContain("filledHover");
  });

  it("names the primitive package as an adopter", () => {
    const source = read("../../../packages/primitives/src/recipe/index.ts");

    expect(source).toContain("hover:fill-primary");
    expect(limitation).toContain("packages/primitives/src/recipe/index.ts");
    expect(limitation).toContain("hover:fill-<action>");
  });

  it("names the tw recipe as the remaining deviation", () => {
    const source = read("../../../packages/tw/src/recipes.ts");

    expect(source).toContain("hover:bg-primary/90");
    expect(limitation).toContain("packages/tw/src/recipes.ts");
    expect(limitation).toContain("hover:bg-primary/90");
  });

  it("says the tw recipe is the copyable one, not the library's action", () => {
    expect(
      read("../../../packages/components/src/internal/button.tsx"),
    ).toContain("@gpuixui/primitives/button");
    expect(limitation).toContain("copyable");
    expect(limitation).not.toContain("compiles against");
  });

  it("names the toggle's accent as an adopter, not a deviation", () => {
    const source = read("../../../packages/primitives/src/core/variants.ts");

    expect(source).toContain('filledHover(theme, "accent")');
    expect(source).toContain('filledPressed(theme, "accent")');
    expect(source).not.toContain("alpha(theme.colors.accent, 0.9)");
    expect(catalogue).toContain("`fill-accent` / `fill-accent-pressed`");
    expect(limitation).toContain("packages/primitives/src/core/variants.ts");
    expect(limitation).not.toContain("0.9/0.8");
    expect(limitation).not.toContain("does not expose yet");
  });

  it("no longer calls every component package's hover translucent", () => {
    expect(limitation).not.toContain(
      "component packages still paint a translucent hover",
    );
  });
});

describe("the tonal action's edge", () => {
  const retracted = [
    "paints no border",
    "fill-only",
    "no brand colour and no border",
  ];
  const contentStrips = ["background", "card", "popover", "muted"] as const;
  const washes = ["hover", "active", "accent", "selected"] as const;

  it("says both packages' tonal action paints an edge", () => {
    const recipe = read("../../primitives/src/recipe/index.ts");
    const components = read("../../components/src/internal/button.tsx");

    expect(recipe).toContain(
      "bg-secondary text-secondary-foreground border border-strong",
    );

    expect(components).toMatch(
      /secondary:\s*(?:"[^"]*border border-strong[^"]*"|\{[^}]*border border-strong[^}]*\})/,
    );
    expect(catalogue).toContain(
      "`packages/primitives`' recipe and the components package's `Button` both add",
    );
    expect(designSystem).toContain(
      "`secondary` action paints an edge (`borderStrong`)",
    );
    expect(inventoryRow("Action fills")).toContain(
      "`secondary` paints `border border-strong` in both packages",
    );
    expect(
      retracted.filter((clause) =>
        [catalogue, designSystem, readme].some((page) => page.includes(clause)),
      ),
    ).toEqual([]);
  });

  it("keeps the fill claim on the content strips and leaves a row's wash to the edge", () => {
    const fills = Tokens.decorativeSurfaces
      .filter(({ surface }) => surface === "filledAction")
      .map(({ over }) => over);
    const edges = washes.filter((wash) =>
      Tokens.contrastPairs.some(
        ({ foreground, background }) =>
          foreground === "borderStrong" && background === wash,
      ),
    );

    expect(contentStrips.filter((strip) => fills.includes(strip))).toEqual(
      contentStrips,
    );
    expect(fills).toHaveLength(contentStrips.length);
    expect(edges).toEqual(washes);

    const styles = [
      ...Object.values(Tokens.themes),
      ...Object.values(Tokens.highContrastThemes),
      ...Tokens.platformNames.flatMap((platform) =>
        Object.values(Tokens.themes).map((theme) =>
          Tokens.platformTheme(theme, platform),
        ),
      ),
      ...Tokens.retroNames.flatMap((look) =>
        Object.values(Tokens.themes).map((theme) =>
          Tokens.retroTheme(theme, look),
        ),
      ),
    ];
    const fillsWashed = styles.flatMap((theme) =>
      washes.map((wash) =>
        Tokens.contrastRatio(theme.colors.secondary, theme.colors[wash]),
      ),
    );
    const missed = fillsWashed.filter(
      (ratio) => (ratio ?? 0) < Tokens.decorativeFloor,
    );
    const tightestFill = Math.min(...fillsWashed.map((ratio) => ratio ?? 0));
    const tightestEdge = Math.min(
      ...styles.flatMap((theme) =>
        washes.map(
          (wash) =>
            Tokens.contrastRatio(
              theme.colors.borderStrong,
              theme.colors[wash],
            ) ?? 0,
        ),
      ),
    );

    const printed = [catalogue, designSystem].map((page) => [
      page.includes(`${missed.length} of the ${fillsWashed.length}`),
      page.includes(`${tightestFill.toFixed(4)}:1`),
      page.includes(`${tightestEdge.toFixed(2)}:1`),
    ]);

    expect(printed).toEqual([
      [true, true, true],
      [true, true, true],
    ]);
  });
});

describe("the fade's page scope", () => {
  const pages: Readonly<Record<string, string>> = {
    "docs/tokens.md": catalogue,
    "docs/design-system.md": designSystem,
  };

  it("prints the range the fade misses on a card", () => {
    const measured = (
      [
        ["macOS", Tokens.platformTheme(Tokens.themes.light, "darwin")],
        ["Linux", Tokens.platformTheme(Tokens.themes.light, "linux")],
        ["Windows XP", Tokens.retroTheme(Tokens.lightTheme, "luna")],
        ["Windows 7", Tokens.retroTheme(Tokens.lightTheme, "aero")],
      ] as const
    ).map(([name, theme]) => {
      const faded = fadedPair(
        theme.colors,
        { fill: "primary", label: "primaryForeground", over: "card" },
        Tokens.disabledOpacity,
      );
      return { name, ratio: Tokens.contrastRatio(faded.label, faded.fill) };
    });

    const ratios = measured
      .map(({ ratio }) => ratio)
      .filter((ratio): ratio is number => ratio !== undefined);

    expect(ratios.length).toBe(measured.length);
    ratios.forEach((ratio) => {
      expect(ratio).toBeLessThan(Tokens.contrastFloors.disabled);
    });

    const range = `${Math.min(...ratios).toFixed(2)}:1–${Math.max(...ratios).toFixed(2)}:1`;

    Object.entries(pages).forEach(([page, text]) => {
      expect(text, page).toContain(range);
      measured.forEach(({ name }) => {
        expect(text, `${page}: ${name}`).toContain(name);
      });
    });
  });

  it("names the paint that replaces it off the page", () => {
    Object.entries(pages).forEach(([page, text]) => {
      expect(text, page).toContain("disabledAction(theme)");
    });
  });
});

describe("documents import what the package exports", () => {
  const documents: Readonly<Record<string, string>> = {
    "docs/tokens.md": catalogue,
    "README.md": readme,
  };

  it("names only real exports in every package import", () => {
    const broken = Object.entries(documents).flatMap(([name, text]) =>
      importedNames(text)
        .filter((imported) => !declared.has(imported))
        .map((imported) => `${name}: ${imported}`),
    );

    expect(broken).toEqual([]);
  });

  it("finds an import to check in both documents", () => {
    Object.entries(documents).forEach(([name, text]) => {
      expect(importedNames(text).length, name).toBeGreaterThan(5);
    });
  });
});

describe("the variant default the reports share", () => {
  const catalogueFlat = catalogue.replace(/\s+/g, " ");
  const designFlat = designSystem.replace(/\s+/g, " ");
  const readmeFlat = readme.replace(/\s+/g, " ");

  it("states the rule in the catalogue, with the reports it applies to", () => {
    expect(catalogueFlat).toContain(
      "every report that takes floors — `contrastFailures`, `selectionFailures`, `indicatorFailures`, `seriesFailures` and the gate itself — starts from it",
    );
  });

  it("states it where each report is documented", () => {
    expect(catalogueFlat).toContain(
      "The floors are the theme's own variant's unless one is passed",
    );
    expect(catalogueFlat).toContain(
      "The floor is the theme's own variant's — `contrastFloorsFor(theme).boundary`",
    );
  });

  it("states it in the design system and the README", () => {
    expect(designFlat).toContain(
      "Every report that takes floors reads them that way",
    );
    expect(readmeFlat).toContain(
      "every report that takes floors starts from it",
    );
  });
});

describe("the density override the pages teach", () => {
  const themeSource = read("./theme.ts");
  const pages = [
    { name: "docs/tokens.md", body: catalogue },
    { name: "docs/design-system.md", body: designSystem },
    { name: "README.md", body: readme },
  ] as const;

  it("merges each control size instead of replacing the record", () => {
    expect(themeSource).toContain(
      "controlHeight: overlay(base.controlHeight, override.controlHeight)",
    );
    expect(themeSource).toContain(
      "controlPaddingX: overlay(base.controlPaddingX, override.controlPaddingX)",
    );
  });

  it("says a size merges on every page that documents the override", () => {
    const silent = pages.flatMap(({ name, body }) => {
      const flat = body.replace(/\s+/g, " ");
      return flat.includes("size by size") ||
        flat.includes("merges each control size")
        ? []
        : [name];
    });
    expect(silent).toEqual([]);
  });

  it("names the override type the catalogue points a brand at", () => {
    expect(catalogue).toContain("`DensityOverrides`");
  });

  it("says a preset name this release does not ship is refused", () => {
    const flat = catalogue.replace(/\s+/g, " ");

    expect(themeSource).toContain("if (!isDensityName(override)) {");
    expect(flat).toContain("is not a density preset");
    expect(flat).toContain("Narrow a restored name with `isDensityName`");
  });
});

describe("the resolvers refuse an axis they do not ship", () => {
  const themeSource = read("./theme.ts");
  const retroSource = read("./retro.ts");
  const stylesSource = read("./styles.ts");

  it("asks each axis's own guard before it resolves", () => {
    expect(themeSource).toContain("if (!isThemeMode(mode)) {");
    expect(themeSource).toContain("if (!isThemeContrast(contrast)) {");
    expect(themeSource).toContain("if (!isPlatformName(platform)) {");
    expect(retroSource).toContain("if (!isRetroName(name)) {");
  });

  it("prints the rule and every guard on the pages that teach the axes", () => {
    const flat = catalogue.replace(/\s+/g, " ");

    expect(flat).toContain(
      "The **theme resolvers refuse** a value outside these indexes",
    );
    [
      "isThemeMode",
      "isThemeContrast",
      "isPlatformName",
      "isRetroName",
      "isDensityName",
    ].forEach((guard) => {
      expect(flat, guard).toContain(guard);
    });
    expect(readme.replace(/\s+/g, " ")).toContain(
      "The theme resolvers refuse a value outside an index",
    );
  });

  it("reads a stored role as the body role, and says so on every page", () => {
    expect(stylesSource).toContain(
      'const name = isTextRole(role) ? role : "body";',
    );

    const pages = [catalogue, readme, designSystem].map((page) =>
      page.replace(/\s+/g, " "),
    );

    pages.forEach((page, index) => {
      expect(page, `page ${index}`).toContain("`isTextRole`");
      expect(page, `page ${index}`).toContain("`textRoles`");
    });
    expect(pages[0]).toContain(
      "reads a name the index does not carry as **`body`**",
    );
    expect(pages[0]).toContain(
      "Cannot read properties of undefined (reading 'fontSize')",
    );
    expect(pages[1]).toContain("is total on the name");
    expect(pages[2]).toContain(
      "reads a name the index does not carry as `body`",
    );
  });

  it("reads a stored control size as the default step, and says so", () => {
    expect(stylesSource).toContain('isControlSize(size) ? size : "md"');
    expect(stylesSource).toContain(
      'densityMetric(theme, "controlHeight", size)',
    );
    expect(stylesSource).toContain(
      'densityMetric(theme, "controlPaddingX", size)',
    );
    expect(stylesSource).toContain("theme.density?.[metric]");
    expect(read("./switch.ts")).toContain(
      'switchScale[isControlSize(size) ? size : "md"]',
    );

    const pages = [catalogue, readme, designSystem].map((page) =>
      page.replace(/\s+/g, " "),
    );

    pages.forEach((page, index) => {
      expect(page, `page ${index}`).toContain("`isControlSize`");
      expect(page, `page ${index}`).toContain("`switchMetricsAt`");
    });
    expect(pages[0]).toContain(
      "read a name this release does not ship as **`md`**",
    );
    expect(pages[0]).toContain("`controlPaddingX`");
    [pages[1], pages[2]].forEach((page) =>
      expect(page).toContain("read a size this release does not ship as `md`"),
    );
  });

  it("answers a density the theme lost as no box, and says so", () => {
    expect(stylesSource).toContain("export interface DensitySource");
    expect(stylesSource).toContain("theme.density?.[metric]");
    expect(stylesSource).toContain("Number.isFinite(value)");

    const pages = [catalogue, readme, designSystem].map((page) =>
      page.replace(/\s+/g, " "),
    );
    pages.forEach((page, index) => {
      expect(page, `page ${index}`).toContain("`DensitySource`");
      expect(page, `page ${index}`).toContain("`controlHeight`");
    });
    expect(pages[0]).toContain(
      "density group the theme lost answers `undefined`",
    );
    expect(pages[1]).toContain("density group a store truncated past answers");
    expect(pages[2]).toContain("a density group the theme lost is no box");

    const inventory = readFileSync(
      new URL("../../../.agents/slop/COMPONENTS.md", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");
    expect(inventory).toContain("**The pair is total on the group as well**");
  });

  it("reads a stored elevation level as the default lift, and says so", () => {
    expect(read("./elevation.ts")).toContain(
      'isElevationLevel(level) ? level : "md"',
    );

    const pages = [catalogue, readme, designSystem].map((page) =>
      page.replace(/\s+/g, " "),
    );

    pages.forEach((page, index) => {
      expect(page, `page ${index}`).toContain("`isElevationLevel`");
      expect(page, `page ${index}`).toContain("`elevationShadow`");
      expect(page, `page ${index}`).toMatch(
        /level this release does not ship as \*?`md`/,
      );
    });
  });

  it("reads a stored tone as the default tone, and says so", () => {
    expect(stylesSource).toContain(
      "const name = isStatusTone(tone) ? tone : defaultStatusTone;",
    );
    expect(stylesSource).toContain(
      'const defaultStatusTone: StatusTone = "info";',
    );

    const pages = [catalogue, readme, designSystem].map((page) =>
      page.replace(/\s+/g, " "),
    );

    pages.forEach((page, index) => {
      expect(page, `page ${index}`).toContain("`isStatusTone`");
      expect(page, `page ${index}`).toContain("`statusTone`");
      expect(page, `page ${index}`).toContain(
        "tone this release does not ship as `info`",
      );
    });
    expect(pages[0]).toContain(
      "Cannot read properties of undefined (reading 'background')",
    );
  });
});

describe("the avatar step", () => {
  const scaleSource = read("./scale.ts");

  it("reads a stored step as the default diameter, and says so", () => {
    expect(scaleSource).toContain(
      "isAvatarSize(size) ? avatarSize[size] : avatarSize.md",
    );

    expect(scaleSource).toContain("avatarSizes.some((step) => step === value)");

    const pages = [catalogue, readme, designSystem].map((page) =>
      page.replace(/\s+/g, " "),
    );

    pages.forEach((page, index) => {
      expect(page, `page ${index}`).toContain("`avatarSizes`");
      expect(page, `page ${index}`).toContain("`isAvatarSize`");
      expect(page, `page ${index}`).toContain("`avatarPixels`");
    });
    expect(pages[0]).toContain(
      "reads a name this release does not ship as `md`",
    );
    expect(pages[1]).toContain(
      "reads a diameter step this release does not ship as `md`",
    );
    expect(pages[2]).toContain(
      "reads a step this release dropped as the default `md`",
    );
  });
});

describe("the persisted-choice axes", () => {
  const section = (page: string, heading: string): string => {
    const start = page.indexOf(heading);
    const end = page.indexOf("\n## ", start + heading.length);
    return start === -1 ? "" : page.slice(start, end === -1 ? undefined : end);
  };

  const table = section(catalogue, "### Persisted choices");
  const rows = table
    .split("\n")
    .filter(
      (line) =>
        line.startsWith("| ") &&
        !line.startsWith("| Axis") &&
        !line.startsWith("| ---"),
    )
    .map((line) => line.split("|").map((cell) => cell.trim()))

    .filter((cells) => (cells[3] ?? "").startsWith("`is"))
    .map((cells) => ({
      axis: cells[1] ?? "",
      index: (cells[2] ?? "").replaceAll("`", ""),
      guard: (cells[3] ?? "").replaceAll("`", ""),
    }));
  const guardsSuite = read("./guards.test.ts");

  it("prints one row per axis, exported and swept", () => {
    expect(rows).toHaveLength(13);
    rows.forEach(({ axis, index, guard }) => {
      expect(declared, axis).toContain(index);
      expect(declared, axis).toContain(guard);

      expect(guardsSuite, axis).toContain(guard);
    });
  });

  it("names every axis's index on the README and the design system", () => {
    rows.forEach(({ index }) => {
      expect(readme, `README ${index}`).toContain(`\`${index}\``);
      expect(designSystem, `design system ${index}`).toContain(`\`${index}\``);
    });
    expect(section(catalogue, "### Persisted choices")).toContain(
      "Thirteen unions",
    );
    expect(section(readme, "## Persisted choices")).toContain("Thirteen axes");
  });

  it("teaches the two layout axes as absence, and their indexes", () => {
    expect(section(catalogue, "## Spacing")).toContain(
      "`spacingSteps` is the scale as an ordered index",
    );
    expect(section(catalogue, "## Radius")).toContain(
      "`radiusSteps` is that scale as an ordered index",
    );
    expect(section(catalogue, "### Persisted choices")).toContain(
      "spacingStepFromStoredChoice",
    );

    const flatten = (page: string): string => page.replace(/\s+/g, " ");

    [catalogue, readme, designSystem].forEach((page, index) => {
      expect(flatten(page), `page ${index}`).toContain("`spacingSteps`");
      expect(flatten(page), `page ${index}`).toContain("`radiusSteps`");
    });
    [catalogue, readme].forEach((page, index) => {
      const flattened = flatten(page);
      expect(flattened, `page ${index}`).toContain("`isSpacingStep`");
      expect(flattened, `page ${index}`).toContain("`isRadiusStep`");
    });
    const system = flatten(designSystem);
    expect(system).toContain("`spacingSteps`/`isSpacingStep`");
    expect(system).toContain("`radiusSteps`/`isRadiusStep`");
    expect(flatten(catalogue)).toContain(
      "a name this release does not ship is **absence**",
    );
  });

  it("teaches the icon scale's index and guard where it prints the scale", () => {
    const icons = section(
      catalogue,
      "## Borders, icons and identity marks",
    ).replace(/\s+/g, " ");

    expect(icons).toContain("`iconSizes` is the five steps");
    expect(icons).toContain("`isIconSize` narrows a restored value");
    expect(icons).toContain("`iconSizeFromStoredChoice`");
  });
});

describe("the emphasis pair the extension example raises", () => {
  it("moves bodyStrong with the body size", () => {
    expect(catalogue.replace(/\s+/g, " ")).toContain(
      "typography: { body: { fontSize: 15 }, bodyStrong: { fontSize: 15 } }",
    );
  });

  it("names the pair rule beside the merge rules, with the report behind it", () => {
    expect(catalogue.replace(/\s+/g, " ")).toContain(
      "`bodyStrong` is its own role, so a brand that changes the body size names it too — the pair is one emphasis at one size, and `invalidNumbers` reports a strong role that does not follow as `emphasis`;",
    );

    expect(catalogue.replace(/\s+/g, " ")).not.toContain(
      "no report holds the two together yet",
    );
  });
});

interface VerifiedPlacement {
  readonly pair: string;
  readonly ratio: number;
}

const tightest = <Placement extends VerifiedPlacement>(
  placements: ReadonlyArray<Placement>,
): Placement => {
  expect(placements.length).toBeGreaterThan(0);
  return placements.reduce((a, b) => (b.ratio < a.ratio ? b : a));
};

const printedRatio = (text: string, needle: string): number | undefined => {
  const at = text.indexOf(needle);
  if (at < 0) {
    return undefined;
  }
  const match = /(\d+\.\d+):1/.exec(text.slice(at + needle.length));
  return match?.[1] === undefined ? undefined : Number(match[1]);
};

const words = [
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
] as const;

const word = (count: number): string => words[count] ?? String(count);

describe("the verification section's contracts", () => {
  const verification = section("## Verification");

  const styles = [
    Tokens.lightTheme,
    Tokens.darkTheme,
    Tokens.highContrastLightTheme,
    Tokens.highContrastDarkTheme,
    ...Tokens.platformNames.flatMap((name) => [
      Tokens.platformTheme(Tokens.themes.light, name),
      Tokens.platformTheme(Tokens.themes.dark, name),
    ]),
    ...Tokens.retroNames.flatMap((look) => [
      Tokens.retroTheme(Tokens.themes.light, look),
      Tokens.retroTheme(Tokens.themes.dark, look),
    ]),
  ];

  const decorativePlacements = styles.flatMap((theme) =>
    Tokens.decorativeSurfaces.flatMap(
      ({ surface, role, over, alpha, level }) => {
        const paintedOver = theme.colors[over];
        const paintedRole =
          level === undefined
            ? theme.colors[role]
            : theme.elevation[level][0]?.color;
        const ratio =
          paintedOver === undefined || paintedRole === undefined
            ? undefined
            : Tokens.contrastRatio(
                Tokens.blend(
                  paintedOver,
                  paintedRole,
                  alpha ?? Tokens.alphaOf(paintedRole),
                ),
                paintedOver,
              );
        return ratio === undefined
          ? []
          : [{ surface, pair: `\`${role}\` on \`${over}\``, ratio }];
      },
    ),
  );

  const markPlacements = styles.flatMap((theme) =>
    Tokens.indicatorRoles.flatMap((role) =>
      Tokens.indicatorSurfaces.flatMap((over) => {
        const ratio = Tokens.contrastRatio(
          theme.colors[role],
          theme.colors[over],
        );
        return ratio === undefined
          ? []
          : [{ pair: `\`${role}\` on \`${over}\``, ratio }];
      }),
    ),
  );

  const seriesPlacements = styles.flatMap((theme) =>
    Tokens.seriesColors(theme).flatMap((swatch, index) =>
      Tokens.seriesSurfaces.flatMap((over) => {
        const ratio = Tokens.contrastRatio(swatch, theme.colors[over]);
        return ratio === undefined
          ? []
          : [
              {
                index,
                over,
                pair: `series ${index + 1} on \`${over}\``,
                ratio,
              },
            ];
      }),
    ),
  );

  const decorativeKinds = [
    ...new Set(Tokens.decorativeSurfaces.map(({ surface }) => surface)),
  ];

  it("lists every kind of decorative surface the table measures", () => {
    const phrases: Readonly<Record<string, string>> = {
      divider: "divider",
      softDivider: "soft rule",
      skeleton: "skeleton",
      scrim: "veil",
      statusTint: "status tint",
      statusEdge: "status edge",
      scrollbar: "scrollbar thumb",
      stateWash: "state wash",
      filledAction: "filled action",
      track: "bar rail",
      disabledFace: "disabled face",
      elevation: "elevation placement",
    };
    const kinds = [
      ...new Set(Tokens.decorativeSurfaces.map(({ surface }) => surface)),
    ];
    const missing = kinds.filter(
      (kind) => !verification.includes(phrases[kind] ?? kind),
    );

    expect(decorativeKinds.length).toBe(Object.keys(phrases).length);
    expect(missing).toEqual([]);
  });

  it("prints the tightest skeleton, not the tightest of every surface", () => {
    const skeletons = decorativePlacements.filter(
      ({ surface }) => surface === "skeleton",
    );
    const closest = tightest(skeletons);
    const printed = printedRatio(verification, closest.pair);

    expect(verification).not.toContain("the tightest of every placement");
    expect(verification).toContain(`the tightest skeleton`);

    expect(printed).toBe(Number(closest.ratio.toFixed(3)));
  });

  it("prints the tightest surface, which is no longer the skeleton", () => {
    const closest = tightest(decorativePlacements);
    const printed = printedRatio(verification, closest.pair);

    expect(verification).toContain(
      `The tightest of the ${word(decorativeKinds.length)} surface kinds`,
    );
    expect(verification).toContain(closest.pair);
    expect(printed).toBe(Number(closest.ratio.toFixed(3)));
  });

  it("counts the marks and names every strip they are measured on", () => {
    expect(verification).toContain(
      `the ${word(Tokens.indicatorRoles.length)} roles on the ${word(Tokens.indicatorSurfaces.length)} surfaces`,
    );
    const unnamed = Tokens.indicatorSurfaces.filter(
      (surface) => !verification.includes(`\`${surface}\``),
    );

    expect(unnamed).toEqual([]);

    expect(verification).not.toContain("eight roles on the four strips");
  });

  it("prints the tightest mark on the wash that took the place", () => {
    const closest = tightest(markPlacements);

    expect(verification).toContain(closest.pair);

    expect(printedRatio(verification, closest.pair)).toBe(
      Number(closest.ratio.toFixed(2)),
    );
  });

  it("names the tightest chart swatch", () => {
    const closest = tightest(seriesPlacements);

    expect(verification).toContain(
      `series ${closest.index + 1} at ${closest.ratio.toFixed(2)}:1 on its \`${closest.over}\` strip`,
    );
  });

  it("counts the selection pairs it measures, body and secondary", () => {
    const body = Tokens.selectionPairs.filter(({ floor }) => floor === "body");
    const pairs = body.map(
      ({ foreground, background }) => `\`${foreground}\` on \`${background}\``,
    );

    expect(verification).toContain(
      `the ${word(body.length)} body roles, ${pairs.join(", ")}`,
    );
    expect(verification).toContain(
      "`mutedForeground` on `background`, a card and a popover",
    );
    expect(verification).toContain(`all ${styles.length}`);

    expect(verification).not.toContain("the four body roles");
  });

  it("names the native gallery that paints the tokens, not a TODO row", () => {
    const gallery = read("../../../apps/playground/README.md");
    const registry = read("../../../apps/playground/src/scenarios/registry.ts");
    const scenarios = [
      "theme-color-roles",
      "theme-type-and-shadow",
      "theme-platform",
      "theme-look",
    ];

    expect(gallery).toContain("## The theme gallery");
    scenarios.forEach((id) => {
      expect(registry, id).toContain(`id: "${id}"`);
      expect(verification, id).toContain(`\`${id}\``);
    });
    expect(verification).toContain("runtime's own style report");
    expect(verification).toContain("apps/playground/README.md");

    expect(section("## Limitations and future work")).not.toContain(
      "Native visual proof is the playground's theme gallery",
    );
  });
});
