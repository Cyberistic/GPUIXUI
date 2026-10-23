/**
 * Guards the catalogue against drift. `docs/tokens.md` is the page a consumer
 * reads and states that a token absent from it is not public, so the package is
 * the source and the page must keep up: an export with no line in the catalogue,
 * or a colour role with no table row, is a reader who cannot find the value
 * their theme already carries.
 *
 * The second drift is an import: a README or catalogue snippet that imports a
 * helper this package no longer exports sends a reader to a name that does not
 * exist, and nothing at runtime catches it because the snippet is prose. Every
 * name imported from `@gpuixui/tokens` in either document must be a real runtime
 * or type export.
 *
 * The third is a claim about other packages: the catalogue states which focus
 * ring the component packages paint, and it kept stating the old answer after
 * both adopted the new one. The page is held to the sources that decide it.
 *
 * The fourth is the gate's own report list in the inventory: `auditTheme` grew
 * `syntax` as its eleventh report and the `Contrast contract` row still printed
 * ten, leaving out the check a code block is held to, and it still taught a
 * `secondaryForeground` wash pair the table had retired. The row is read against
 * the gate and the pair table, so a report or a pair cannot outlive the row.
 *
 * `node:fs` is deliberate, as in `exports.test.ts`: this is a check over the
 * repository's own Markdown, and the package keeps zero runtime dependencies by
 * design.
 */

import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fadedPair } from "./fade.js";
import * as Tokens from "./index.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const catalogue = read("../../../docs/tokens.md");
const readme = read("../README.md");
const designSystem = read("../../../docs/design-system.md");
const inventory = read("../../../COMPONENTS.md");

/** One `COMPONENTS.md` row, by its first cell. */
const inventoryRow = (name: string): string => {
  const start = inventory.indexOf(`| ${name} |`);
  const end = inventory.indexOf("\n", start);
  return start === -1
    ? ""
    : inventory.slice(start, end === -1 ? undefined : end);
};

/** The package's source files a document may import from — no tests, no examples. */
const sourceFiles: ReadonlyArray<string> = readdirSync(
  new URL("./", import.meta.url),
).filter(
  (name) =>
    (name.endsWith(".ts") || name.endsWith(".tsx")) &&
    !name.includes(".test.") &&
    !name.includes(".example."),
);

/** Every name the package declares as an export, value or type. */
const declared: ReadonlySet<string> = new Set(
  sourceFiles.flatMap((file) =>
    [
      ...read(`./${file}`).matchAll(
        /export\s+(?:declare\s+)?(?:type|interface|class|function|const|enum)\s+([A-Za-z_$][\w$]*)/g,
      ),
    ].map((match) => match[1] ?? ""),
  ),
);

/** The names one document imports from `@gpuixui/tokens` or its React entry. */
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

/** One `## ` section of the catalogue, whitespace flattened so prose can be read as a sentence. */
const section = (heading: string): string => {
  const start = catalogue.indexOf(heading);
  const end = catalogue.indexOf("\n## ", start + 1);
  return catalogue.slice(start, end).replace(/\s+/g, " ");
};

/** The runtime exports of the package, excluding nothing: every one is public. */
const exportedValues = Object.keys(Tokens);

/**
 * Every source file of a package, tests excluded. Two page claims read the
 * component packages' own trees — which focus ring a seam paints, and whether
 * anything consumes the motion package — so the walk lives here once.
 */
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
    // The default and high-contrast tables list the same roles; a role present
    // in only one of them is a reader comparing modes with a missing line.
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

/**
 * Guards the audit's report list. `auditTheme` grows a report whenever a
 * contract lands, and the three pages that list them are how a consumer learns
 * what `passed` actually covers: a report with no line is a check the reader
 * never looks at, and a line for a report the gate no longer returns sends them
 * to a property that is `undefined`. The count word is derived from the gate
 * itself, so neither direction can drift.
 */
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
  ] as const;
  const count = words[reports.length] ?? `${reports.length}`;
  /**
   * Every sentence that states how many checks the gate runs. A page that
   * prints a count is telling the reader what `passed` covers, so each phrase
   * carries the gate's own word rather than one page's copy of it.
   */
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
      // A page wraps its prose, so a phrase is read across a line break.
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

    // The fill the pointer sees is derived, not a `hover`/`active` role, so the
    // wash pair was retired from `contrastPairs` when the variant adopted
    // `filledHover`/`filledPressed` — a row that still prints it sends a reader
    // to a contract nothing measures.
    expect(row).not.toContain("keeps on the `hover`/`active` wash");
    expect(row).toContain("`filledHover`/`filledPressed`");
    expect(row).toContain("actionFeedbackFailures");
  });
});

