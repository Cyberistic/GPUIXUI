import { readFileSync } from "node:fs";
import {
  alphaOf,
  auditTheme,
  colorRoles,
  colorVisionDeficiencies,
  contrastFloors,
  contrastRatio,
  createTheme,
  decorativeSurfaces,
  extendTheme,
  findHighlight,
  indicatorFailures,
  isThemeMode,
  keyboardFocusDimOpacity,
  retroNames,
  retroStyles,
  selectionPairs,
  seriesColors,
  seriesSurfaces,
  themes,
  type Theme,
} from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";
import {
  lookLabel,
  lookOrder,
  modeOrder,
  previewMode,
  resolvePlatformTheme,
} from "./platform";

/**
 * The two theming pages state facts about `@gpuixui/tokens` that the package
 * changes.
 *
 * Both drifted once: `/docs/themes` printed "24 role pairs" after the contrast
 * table grew to 28, `/docs/theming`'s brand snippet painted the dark
 * theme's near-black label on a violet fill — 4.24:1, under the 4.5:1 floor the
 * package's own contract enforces — and the same page printed "47 semantic
 * roles" as a literal. A reader copying that snippet shipped the
 * defect the docs describe how to avoid.
 *
 * A page cannot drift again: the pair count is interpolated from
 * `contrastPairs` in the page itself, so it has no number to fall behind, the
 * colour-role count is interpolated from `colorRoles`, and the brand snippet is
 * measured here.
 */

const page = (name: string): string =>
  readFileSync(new URL(`../../content/docs/${name}`, import.meta.url), "utf8");

/** The page prints a word, not a digit, so the count reads as prose. */
const numberWords = [
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
];

/** The `## Contrast` section of a page, without its following siblings. */
const section = (body: string, heading: string): string => {
  const start = body.indexOf(`## ${heading}`);
  const end = body.indexOf("\n## ", start + 1);
  return start === -1 ? "" : body.slice(start, end === -1 ? undefined : end);
};

/**
 * One bullet of a page's audit list, without its following siblings.
 *
 * A bullet is scoped rather than the whole section because the bullets name
 * overlapping vocabulary: `muted` appears in the indicator bullet, so a
 * section-wide read of the selection bullet's surfaces passed while that bullet
 * still described four.
 */
const bullet = (body: string, label: string): string => {
  const start = body.indexOf(`- **${label}**:`);
  const end = body.indexOf("\n- **", start + 1);
  return start === -1 ? "" : body.slice(start, end === -1 ? undefined : end);
};

/** A name as the pages print it, so a list can be built from the package. */
const backticked = (name: string): string => "`" + name + "`";

/** One brand snippet on the page, resolved from what the page writes. */
interface BrandSnippet {
  /** The mode the snippet's `createTheme` starts from. */
  readonly mode: Theme["mode"];
  /** The fill the snippet overrides. */
  readonly fill: string;
  /** The on-colour the snippet pairs with that fill. */
  readonly label: string;
  /** The theme the snippet produces. */
  readonly theme: Theme;
}

/**
 * Every brand snippet the page shows, resolved exactly as written — the
 * snippet is what a reader copies, so the guard executes the page rather than
 * a copy of its values.
 */
const brandSnippets = (body: string): ReadonlyArray<BrandSnippet> =>
  body
    .split("```")
    .filter((fence) => fence.includes("createTheme({"))
    .flatMap((fence) => {
      const mode = /mode: "(\w+)"/.exec(fence)?.[1];
      if (!isThemeMode(mode)) return [];
      const written = Object.fromEntries(
        [...fence.matchAll(/(\w+): "(#[0-9A-Fa-f]{6})"/g)].flatMap((match) =>
          match[1] === undefined || match[2] === undefined
            ? []
            : [[match[1], match[2]]],
        ),
      );
      const fill = written.primary;
      const label = written.primaryForeground;
      if (fill === undefined || label === undefined) return [];
      return [
        { mode, fill, label, theme: createTheme({ mode, colors: written }) },
      ];
    });

describe("the theme page", () => {
  it("derives the contrast pair count instead of printing one", () => {
    const audit = section(page("themes.mdx"), "The theme audit");

    expect(audit).toContain("contrastPairs.length");
    expect(audit).not.toMatch(/\b\d+ role pairs\b/);
  });

  it("imports the count it derives", () => {
    const tokensImport = page("themes.mdx")
      .split("\n")
      .find(
        (line) =>
          line.startsWith("import ") && line.includes("@gpuixui/tokens"),
      );

    expect(tokensImport).toContain("contrastPairs");
    // The pressable rule's floor is read from the token, never printed.
    expect(tokensImport).toContain("targetSize");
    expect(page("themes.mdx")).toContain("{targetSize.minimum}");
  });

  it("names the leading rule the number report can return", () => {
    // The number report grew a fifth rule when a type role's leading had to
    // reach its own font size, and the bullet described only the single-value
    // rules. It is one of the two rules about a pair of tokens, so the page
    // says so.
    const audit = section(page("themes.mdx"), "The theme audit");
    const short = auditTheme(
      extendTheme(themes.light, { typography: { body: { lineHeight: 12 } } }),
    );

    expect(short.invalidNumbers.map(({ rule }) => rule)).toEqual(["leading"]);
    expect(audit).toContain("leading");
    expect(audit).toContain("own font size");
  });

  it("names the fit between a control height and the label it carries", () => {
    // The number report's sixth rule compares two groups: a control's box is
    // exactly `density.controlHeight[size]` and its label is laid at the taller
    // of `label`'s and `body`'s leading, so a box that is pressable but shorter
    // than that leading clips the text. The page named only the pressable floor,
    // so a height the report refuses was described by nothing.
    const audit = section(page("themes.mdx"), "The theme audit");
    const failures = auditTheme(
      extendTheme(themes.light, {
        typography: {
          body: { lineHeight: 30 },
          // The emphasis rule holds the pair together, so a body leading raised
          // alone is a second failure: this case isolates the fit.
          bodyStrong: { lineHeight: 30 },
        },
      }),
    ).invalidNumbers;

    expect(failures).toEqual([
      { group: "density", path: "controlHeight.sm", value: 28, rule: "fits" },
    ]);
    expect(audit).toContain("contain the leading");
    expect(audit).toContain("`label` or `body`");
  });

  it("names the glyph a control's box also has to contain", () => {
    // The fit rule reads the taller of `label`'s leading, `body`'s leading and
    // `iconSize.md`, because the same box is the glyph a square action draws.
    // The page stated only the text half, so an icon that outgrew its control
    // was a report the page described by nothing.
    const audit = section(page("themes.mdx"), "The theme audit");
    const failures = auditTheme(
      extendTheme(themes.light, {
        density: "compact",
        iconSize: { md: 26, lg: 28, xl: 30 },
      }),
    ).invalidNumbers;

    expect(failures).toEqual([
      { group: "density", path: "controlHeight.sm", value: 24, rule: "fits" },
    ]);
    expect(audit).toContain("`iconSize.md`");
    expect(audit).toContain("glyph");
  });

  it("names the row height the pressable rule also holds", () => {
    // `invalidNumbers` holds a `density.rowHeight` to the same 24px floor as a
    // control height: a dense list row is built at exactly that height and takes
    // the press. The bullet named only the control height, so a row the report
    // refuses was described by nothing.
    const audit = section(page("themes.mdx"), "The theme audit");
    const failures = auditTheme(
      extendTheme(themes.light, { density: { rowHeight: 20 } }),
    ).invalidNumbers;

    expect(failures).toEqual([
      { group: "density", path: "rowHeight", value: 20, rule: "pressable" },
    ]);
    expect(audit).toContain("rowHeight");
    expect(audit).toContain("{targetSize.minimum}");
    expect(audit).not.toContain("A control height is also the box");
  });

  it("measures both the body text and the secondary line a reader can select", () => {
    // The bullet described "the four content surfaces body text can be selected
    // from" at 7:1, then named only `input`/`background`/`card`/`popover` after
    // `selectionPairs` grew: the `mutedForeground` line on the three prose
    // surfaces joined at the secondary floor (the caption, table second line or
    // log row a reader selects), then the `muted` fill a user message bubble
    // paints joined at the body floor — the fifth content surface. The section
    // also names `muted` in the indicator bullet, so a section-wide guard let the
    // selection bullet keep a four-surface table.
    const audit = section(page("themes.mdx"), "The theme audit");
    const selection = bullet(page("themes.mdx"), "Text selection");
    const tokensImport = page("themes.mdx")
      .split("\n")
      .find(
        (line) =>
          line.startsWith("import ") && line.includes("@gpuixui/tokens"),
      );

    expect(tokensImport).toContain("selectionPairs");
    expect(tokensImport).toContain("contrastFloors");
    expect(selection).toContain("{selectionPairs.length}");
    expect(selection).toContain("mutedForeground");
    expect(selection).toContain("message bubble");
    expect(selection).toContain("{contrastFloors.body}");
    expect(selection).toContain("{contrastFloors.secondary}");
    expect(audit).not.toContain(
      "the four content surfaces body text can be selected from",
    );

    // Every surface the report composites over is named in the selection bullet
    // itself, so a pair added to the contract cannot leave the bullet describing
    // an older table.
    const unnamed = [
      ...new Set(selectionPairs.map((pair) => pair.background)),
    ].filter((surface) => !selection.includes(backticked(surface)));
    expect(
      unnamed,
      "the selection bullet does not name these surfaces",
    ).toEqual([]);
  });

  it("names the emphasis rule the number report can return", () => {
    // `bodyStrong` is `body`'s emphasis and the report holds the pair to one
    // size, one leading and a heavier weight — so a brand that raises only the
    // body's size sets a larger paragraph under a smaller title, and the bullet
    // has to say which measure the pair shares rather than teaching the weight
    // as the whole rule. The flat-weight brand is the other direction.
    const audit = section(page("themes.mdx"), "The theme audit");
    const flat = auditTheme(
      extendTheme(themes.light, {
        typography: {
          bodyStrong: { fontWeight: themes.light.typography.body.fontWeight },
        },
      }),
    );
    const drifted = auditTheme(
      extendTheme(themes.light, {
        typography: {
          body: { fontSize: themes.light.typography.body.fontSize + 1 },
        },
      }),
    );

    expect(flat.invalidNumbers.map(({ rule }) => rule)).toEqual(["emphasis"]);
    expect(drifted.invalidNumbers.map(({ path }) => path)).toEqual([
      "bodyStrong.fontSize",
    ]);
    expect(audit).toContain("bodyStrong");
    expect(audit).toContain("one size and one leading");
    expect(audit).toContain("three rules about a");
    expect(audit).not.toContain("its weight is the whole difference");
    expect(audit).not.toContain("two rules about a pair of tokens");
  });

  it("names every decorative surface kind the report measures", () => {
    // The bullet listed four kinds — dividers, skeleton fills, the modal veil
    // and status edges — while `decorativeSurfaces` measured nine. The scrollbar
    // thumb, the four state washes, the `secondary` action face and the
    // elevation shadow were all measured by a report the page described with a
    // list that stopped before them, so a reader who edited `hover` towards
    // `popover` had no sentence telling them what had failed.
    const audit = section(page("themes.mdx"), "The theme audit");
    const kinds = [
      ...new Set(decorativeSurfaces.map(({ surface }) => surface)),
    ];

    expect(kinds.length).toBeGreaterThanOrEqual(9);
    expect(
      kinds.filter((kind) => !audit.includes(`\`${kind}\``)),
      "the decorative bullet does not name these surface kinds",
    ).toEqual([]);
    // The count is the package's too: `disabledFace` joined the report without
    // a line on the page, which is how this case found a bullet claiming nine
    // while ten were measured.
    const word = numberWords[kinds.length] ?? String(kinds.length);
    expect(audit).toContain(
      `${word.slice(0, 1).toUpperCase()}${word.slice(1)} kinds`,
    );
    // The count and the floor are the package's, not a number to fall behind.
    expect(audit).toContain("{decorativeSurfaces.length}");
    expect(audit).toContain("{decorativeFloor}");
    expect(audit).not.toContain(
      "dividers, skeleton fills, the modal veil and status",
    );
  });

  it("holds the elevation claim to the levels the report measures", () => {
    // The bullet said an `elevation` is measured at "the scale's deepest
    // level, because if the strongest step cannot differ from the strip the
    // whole scale is flat there" — the claim the token pages retracted, because
    // a weaker level is *less* visible, so a card's `sm` lift needs its own
    // measurement. The failure also carries `level` now, so the readout names
    // the step a reader edits.
    const audit = section(page("themes.mdx"), "The theme audit");
    const levels = [
      ...new Set(
        decorativeSurfaces
          .filter(({ surface }) => surface === "elevation")
          .flatMap(({ level }) => (level === undefined ? [] : [level])),
      ),
    ];

    expect(levels.length).toBeGreaterThan(1);
    expect(audit).toContain("**each** level");
    expect(
      levels.filter((level) => !audit.includes(`\`${level}\``)),
      "the elevation sentence does not name these levels",
    ).toEqual([]);
    expect(audit).not.toContain("deepest level");
    expect(audit).not.toContain("the strongest step cannot differ");
  });

  it("says what the readout prints for a role or a wash that is not there", () => {
    // A theme restored from storage can predate a role the library added, so a
    // report carries `value: undefined`; and a theme with no `selection` role has
    // no wash to blend. The readout once printed `undefined is not a colour`,
    // and called an unbuildable wash "unmeasurable" — the sentence for a value
    // whose contrast depends on what is behind it, not for a value that is
    // missing. `theme-editor-logic.test.ts` holds both lines.
    const audit = section(page("themes.mdx"), "The theme audit");

    expect(audit).toContain("missing from this theme");
    expect(audit).toContain("could not be composited");
  });

  it("describes the whole audit the readout runs, not only its contrast half", () => {
    // The editor printed `contrastFailures` alone while `auditTheme` reported
    // three failures, so a reader whose divider vanished or whose role painted
    // black read a passing line. The page has to describe the readout it has.
    const audit = section(page("themes.mdx"), "The theme audit");

    // The printed word is derived from the gate's own keys, so a tenth report
    // cannot land while the page still promises nine.
    const reports = Object.keys(auditTheme(themes.light)).filter(
      (key) => key !== "passed",
    );
    expect(audit).toContain(
      `${numberWords[reports.length]} independent failures`,
    );
    expect(audit).toContain("auditTheme");
    expect(audit).toContain("invalidNumbers");
    expect(audit).toContain("invalidShadowColors");
    expect(audit).toContain("decorativeFailures");
    expect(audit).toContain("seriesFailures");
    expect(audit).toContain("seriesDeficiencyFloor");
    expect(audit).toContain("colorVisionDeficiencies");
    expect(
      colorVisionDeficiencies.filter(
        (deficiency) => !audit.includes(deficiency),
      ),
    ).toEqual([]);
    expect(audit).toContain("syntaxFailures");
    expect(audit).toContain("{syntaxSurfaces.length}");
    expect(audit).toContain("selectionFailures");
    expect(audit).toContain("indicatorFailures");
    expect(audit).toContain("disabledFadeFailures");
    expect(audit).toContain("keyboardDimFailures");
    expect(audit).toContain("cannot paint");
    expect(audit).toContain("localStorage");
  });

  it("names the two structural reports inside the gate, not beside it", () => {
    // `invalidScales` and `switchFailures` were public functions *beside*
    // `auditTheme` while the page said the readout prints them separately: a
    // consumer running the gate alone shipped a theme whose `lg` corner was
    // smaller than its `md`. Both are gate keys now, so the page teaches one
    // call and one list.
    const audit = section(page("themes.mdx"), "The theme audit");

    const reports = ["invalidScales", "switchFailures"];
    expect(reports.filter((report) => !audit.includes(report))).toEqual([]);
    expect(audit).toContain("highlightFailures");
    expect(audit).toContain("fourteen");
    expect(audit).toContain("radius.md");
    expect(audit).toContain("radius.lg");
    expect(audit).not.toContain("beside the gate");
    // The copy block promises the same set, so a consumer can run it on the
    // theme they copied.
    const body = page("themes.mdx");
    expect(body).toContain("every report the gate carries");
    expect(body).not.toContain("the readout prints beside it");
  });

  it("derives the floors the fade and the dim are held to", () => {
    // Both bullets printed the number the package owns: the disabled fade's
    // 1.5:1 and the keyboard dim's 1.05:1 floor, plus the 4.5:1 the fade example
    // starts from. Each is an export (`contrastFloors.disabled`,
    // `decorativeFloor`, `contrastFloors.secondary`), so a floor the tokens
    // package moved would leave the page describing the old contract — and the
    // runtime's own 40% share had the same shape.
    const fade = bullet(page("themes.mdx"), "The disabled fade");
    const dim = bullet(page("themes.mdx"), "The keyboard dim");

    expect(fade).toContain("{contrastFloors.disabled}:1");
    expect(fade).toContain("{contrastFloors.secondary}:1");
    expect(fade).not.toContain("to 1.5:1");
    expect(fade).not.toContain("clears 4.5:1");

    expect(dim).toContain("{decorativeFloor}:1");
    expect(dim).not.toContain("to 1.05:1");
    // A percentage is derived on the page, not printed: the export is a share.
    expect(dim).toContain(`${Math.round(keyboardFocusDimOpacity * 100)}%`);
  });
});