/**
 * Guards the catalogue's claim about which ring the component packages paint.
 * That claim went stale once: the page said they still painted the shadow on
 * every focus path long after both adopted `keyboardFocusRing` at rest. The
 * page is the only place a consumer reads it, so it is held to the sources that
 * decide it — and if a package ever paints the shadow again, this fails and
 * asks for the page to move with it.
 */
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

/**
 * Guards the catalogue's **motion** note. This package deliberately ships no
 * motion tokens — `@gpuixui/motion` owns the timing and the reduced-motion
 * policy — and the note explained the split by saying no component consumed the
 * package. That stopped being true when `internal/presence.tsx` became the seam
 * every entering and leaving surface composes, so a page still saying it sends a
 * reader to duplicate timing that is already wired through 41 component files.
 * The note is held to the tree: the seam composes the package's timing, the
 * components import the seam, and the animated ones read a level directly.
 */
describe("the motion claim", () => {
  it("no longer says nothing consumes the motion package", () => {
    expect(catalogue).not.toContain("No component consumes it yet");
  });

  it("names the seam, the hook and the package that owns the timing", () => {
    expect(catalogue).toContain("`@gpuixui/motion`");
    expect(catalogue).toContain("`internal/presence.tsx`");
    expect(catalogue).toContain("`useSurfaceTiming`");
    expect(catalogue).toContain("`@gpuixui/motion/timing`");
  });

  it("matches the sources: the seam composes the timing and components use it", () => {
    const seam = read("../../../packages/components/src/internal/presence.tsx");

    expect(seam).toContain('from "@gpuixui/motion/timing"');
    expect(seam).toContain("motionTiming");

    // The retracted claim was "none"; a floor is enough to keep the page honest
    // without pinning a count that a new component would move.
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

/**
 * Guards the catalogue's statement of a **control's** ring. `controlFocusRing`
 * has two states a consumer chooses between, and the page is how they learn
 * them: a failed validation recolours the outline to `destructive`, and a
 * disabled control declares no ring at all. A page that dropped either would
 * send a reader to a ring their invalid field paints in the wrong colour, or to
 * one that stays on a control that refuses every key — the two defects the
 * helper exists to prevent.
 */
describe("the control ring's claim", () => {
  const focus = section("## Focus");

  it("names the helper and both of its states", () => {
    expect(focus).toContain("controlFocusRing");
    expect(focus).toContain("destructive");
    expect(focus).toContain("disabled");
    expect(focus).toContain("no ring at all");
  });

  it("holds the page to the paint the helper resolves", () => {
    // The sentence above is a claim about two branches in `styles.ts`: the
    // outline takes the `destructive` role, and a disabled state returns before
    // a ring is built. A page cannot outlive either.
    const source = read("../src/styles.ts");

    expect(source).toContain("outlineColor: theme.colors.destructive");
    expect(source).toContain("if (state.disabled === true)");
  });
});

/**
 * Guards the catalogue's statement that the two ring seams **delegate** to
 * `controlFocusRing`. The page said they were "where that rule was first
 * written" and that "a seam that has not delegated to it yet is tracked in
 * `TODO.md`" — true while the helper was new, false the moment both packages
 * adopted it: a reader went looking for a task that no longer existed, and a
 * seam that regressed to its own copy of the rule would have kept the page
 * green. Both directions are read here, so the sentence and the sources move
 * together.
 */
describe("the ring seams delegate", () => {
  const seams = [
    "../../../packages/primitives/src/core/focus.ts",
    "../../../packages/components/src/internal/theme.ts",
  ];

  it("says both seams delegate, not that one is owed", () => {
    const focus = section("## Focus");

    expect(focus).toContain("delegate");
    expect(focus).not.toContain("has not delegated");
    expect(focus).not.toContain("tracked in `TODO.md`");
  });

  it("holds that sentence to the sources", () => {
    const own = seams.filter(
      (path) => !read(path).includes("controlFocusRing("),
    );

    expect(own).toEqual([]);
  });

  it("says the same thing in the helper's own JSDoc", () => {
    // The published API doc is the other place a consumer reads the rule, and it
    // said the two packages "decide the same rule in their own ring seam today"
    // with the adoption "tracked in TODO.md" long after both delegated.
    const source = read("../src/styles.ts");

    expect(source).toContain("both **delegate**");
    expect(source).not.toContain("tracked in `TODO.md`");
  });
});

describe("filled action adoption claim", () => {
  /**
   * The catalogue said the derived fills were "shipped and documented" while
   * "the component packages still paint a translucent hover", and named the
   * components package's button — which had already moved to
   * `filledHover`/`filledPressed`. Both buttons now paint the derived fills;
   * the page is held to the sources: a package that adopts the fills must move
   * off the deviation list, and the clause that remains must name the code that
   * is still there (the `@gpuixui/tw` recipe).
   */
  const limitation = (() => {
    const start = catalogue.indexOf("- The derived fills");
    const end = catalogue.indexOf("\n- ", start + 1);
    return catalogue.slice(start, end).replace(/\s+/g, " ");
  })();

  it("names the components package as the adopter", () => {
    // The components' action delegates to the primitives' button (plan 160), so
    // the fills it paints are the primitives' variant table's; the page must
    // name the delegation rather than a paint the components' file no longer
    // holds.
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
    // The clause read "the `@gpuixui/tw` `button` recipe the components package
    // compiles against", which invites a reader to treat the copyable upstream
    // recipe as the action a shipped control paints. The components' action
    // imports the primitives' button, so no tw recipe is on its path.
    expect(
      read("../../../packages/components/src/internal/button.tsx"),
    ).toContain("@gpuixui/primitives/button");
    expect(limitation).toContain("copyable");
    expect(limitation).not.toContain("compiles against");
  });

  it("names the toggle's accent as an adopter, not a deviation", () => {
    // The page once recorded a pressed `Toggle`'s 0.9/0.8 alpha wash as the
    // remaining deviation; the primitives now paint the derived fills for the
    // accent face too, so both halves are read from the sources and the page
    // must name the adopter beside the two buttons.
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
  /**
   * The pages called `secondary` "fill-only" and "the tonal one with no border"
   * long after both packages' action painted `borderStrong`, and they measured
   * its fill on "every strip it can sit on" though a row's wash is the edge's
   * claim. Both statements are held to the sources that decide them, and the
   * numbers the pages print are derived from the sixteen shipped styles.
   */
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
    expect(components).toContain('secondary: "border border-strong"');
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
  /** The two pages that teach the disabled state. */
  const pages: Readonly<Record<string, string>> = {
    "docs/tokens.md": catalogue,
    "docs/design-system.md": designSystem,
  };

  it("prints the range the fade misses on a card", () => {
    // The scope is a measurement, not a preference: the pages print the four
    // light styles where the faded `primary` label lands under the floor on its
    // own card. Deriving the range keeps a palette edit from leaving a printed
    // number behind.
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
  /** The two documents a consumer copies a snippet from. */
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
    // A guard that reads no imports would pass by finding nothing.
    Object.entries(documents).forEach(([name, text]) => {
      expect(importedNames(text).length, name).toBeGreaterThan(5);
    });
  });
});

/**
 * The pages promised the variant rule before every report had it.
 *
 * `docs/tokens.md` §Text selection said the legibility floors were "of the
 * theme's own contrast variant, so a high-contrast brand is measured at AAA
 * without naming a floor set" while `selectionFailures(theme)` defaulted to the
 * ordinary floors — the page taught a check the code did not run. The reports
 * select the theme's variant now, and this holds the three pages to saying so:
 * a rewrite that drops the rule sends a brand back to the false pass.
 */
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

/**
 * Guards the density override the pages teach against the merge the package
 * runs. `ThemeOverrides.density` takes a partial `controlHeight`, and the
 * documented brand raises one size (`invalidNumbers`' own example is
 * `{ controlHeight: { sm: 20 } }`), so the merge has to keep the sizes the
 * override does not name. It used to overlay the record whole: the two unnamed
 * sizes vanished, the audit gate refused the theme for a missing step, and the
 * snippet a reader copied produced a thrown audit instead of one report.
 */
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
});

/**
 * `bodyStrong` is `body`'s emphasis at the same size and leading, and the
 * typography merge is per role, so an example that raises the body size has to
 * raise the pair — and the gate now says so: `invalidNumbers` reports a strong
 * role that does not follow as `emphasis`. The catalogue's executed shape and
 * the rule beside the merge list are the two surfaces this guard keeps honest.
 */
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
    // The retracted sentence: no report holds the two together, so the example
    // was the only guard. The gate returns the report now, so the page must not
    // still call it an open interlock.
    expect(catalogue.replace(/\s+/g, " ")).not.toContain(
      "no report holds the two together yet",
    );
  });
});