describe("the preview policy's audit count", () => {
  it("prints the number of reports the gate returns", () => {
    // The policy is the file a page author reads before writing a preview, and
    // it said "all nine `auditTheme` reports" after the gate returned ten, while
    // `/docs/themes` printed ten from the gate's own keys. The count is derived
    // from those keys here too, so the policy cannot fall behind the package.
    const policy = readFileSync(
      new URL("../../../../docs/preview-strategy.md", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");
    const reports = Object.keys(auditTheme(themes.light)).filter(
      (key) => key !== "passed",
    );
    const current = numberWords[reports.length];

    expect(current).toBeDefined();
    expect(policy).toContain(`all ${current} \`auditTheme\` reports`);

    // And it may not keep a previous count beside the current one.
    const stale = numberWords.filter(
      (word) =>
        word !== current &&
        policy.includes(`all ${word} \`auditTheme\` reports`),
    );
    expect(stale).toEqual([]);
  });
});

describe("the theming page's audit enumerations", () => {
  it("names the code palette the audit measures, in both lists", () => {
    // Both sentences enumerate every contract `auditTheme` runs. They stopped
    // at the keyboard dim while the gate gained `syntax`, so a brand whose code
    // tokens match the fill they are read on was told the audit covers it.
    const body = page("theming.mdx");
    expect(body).toContain("the code palette");
    expect(body).toContain("every token in a code block");
  });
});

describe("the theming page's indicator marks", () => {
  it("describes the contract a mark is held to, not only its colours", () => {
    // A mark is neither text nor a boundary, so the page has to name the report
    // and the floor that measure it — otherwise a reader painting a bar in
    // `primary` has only the contrast table to reason about, and it is silent.
    const marks = section(page("theming.mdx"), "Indicator marks");

    expect(marks).toContain("indicatorRoles");
    expect(marks).toContain("indicatorSurfaces");
    expect(marks).toContain("indicatorFailures");
    expect(marks).toContain(`${contrastFloors.boundary}:1`);
    expect(marks).toContain("statusTone");
  });
});

describe("the theming pages' indicator strips", () => {
  // Both pages printed "the four strips a mark is drawn on" while
  // `indicatorSurfaces` had grown to seven: the `hover` and `active` washes a
  // row tints under the pointer, and a field's `input` fill, which carries its
  // caret. A reader editing an action fill was told a mark is measured on a set
  // the package no longer uses. The count **and the list** are printed from the
  // array now, so a strip the package adds is named without an edit and a page
  // cannot keep a list that has fallen behind.
  const pages = [
    { name: "themes.mdx", heading: "The theme audit" },
    { name: "theming.mdx", heading: "Indicator marks" },
  ] as const;

  it("derives the count and names every strip the package measures", () => {
    const wrong = pages.flatMap(({ name, heading }) => {
      const body = page(name);
      const marks = section(body, heading);
      const prose = marks.replace(/\s+/g, " ");
      const tokensImport = body
        .split("\n")
        .find(
          (line) =>
            line.startsWith("import ") && line.includes("@gpuixui/tokens"),
        );

      return [
        ...(tokensImport?.includes("indicatorSurfaces")
          ? []
          : [`${name}: does not import indicatorSurfaces`]),
        ...(marks.includes("{indicatorSurfaces.length}")
          ? []
          : [`${name}: prints a literal strip count`]),
        ...(marks.includes('{indicatorSurfaces.join(", ")}')
          ? []
          : [`${name}: does not print the package's own strip list`]),
        ...(marks.includes("(`background`")
          ? [`${name}: retypes the strip list`]
          : []),
        ...(/\b(four|seven|nine) strips\b/.test(marks)
          ? [`${name}: keeps a stale strip count`]
          : []),
        // The tint a message is filled with is the strip that moved a palette:
        // a mark standing on it is a mark a reader can lose. The prose names the
        // composition and cites the sweep, so a mark's tint cannot become a
        // strip the page lists and never explains.
        ...(prose.includes("message's own tint") &&
        prose.includes("four soft status tints") &&
        prose.includes("indicator.test.ts")
          ? []
          : [`${name}: does not explain the tint a message's mark stands on`]),
      ];
    });

    expect(wrong).toEqual([]);
  });
});

describe("the theme page's copy-theme note", () => {
  it("names every report the audit folds, so a consumer can run one of them alone", () => {
    // The note is the list a consumer starts from. `auditTheme` returned six
    // reports while the note named four helpers, and the indicator report then
    // arrived without a name here; a reader looking for the role, shadow or
    // mark check had to find it in the package.
    const note = section(page("themes.mdx"), "Copy theme");

    expect(
      [
        "auditTheme",
        "invalidColorRoles",
        "invalidShadowColors",
        "invalidNumbers",
        "contrastFailures",
        "decorativeFailures",
        "seriesFailures",
        "syntaxFailures",
        "selectionFailures",
        "indicatorFailures",
        "disabledFadeFailures",
        "keyboardDimFailures",
      ].filter((name) => !note.includes(name)),
    ).toEqual([]);
  });
});

describe("the theming page's role count", () => {
  it("derives the number of colour roles instead of printing one", () => {
    const body = page("theming.mdx");

    expect(body).toMatch(
      /import \{[^}]*\bcolorRoles\b[^}]*\} from "@gpuixui\/tokens";/,
    );
    expect(body).toContain("{colorRoles.length} semantic roles");
    expect(body).toContain("There are {colorRoles.length} of them");
    // A printed count is the defect this guards: it cannot follow the package.
    expect(body).not.toMatch(/\b\d+ semantic roles\b/);
    expect(body).not.toMatch(/There are \d+ of them/);
  });
});

describe("the theming page's brand snippets", () => {
  const snippets = brandSnippets(page("theming.mdx"));
  const dark = snippets.find((snippet) => snippet.mode === "dark");
  const light = snippets.find((snippet) => snippet.mode === "light");

  it("owns the on-colour of the fill it overrides, per mode", () => {
    // A fill and its label are one pair, and the pair is mode-specific: a fill
    // light enough to be found as a mark in a dark theme cannot carry white
    // text, so the two modes need two values rather than one shared label.
    expect(snippets.length).toBeGreaterThanOrEqual(2);
    expect(dark).toBeDefined();
    expect(light).toBeDefined();
  });

  it("paints each label at the package's secondary-text floor", () => {
    const missed = snippets.flatMap(({ mode, fill, label }) => {
      const measured = contrastRatio(label, fill);
      return measured !== undefined && measured >= contrastFloors.secondary
        ? []
        : [`${mode}: ${label} on ${fill} is ${measured ?? "unmeasurable"}`];
    });

    expect(missed).toEqual([]);
  });

  it("paints a fill a reader can find as a mark, not only read under text", () => {
    // A primary is also the role a progress fill and a spinner dot paint, so
    // the label pair alone let the documented brand ship a fill that vanished
    // into the dark card: `#6A45F0` carried white text at 5.6:1 and measured
    // 2.66:1 as a mark on the card. The mark contract is what sees both jobs.
    const missed = snippets.flatMap(({ mode, theme }) =>
      indicatorFailures(theme).map(
        (failure) =>
          `${mode}: mark ${failure.role} on ${failure.surface} is ${
            failure.ratio ?? "unmeasurable"
          }:1 (needs ${failure.floor}:1)`,
      ),
    );

    expect(missed).toEqual([]);
  });

  it("passes the one gate the package runs on its own themes", () => {
    const failed = snippets.flatMap(({ mode, theme }) => {
      const audit = auditTheme(theme);
      const counts = [
        ...audit.invalidRoles.map((failure) => `role ${failure.role}`),
        ...audit.invalidShadows.map((failure) => `shadow ${failure.level}`),
        ...audit.contrast.map(
          (failure) => `contrast ${failure.foreground}/${failure.background}`,
        ),
        ...audit.decorative.map(
          (failure) => `decorative ${failure.role} on ${failure.over}`,
        ),
        ...audit.selection.map(
          (failure) => `selection ${failure.kind} ${failure.background}`,
        ),
        ...audit.indicators.map(
          (failure) => `mark ${failure.role}/${failure.surface}`,
        ),
        ...audit.highlight.map(
          (failure) => `highlight ${failure.kind} ${failure.surface}`,
        ),
      ];
      return audit.passed
        ? []
        : [
            `${mode}: ${counts.join(", ") || "series"} — ${[
              audit.series.surfaces.length,
              audit.series.distinctness.length,
              audit.series.deficiencies.length,
            ].join("/")} series findings`,
          ];
    });

    expect(failed).toEqual([]);
  });

  it("says why a brand owns two values rather than one", () => {
    const override = section(page("theming.mdx"), "Override a theme");

    expect(override).toContain("indicatorFailures");
    expect(override).toContain("spinner");
    expect(override).toContain("brand-theme.example.ts");
  });

  it("prints the wash pair the brand's own fill derives", () => {
    // The paragraph taught a pair the package no longer derived: it said
    // `#B49CFF` gave 30%/31% and named a replacement fill, while `findHighlight`
    // now spends the secondary floor's headroom when the body-safe share is one
    // step from the resting one. The shares are read from the snippet's own
    // theme, so a fill or derivation edit moves what the page must print.
    const brand = snippets.find((snippet) => snippet.mode === "dark");
    expect(brand).toBeDefined();
    if (brand === undefined) return;

    const pair = findHighlight(brand.theme);
    const share = (colour: string): number =>
      Math.round((alphaOf(colour) ?? 0) * 100);
    const override = section(page("theming.mdx"), "Override a theme");

    expect(override).toContain(`**${share(pair.color)}%**`);
    expect(override).toContain(`**${share(pair.activeColor)}%**`);
    expect(override).toContain(`\`${brand.fill}\``);
    // The retired sentence named a replacement fill and a one-share pair.
    expect(override).not.toContain("one share apart");
    expect(override).not.toContain("#A78BFA");
  });
});