/** A placement as the page states it: the pair, and the ratio the reader is shown. */
interface VerifiedPlacement {
  /** The pair as the contract names it — the half of the sentence a palette cannot move. */
  readonly pair: string;
  readonly ratio: number;
}

const tightest = <Placement extends VerifiedPlacement>(
  placements: ReadonlyArray<Placement>,
): Placement => {
  expect(placements.length).toBeGreaterThan(0);
  return placements.reduce((a, b) => (b.ratio < a.ratio ? b : a));
};

/** The ratio a sentence prints after `needle`, or `undefined` when it prints none. */
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

/** The spelled count the catalogue prints, or the numeral past the list. */
const word = (count: number): string => words[count] ?? String(count);

/**
 * The verification section is the page a reader checks a contract against, and
 * it made two claims the tables had outgrown: the mark contract was described as
 * "eight roles on the four strips" after `indicatorSurfaces` carried nine (the
 * four resting strips, the four washes a row wears and a field's `input` fill),
 * with the tightest placement named as Luna light's 3.30:1 after macOS dark's
 * primary on a list row's `accent` had taken the place at 3.06:1; and the
 * decorative paragraph listed eight of the eleven surface kinds and called the
 * tightest **skeleton** "the tightest of every placement" after a look's progress
 * rail had become the closest placement in the table.
 *
 * Every sentence below is derived from the table that produces it — the kinds,
 * the strips, the counts and the tightest pair with its ratio — so a palette or a
 * contract that moves can fail here instead of leaving the page teaching the
 * previous answer. The prose names the placement in human terms ("Aero's dark
 * progress rail"); the guard holds the mechanical half, which is what a reader
 * verifies.
 */
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
    // The phrase each kind is written as on the page. A kind the table gains has
    // no phrase here until the page is told, which is the point of the mapping.
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
    // The page prints three decimals, so an exact read is the comparison: a
    // palette that moves by a thousandth is a different placement and fails.
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
    // The retracted count: four resting strips were all the table carried when
    // the sentence was written.
    expect(verification).not.toContain("eight roles on the four strips");
  });

  it("prints the tightest mark on the wash that took the place", () => {
    const closest = tightest(markPlacements);

    expect(verification).toContain(closest.pair);
    // The mark's ratio is printed to two decimals, the precision its range needs.
    expect(printedRatio(verification, closest.pair)).toBe(
      Number(closest.ratio.toFixed(2)),
    );
  });

  it("names the tightest chart swatch", () => {
    const closest = tightest(seriesPlacements);

    // The sentence names the swatch, the surface and the ratio it was measured
    // at, so a moved palette or a new plot strip fails here rather than leaving
    // the page printing the previous tightest.
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
    // The retracted count: four content surfaces were all the table carried
    // when the sentence was written.
    expect(verification).not.toContain("the four body roles");
  });

  it("names the native gallery that paints the tokens, not a TODO row", () => {
    // The page named the gallery as the native proof and sent a reader to
    // `TODO.md` for it, although the four scenarios had landed and the
    // playground README records them. A proof that exists cannot read as
    // future work: the page cites the gallery, and the gallery is four
    // scenarios registered in the playground.
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
    // The retracted pointer: the bullets' native proof read as future work.
    expect(section("## Limitations and future work")).not.toContain(
      "Native visual proof is the playground's theme gallery",
    );
  });
});