describe("the theming page's data series", () => {
  const body = page("theming.mdx");
  const series = section(body, "Data series");

  it("mounts the generated swatches", () => {
    expect(series).toContain("<SeriesSwatches />");
    // Read the members, not the line: another section's import is its own.
    expect(body).toMatch(
      /import \{[^}]*\bseriesColors\b[^}]*\} from "@gpuixui\/tokens";/,
    );
    expect(body).toMatch(
      /import \{[^}]*\bthemes\b[^}]*\} from "@gpuixui\/tokens";/,
    );
  });

  it("derives the scale's length instead of printing it", () => {
    expect(series).toContain("{seriesColors(themes.dark).length}");
    // A printed count is the defect the role count already guards against.
    expect(series).not.toMatch(/scale of \d+ colours/);
  });

  it("names the bridge's variables without printing a terminal index", () => {
    // The sentence ended at `--series-5` while the length above it was derived,
    // so it was one scale edit away from naming a variable no bridge writes. An
    // open range cannot fall behind: the first two are shown, the rest implied.
    const printed = [...series.matchAll(/`--series-(\d+)`/g)].flatMap((match) =>
      match[1] === undefined ? [] : [Number(match[1])],
    );

    expect(seriesColors(themes.dark).length).toBeGreaterThan(2);
    expect(printed).toEqual([1, 2]);
  });

  it("states the three contracts the scale is held to, and the reason it exists", () => {
    // The section is why a component has no hex of its own: a role carries
    // status, the series carries identity, and the scale is measured — against
    // its plot surface, against itself, and against each colour-vision
    // deficiency, which is the contract a full-colour distance cannot replace.
    expect(series).toContain("seriesSurfaces");
    expect(series).toContain("seriesDistinctnessFloor");
    expect(series).toContain("seriesDeficiencyFloor");
    expect(series).toContain("colorVisionDeficiencies");
    expect(series).toContain("seriesFailures");
    expect(series).toContain("identity");
  });

  it("names every deficiency the package measures the scale against", () => {
    // A deficiency added to the package without a sentence here would be a
    // contract the page claims the reader is protected from and never mentions.
    expect(
      colorVisionDeficiencies.filter(
        (deficiency) => !section(body, "Data series").includes(deficiency),
      ),
    ).toEqual([]);
  });

  it("sits with the colour roles rather than in the platform section", () => {
    const colours = body.indexOf("## Colour roles");
    const builtIn = body.indexOf("## Built-in themes");
    const start = body.indexOf("## Data series");

    expect(start).toBeGreaterThan(colours);
    expect(start).toBeLessThan(builtIn);
  });
});

describe("the theming pages' find highlights", () => {
  // The find wash is the one text surface a host paints from a palette this
  // package does not own: a `<text>` handed no colour marks a match with the
  // runtime's accent, and at its shares the active match leaves body text under
  // the reading floor. `findHighlight` answers a theme's pair and
  // `highlightFailures` measures it, and neither was on the site — the page a
  // reader looks up a token on could not tell them what a find bar paints.
  const find = (): string => section(page("theming.mdx"), "Find highlights");

  it("states the runtime's baseline from the package, not from a literal", () => {
    const marks = find();
    const tokensImport = page("theming.mdx")
      .split("\n")
      .find(
        (line) =>
          line.startsWith("import ") && line.includes("@gpuixui/tokens"),
      );

    expect(marks, "the page has no Find highlights section").not.toBe("");
    expect(tokensImport).toContain("highlightShares");
    expect(tokensImport).toContain("highlightSurfaces");
    // Both shares are interpolated, so a baseline edit reaches the page.
    expect(marks).toContain("Math.round(highlightShares.match * 100)");
    expect(marks).toContain("Math.round(highlightShares.active * 100)");
    expect(marks).toContain("{highlightSurfaces.length}");
    expect(marks).toContain("<TokenList names={highlightSurfaces} />");
    // A literal baseline is the drift this section replaced.
    expect(marks).not.toContain("30%");
    expect(marks).not.toContain("65%");
  });

  it("names the three jobs the report measures and the call a reader runs", () => {
    const marks = find();

    ["visibility", "legibility", "distinct"].forEach((job) => {
      expect(marks, `the section does not name ${job}`).toContain(job);
    });
    expect(marks).toContain("findHighlight(theme)");
    expect(marks).toContain("highlightFailures(theme)");
    // The corner is a scale step, not the runtime's literal.
    expect(marks).toContain("`radius.sm`");
    // The gate boundary is stated, because the report is one of its keys now,
    // and the count is derived so the section cannot fall behind the gate.
    const reports = Object.keys(auditTheme(themes.light)).filter(
      (key) => key !== "passed",
    );
    expect(marks).toContain(numberWords[reports.length]);
    expect(marks).toContain("`auditTheme`");
  });

  it("prints the probe's own check count and the window it measured in", () => {
    const checks = /export const FIND_CHECKS = (\d+)/.exec(
      readFileSync(
        new URL(
          "../../../../apps/playground/src/live/find-highlight.ts",
          import.meta.url,
        ),
        "utf8",
      ),
    )?.[1];

    expect(checks).toBeDefined();
    expect(find()).toContain("`find-highlight`");
    expect(find()).toContain(`${checks} checks`);
    expect(find()).toContain("0.11.0");
  });
});

describe("the theming pages' series surfaces", () => {
  // Both bullets printed a literal `(`background`, `card`, `popover`)` while
  // `seriesSurfaces` was the authority, so the `muted` toolbar — added once a
  // look that repaints its own plot strips needed measuring — would have left a
  // page naming three of four surfaces. The list is now the package's array
  // rendered by `TokenList`, so a fourth surface reaches both pages without an
  // edit; the guard holds the mount and refuses the literal.
  const pages = [
    { name: "themes.mdx", heading: "The theme audit" },
    { name: "theming.mdx", heading: "Data series" },
  ] as const;

  it("mounts the package's array and prints no literal surface list", () => {
    const literal = `(${seriesSurfaces.map(backticked).join(", ")})`;
    const wrong = pages.flatMap(({ name, heading }) => {
      const body = page(name);
      const marks = section(body, heading);
      const tokensImport = body
        .split("\n")
        .find(
          (line) =>
            line.startsWith("import ") && line.includes("@gpuixui/tokens"),
        );

      return [
        ...(tokensImport?.includes("seriesSurfaces")
          ? []
          : [`${name}: does not import seriesSurfaces`]),
        ...(marks.includes("{seriesSurfaces.length}")
          ? []
          : [`${name}: prints a literal surface count`]),
        ...(marks.includes("<TokenList names={seriesSurfaces} />")
          ? []
          : [`${name}: does not render <TokenList names={seriesSurfaces} />`]),
        ...(marks.includes(literal)
          ? [`${name}: keeps the literal list ${literal}`]
          : []),
        ...(/\b(three|four|[0-9]+) surfaces\b/.test(marks)
          ? [`${name}: keeps a stale surface count`]
          : []),
      ];
    });

    expect(wrong).toEqual([]);
  });

  it("has more than the three surfaces the literal list named", () => {
    // The premise the old guard hid: `seriesSurfaces` is what the package
    // measures, and a list typed into a page can only ever be behind it.
    expect(seriesSurfaces.length).toBeGreaterThanOrEqual(3);
  });

  it("derives the scale's length on both pages", () => {
    const audit = section(page("themes.mdx"), "The theme audit");

    expect(seriesColors(themes.dark).length).toBeGreaterThan(1);
    expect(audit).toContain("{seriesColors(themes.dark).length}");
    expect(audit).not.toMatch(/\b(five|\d+) categorical colours\b/);
  });
});

describe("the palette a preview paints", () => {
  /** Prose wraps, so the sentence is read flat. */
  const flat = (text: string): string => text.replace(/\s+/g, " ");

  const switchSource = (): string =>
    readFileSync(
      new URL("../components/docs/platform-toggle.tsx", import.meta.url),
      "utf8",
    );

  it("states the palette the previews open in, and the switch that changes it", () => {
    // The site has a light/dark switch of its own (Fumadocs' theme provider) and
    // a preview deliberately does not follow it — a reader in light mode saw
    // dark previews and nothing on the page said why, or that both palettes are
    // printed elsewhere on it. The palette a reader wants to compare is the
    // switch's own axis, so the page names it, names every value it accepts,
    // and interpolates the opening palette rather than typing it.
    const body = flat(page("theming.mdx"));

    expect(previewMode).toBe("dark");
    expect(body).toContain("{previewMode}");
    expect(body).toContain("light/dark switch");
    expect(body).toContain("#built-in-themes");
    expect(body).not.toMatch(
      /previews? (render|paint)s? (the|a) dark palette/i,
    );
    // A mode added to the switch without the page naming it would be a link a
    // reader cannot build; the list is the switch's, not a sentence someone
    // remembered to edit.
    expect(modeOrder.filter((mode) => !body.includes(`?mode=${mode}`))).toEqual(
      [],
    );
  });

  it("offers the palette in the switch, wired to that axis", () => {
    // A query parameter the switch never renders is a link a reader can share
    // but not click, so the group is the other half of the guard above.
    const source = switchSource();
    expect(source).toContain("modeOrder.map");
    expect(source).toContain("onSelect={setMode}");
    expect(source).toContain("selected={mode}");
    expect(source).toContain('label="Preview palette"');
  });

  it("reads the palette from the switch, not a literal of its own", () => {
    // A second literal is the drift this guard exists for: a palette fixed in
    // the provider alone would leave the page teaching a switch that does
    // nothing. The state falls back to `previewMode`, the resolution takes it,
    // and the surface stamps it so the scene's chrome can follow.
    const source = switchSource();
    expect(source).toContain("mode: previewMode");
    expect(source).toContain("resolvePlatformTheme(platform, mode, look)");

    const surface = readFileSync(
      new URL("../components/docs/preview-surface.tsx", import.meta.url),
      "utf8",
    );
    expect(surface).toContain("data-mode={theme.mode}");

    expect(
      resolvePlatformTheme("darwin", previewMode, "native").name,
    ).toContain("Dark");
    expect(
      resolvePlatformTheme("win32", previewMode, "luna").colors.background,
    ).not.toBe(
      resolvePlatformTheme("win32", "light", "luna").colors.background,
    );
  });
});

describe("the theming page's look parameter", () => {
  const picker = section(page("theming.mdx"), "The look parameter");

  /** The prose with its line wrapping flattened: a label is one sentence, not two lines. */
  const flat = (text: string): string => text.replace(/\s+/g, " ");

  /**
   * The paragraph that names the looks a link can carry, read alone.
   *
   * The section continues into §Take one… and §Follow the desktop's palette,
   * which name Omarchy for its `colors.toml`; reading the whole section let the
   * look paragraph offer two of the three styles the library ships and still
   * pass, because a later subsection happened to carry the third name.
   */
  const paragraph = flat(
    picker.slice(
      picker.indexOf("`?look=luna`"),
      picker.indexOf("Both axes resolve"),
    ),
  );

  it("names every look the query accepts, by the library's label", () => {
    // The sidebar switch offers platforms only, so the page names the looks a
    // `?look=` link can carry; a look added to the library without a sentence
    // here would be a value the docs never explain.
    // `native` is not a look the page names: it is the switch's own style, and
    // the page has no control offering it.
    expect(
      lookOrder
        .filter((look) => look !== "native")
        .filter((look) => !paragraph.includes(lookLabel(look))),
    ).toEqual([]);
    expect(paragraph).toContain("`?look=omarchy`");
  });

  it("states each look's provenance, so Omarchy is not read as invented", () => {
    // Two of the three styles are reconstructions and one is not: Luna and Aero
    // never had a dark mode, so their dark editions are this library's, while
    // Omarchy's pair is the shell's own. A paragraph that lists three names
    // without that split teaches a reader the wrong provenance.
    expect(paragraph).toContain("Tokyo Night");
    expect(paragraph).toContain("Flexoki Light");
    expect(paragraph).toContain("invented");
    expect(retroNames).toContain("omarchy");
  });

  it("writes the look to the URL, says it is no control, and not a platform", () => {
    expect(picker).toContain("look=luna");
    expect(flat(picker)).toContain("not a fifth platform");
    expect(flat(picker)).toContain("no look");
    expect(picker).toContain("retroStyles");
    expect(picker).toContain("applyStyle");
    // The retired section sent the reader to a **Look** group the sidebar no
    // longer has (`8c180a9f`), so a page that reads as a control fails here.
    expect(picker).not.toContain("Beside it, **Look** applies");
  });

  it("keeps the preview policy and the site ledger on the parameter, not a retired control", () => {
    // `docs/preview-strategy.md` taught the same control and the landing's
    // retired green identity. The site ledger restates both, so all three are
    // read here and fail together.
    const policy = readFileSync(
      new URL("../../../../docs/preview-strategy.md", import.meta.url),
      "utf8",
    );
    const ledger = readFileSync(
      new URL("../../README.md", import.meta.url),
      "utf8",
    );

    expect(policy).toContain("look parameter");
    expect(policy).toContain("the sidebar offers platforms only");
    expect(policy).not.toContain("look picker");
    expect(policy).not.toContain("Hunter License green");
    expect(ledger).toContain("look parameter");
    expect(ledger).toContain("no look group");
    // The policy named the era pair after `omarchy` joined `retroNames`, so a
    // reader of the policy could not see the third style. The ledger carried
    // the same pair. Deriving the labels makes a fourth look fail here too.
    const labels = retroNames.map((name) => retroStyles[name].label);
    expect(labels.filter((label) => !policy.includes(label))).toEqual([]);
    expect(labels.filter((label) => !ledger.includes(label))).toEqual([]);
    expect(policy).not.toContain("Luna and Aero");
    expect(ledger).not.toContain("Luna and Aero");
  });

  it("describes the styles the library ships, not ones the site invented", () => {
    // The look's label comes from `retroStyles`; quoting a different name here
    // would document a style that does not exist.
    expect(resolvePlatformTheme("default", "dark", "luna").name).toContain(
      retroStyles.luna.label,
    );
    const theming = flat(page("theming.mdx"));
    expect(
      retroNames
        .map((name) => retroStyles[name].label)
        .filter((label) => !theming.includes(label)),
    ).toEqual([]);
  });
});

/** One row of `/docs/theming`'s colour-role table: role, light cell, dark cell. */
interface RoleRow {
  readonly role: string;
  readonly light: string;
  readonly dark: string;
}

/**
 * The role rows the page prints, read the way a reader reads them. Each cell is
 * the theme's own value interpolated at render time, so a palette edit reaches
 * the page instead of leaving the previous hex in the table.
 */
const colourRows = (body: string): ReadonlyArray<RoleRow> =>
  section(body, "Colour roles")
    .split("\n")
    .flatMap((line) => {
      const match =
        /^\|\s*`([A-Za-z]+)`\s*\|\s*\{themes\.light\.colors\.([A-Za-z]+)\}\s*\|\s*\{themes\.dark\.colors\.([A-Za-z]+)\}\s*\|/.exec(
          line,
        );
      const [, role, light, dark] = match ?? [];
      return role === undefined || light === undefined || dark === undefined
        ? []
        : [{ role, light, dark }];
    });

describe("the theming page's focus-ring section", () => {
  it("draws the keyboard ring away from the fill it belongs to", () => {
    // The ring was documented nowhere on the site, and the geometry moved: it
    // used to sit on the control's edge (`outlineOffset: 0`), where a focused
    // primary action drew its line in its own fill. The section now teaches the
    // two helpers and the separation, so both are read from the package that
    // decides them.
    const stylesheet = readFileSync(
      new URL("../../../../packages/tokens/src/styles.ts", import.meta.url),
      "utf8",
    );
    const keyboard = stylesheet.slice(
      stylesheet.indexOf("export function keyboardFocusRing"),
      stylesheet.indexOf("export interface ControlFocusState"),
    );
    expect(keyboard).toContain("outlineOffset: theme.borderWidth.strong");
    expect(keyboard).not.toContain("outlineOffset: 0");

    const shadow = stylesheet.slice(
      stylesheet.indexOf("export function focusRing"),
      stylesheet.indexOf("export interface FocusVisibleOutline"),
    );
    expect(shadow).toContain("spreadRadius: theme.borderWidth.strong");
    expect(shadow).toContain("blurRadius: 0");

    const control = stylesheet.slice(
      stylesheet.indexOf("export function controlFocusRing"),
      stylesheet.indexOf("export type FilledAction"),
    );
    expect(control).toContain("if (state.disabled === true) {");
    // An invalid control's line takes the status role, and a theme that lost
    // that role keeps the ring's own colour — a brand that dropped
    // `destructive` must still show where focus is.
    expect(control).toContain(
      "themeColors(theme).destructive ?? ring.focusVisible.outlineColor",
    );

    // The measured premise lives in the package's own test: the page names it
    // instead of printing a range that every palette pass has to re-edit (the
    // premise moved when the palettes did), and the test's table is read so the
    // citation cannot point at a file that stopped measuring it.
    const measured = readFileSync(
      new URL(
        "../../../../packages/tokens/src/ring-fill.test.ts",
        import.meta.url,
      ),
      "utf8",
    );
    expect(measured).toContain('spread(ratios("primary", "rest"))');
    expect(measured).toContain('spread(ratios("destructive", "rest"))');

    const text = section(page("theming.mdx"), "Focus rings").replace(
      /\s+/g,
      " ",
    );
    expect(text).toContain("`keyboardFocusRing(theme)`");
    expect(text).toContain("`focusRing(theme)`");
    expect(text).toContain("`controlFocusRing(theme, { disabled, invalid })`");
    expect(text).toContain("separated from the control's own fill");
    expect(text).toContain("borderWidth.strong");
    expect(text).toContain("`ring-fill.test.ts`");
    expect(text).toContain("unsatisfiable");
    expect(text).toContain("focus-ring-offset");
    expect(text).toContain("no ring at all");
    // A literal measured range is what drifts; the page prints the mechanism.
    expect(text).not.toMatch(/\d\.\d\d–\d\.\d\d:1/);
    // The retracted geometry: the line on the control's own edge.
    expect(text).not.toContain("outlineOffset: 0");
    expect(text).not.toContain("keeps the line on the control's edge");
  });
});

describe("the theming page's colour-role table", () => {
  it("prints the palette the package ships, from the package itself", () => {
    // A palette edit is exactly when a hand-written table rots, and the table
    // taught the previous `accent` and `borderStrong` shades after the palettes
    // moved. Each cell now interpolates the role it names, so the guard holds
    // the page to the shape rather than to a copy of the values: a cell that
    // prints a literal, or names a different role in its light and dark cells,
    // fails here.
    const rows = colourRows(page("theming.mdx"));
    const roles = new Set<string>(colorRoles);

    expect(rows.length).toBeGreaterThanOrEqual(12);

    const mismatched = rows.flatMap((row) => [
      ...(roles.has(row.role) ? [] : [`${row.role}: is not a colour role`]),
      ...(row.light === row.role
        ? []
        : [`${row.role}: the light cell reads ${row.light}`]),
      ...(row.dark === row.role
        ? []
        : [`${row.role}: the dark cell reads ${row.dark}`]),
    ]);

    expect(mismatched).toEqual([]);
    // No literal can return to the light or dark column: the values are the
    // theme's, so there is nothing here to fall behind.
    expect(section(page("theming.mdx"), "Colour roles")).not.toMatch(
      /#[0-9A-Fa-f]{6}/,
    );
  });
});
