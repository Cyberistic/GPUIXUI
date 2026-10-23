import {
  auditTheme,
  createTheme,
  extendTheme,
  invalidColorRoles,
  lightSyntax,
  platformNames,
  selectionFailures,
  syntaxSurfaces,
  targetSize,
  themes,
} from "@gpuixui/tokens";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { platformThemes } from "../../lib/platform";
import {
  auditFindings,
  auditReport,
  decodeState,
  defaultState,
  editableRoles,
  formatHighlightFailure,
  formatInvalidRole,
  formatInvalidSwitch,
  formatSelectionFailure,
  noPins,
  paintsEveryRole,
  parseState,
  resolveTheme,
  themeConfig,
  themeFindings,
  themeSource,
  type EditorState,
  type ThemePins,
} from "./theme-editor-logic";

describe("theme-editor bridge", () => {
  it("resolves edits into a complete theme without dropping non-edited roles", () => {
    const resolved = resolveTheme("dark", {
      colors: { primary: "#123456" },
    });

    expect(resolved.colors.primary).toBe("#123456");
    // Non-edited roles inherit from the base dark theme.
    expect(resolved.colors.success).toBe(themes.dark.colors.success);
  });

  it("takes the base theme as the whole of every role the reader did not pin", () => {
    // The platform switch re-bases the editor, so a pin has to survive a base
    // change and an untouched role has to follow it. If the editor copied the
    // base into its state instead, switching Windows would change nothing.
    const windows = platformThemes("win32");
    const pinned: ThemePins = { colors: { primary: "#123456" } };

    const resolved = resolveTheme("dark", pinned, windows.dark);

    expect(resolved.colors.primary).toBe("#123456");
    expect(resolved.colors.background).toBe(windows.dark.colors.background);
    expect(resolved.colors.background).not.toBe(themes.dark.colors.background);
  });

  it("copied createTheme config reproduces the preview theme", () => {
    const pins: ThemePins = { colors: { ring: "#AABBCC" } };
    const resolved = resolveTheme("dark", pins);
    const copied = createTheme(themeConfig("dark", resolved));

    for (const role of editableRoles) {
      expect(copied.colors[role]).toBe(resolved.colors[role]);
    }
    expect(copied.radius.md).toBe(resolved.radius.md);
    expect(copied.typography.sans).toBe(resolved.typography.sans);

    // The source string is the same config, formatted.
    expect(
      themeSource({ light: resolveTheme("light", noPins()), dark: resolved }),
    ).toContain("import { createTheme }");
    expect(
      themeSource({ light: resolveTheme("light", noPins()), dark: resolved }),
    ).toContain('ring: "#AABBCC"');
  });

  it("prints the resolved platform values, not only the reader's pins", () => {
    // What a reader copies is what they saw. A pinned-only output would emit
    // the library identity for every role the platform painted.
    const windows = platformThemes("win32");
    const source = themeSource({
      light: resolveTheme("light", noPins(), windows.light),
      dark: resolveTheme("dark", noPins(), windows.dark),
    });

    expect(source).toContain(
      `background: ${JSON.stringify(windows.dark.colors.background)}`,
    );
    expect(source).not.toContain(
      `background: ${JSON.stringify(themes.dark.colors.background)}`,
    );
  });
});

describe("theme-editor persistence boundary", () => {
  it("round-trips a valid state, including the empty one Reset writes", () => {
    const state = defaultState();
    expect(parseState(JSON.parse(JSON.stringify(state)))).toEqual(state);

    const pinned: EditorState = {
      light: { colors: { primary: "#123456" }, radiusMd: 6, fontSans: "Inter" },
      dark: { colors: { ring: "#AABBCC" } },
    };
    expect(parseState(JSON.parse(JSON.stringify(pinned)))).toEqual(pinned);
  });

  it("rejects malformed states instead of poisoning the preview", () => {
    expect(parseState(null)).toBeUndefined();
    expect(parseState({ light: { colors: {} } })).toBeUndefined();

    // A five-digit hex is unpaintable under every grammar the package has
    // accepted. A CSS name may be paintable, because the boundary follows
    // `isPaintableColor` rather than carrying a 6/8-digit regex of its own.
    const badHex: EditorState = {
      light: { colors: { primary: "#12345" } },
      dark: { colors: {} },
    };
    expect(parseState(badHex)).toBeUndefined();

    const unknownRole = {
      light: { colors: { notARole: "#123456" } },
      dark: { colors: {} },
    };
    expect(parseState(unknownRole)).toBeUndefined();

    const badRadius = {
      light: { colors: {}, radiusMd: Number.NaN },
      dark: { colors: {} },
    };
    expect(parseState(badRadius)).toBeUndefined();

    const badFont = {
      light: { colors: {}, fontSans: 12 },
      dark: { colors: {} },
    };
    expect(parseState(badFont)).toBeUndefined();
  });

  it("decodes a persisted JSON string, and rejects malformed JSON", () => {
    const state = defaultState();
    expect(decodeState(JSON.stringify(state))).toEqual(state);
    expect(decodeState("not json")).toBeUndefined();
    expect(decodeState('{"light":{}}')).toBeUndefined();
  });

  it.each(editableRoles)(
    "rejects a stored edit that makes %s unpaintable",
    (role) => {
      // The boundary and the audit read one rule, so a stored theme can never
      // carry a value the preview would paint black in silence.
      const pinned: ThemePins = { colors: { [role]: "not-a-colour" } };

      expect(paintsEveryRole("light", pinned)).toBe(false);
      expect(
        parseState({ light: pinned, dark: { colors: {} } }),
      ).toBeUndefined();
    },
  );
});

describe("theme-editor audit readout", () => {
  it("passes both built-in themes", () => {
    expect(auditFindings(auditReport("light", noPins()))).toEqual([]);
    expect(auditFindings(auditReport("dark", noPins()))).toEqual([]);
  });

  it("names a pair an edit breaks, with the measured ratio and the floor", () => {
    const broken: ThemePins = {
      // The label on a primary fill, painted in the fill's own colour.
      colors: { primary: themes.dark.colors.primaryForeground },
    };

    const primary = auditFindings(auditReport("dark", broken)).filter(
      (finding) =>
        finding.kind === "contrast" &&
        finding.text.startsWith("primaryForeground on primary — "),
    );

    expect(primary.map((finding) => finding.text)).toEqual([
      "primaryForeground on primary — 1.00:1 (needs 4.5:1)",
    ]);
  });

  it("reports an unmeasurable pair instead of counting it as passed", () => {
    const translucent: ThemePins = { colors: { ring: "#00000080" } };

    const ring = auditFindings(auditReport("dark", translucent)).filter(
      (finding) =>
        finding.kind === "contrast" && finding.text.startsWith("ring on "),
    );

    expect(ring.length).toBeGreaterThan(0);
    expect(ring.every((finding) => finding.text.includes("unmeasurable"))).toBe(
      true,
    );
  });

  it("reports a divider an edit makes invisible, which no contrast pair covers", () => {
    const broken: ThemePins = {
      colors: { border: themes.light.colors.background },
    };
    const findings = auditFindings(auditReport("light", broken));

    // `border` is a decorative role, not a contrast pair, so only the audit's
    // third report can see this edit.
    expect(findings.filter((finding) => finding.kind === "contrast")).toEqual(
      [],
    );
    expect(
      findings
        .filter((finding) => finding.kind === "decorative")
        .map((finding) => finding.text),
    ).toContain("divider: border on background — 1.00:1 (needs 1.05:1)");
  });

  it("reports a role the renderer cannot paint, instead of painting it black in silence", () => {
    const typo: ThemePins = { colors: { primary: "#12345" } };

    const findings = auditFindings(auditReport("dark", typo)).filter(
      (finding) => finding.kind === "role",
    );

    expect(findings.map((finding) => finding.text)).toEqual([
      'primary — "#12345" is not a colour GPUix can paint',
    ]);
  });

  it("reports a data series an edit breaks, which neither contrast nor decorative sees", () => {
    // The editor does not edit the scale, so this arrives through the theme the
    // audit resolves — a brand theme can carry one. The readout claims the whole
    // audit, so a series line it dropped would make a pass mean less than it says.
    const brand = extendTheme(themes.dark, {
      series: ["#11141A", "#11141A", "#67D4E8", "#6FE0A3", "#FFC94D"],
    });
    const findings = auditFindings(auditTheme(brand)).filter(
      (finding) => finding.kind === "series",
    );

    expect(findings.map((finding) => finding.text)).toEqual(
      expect.arrayContaining([
        "background: series 1 — 1.00:1 (needs 3:1)",
        "series 1 and series 2 — 0.000 apart (needs 0.06)",
      ]),
    );

    // The other two colour reports are silent on the same theme, so only the
    // series line can fail the gate — and it does.
    const audit = auditTheme(brand);
    expect([...audit.contrast, ...audit.decorative]).toEqual([]);
    expect(audit.passed).toBe(false);
  });

  it("reports a scale that collapses only for a colour-blind reader", () => {
    // Contrast and distinctness both assume full colour vision: this red and
    // green read apart to a full-colour reader and 0.029 apart to a deuteranope,
    // so neither of the other two series contracts sees it. The readout claims
    // the whole audit, so the deficiency line has to exist.
    const brand = extendTheme(themes.dark, {
      series: ["#A7A9FF", "#D94B4B", "#3E9E5C", "#FFDE8A", "#FF9E9E"],
    });
    const audit = auditTheme(brand);
    const findings = auditFindings(audit).filter(
      (finding) => finding.kind === "deficiency",
    );

    expect(findings.map((finding) => finding.text)).toEqual([
      "deuteranopia: series 2 and series 3 — 0.029 apart (needs 0.05)",
    ]);

    // Only the deficiency report can see this theme — the swatches clear their
    // plot surfaces and their full-colour distances — and it fails the gate.
    expect([
      ...audit.invalidRoles,
      ...audit.contrast,
      ...audit.decorative,
      ...audit.series.surfaces,
      ...audit.series.distinctness,
    ]).toEqual([]);
    expect(audit.passed).toBe(false);
  });

  it("reports a code token that matches the fill it is read on, which no contrast pair sees", () => {
    // A syntax palette only paints inside a `<code>` host, so no role pair in
    // `contrastFailures` measures it. The editor does not edit the palette, but
    // `background` and `input` are both editable and both are the fills a token
    // is read on — and the readout claims the whole audit.
    const brand = extendTheme(themes.light, {
      syntax: { ...lightSyntax, keyword: themes.light.colors.background },
    });
    const audit = auditTheme(brand);
    const findings = auditFindings(audit).filter(
      (finding) => finding.kind === "syntax",
    );

    expect(findings.map((finding) => finding.text)).toEqual(
      expect.arrayContaining([
        "code keyword on background — 1.00:1 (needs 7:1)",
      ]),
    );
    // Two fills a host can paint, so the one colour is reported twice.
    expect(findings).toHaveLength(syntaxSurfaces.length);

    // Nothing else on this brand fails, so only the syntax line can fail the gate.
    expect(audit.contrast).toEqual([]);
    expect(audit.decorative).toEqual([]);
    expect(audit.indicators).toEqual([]);
    expect(audit.passed).toBe(false);
  });

  it("names the elevation level a shadow cannot lift off, one line per decision", () => {
    // `decorativeFailures` measures every level a surface is raised to, and a
    // card's `sm` lift, a menu's `md` and a dialog's `lg` are three decisions a
    // reader edits separately. A shadow painted the page's own colour cannot
    // separate the surface from the strip it falls on, so the readout must name
    // the level rather than print one line per strip that hides which step it is
    // about.
    const flat = extendTheme(themes.dark, {
      colors: { shadow: themes.dark.colors.background },
    });
    const audit = auditTheme(flat);
    const failed = audit.decorative.filter(
      (failure) => failure.surface === "elevation",
    );
    const levels = Array.from(
      new Set(failed.map((failure) => failure.level)),
    ).filter((level) => level !== undefined);
    // More than one level has a decision to report, so one collapsed line would
    // hide at least one of them.
    expect(levels.length).toBeGreaterThan(1);

    const lines = auditFindings(audit)
      .filter((finding) => finding.kind === "decorative")
      .map((finding) => finding.text)
      .filter((text) => text.startsWith("elevation "));

    expect(lines).toHaveLength(failed.length);
    const unnamed = levels.filter(
      (level) => !lines.some((line) => line.startsWith(`elevation ${level}:`)),
    );
    expect(unnamed, "no line names these levels").toEqual([]);
    // The level is what makes two strips under two levels two lines, not one
    // repeated decision.
    expect(new Set(lines).size).toBeGreaterThan(levels.length);
  });

  it("reports an elevation shadow the renderer cannot paint, which no colour role covers", () => {
    // A level passed in `elevation` replaces the whole array, colours and all —
    // the tint is the caller's then, not the `shadow` role's. The runtime
    // ignores a value it cannot parse, so the level paints no shadow at all.
    const brand = extendTheme(themes.light, {
      elevation: {
        md: [
          {
            offsetX: 0,
            offsetY: 4,
            blurRadius: 12,
            spreadRadius: 0,
            color: "#00000",
          },
        ],
      },
    });
    const audit = auditTheme(brand);
    const findings = auditFindings(audit).filter(
      (finding) => finding.kind === "shadow",
    );

    expect(findings.map((finding) => finding.text)).toEqual([
      'elevation md (shadow 1) — "#00000" is not a colour GPUix can paint',
    ]);
    expect(audit.invalidRoles).toEqual([]);
    expect(audit.passed).toBe(false);
  });

  it("reports a selection wash that buries the text it covers, which no contrast pair measures", () => {
    // `selection` is translucent by design and `contrastRatio` refuses a
    // translucent colour, so no pair in the table ever covered the wash or the
    // text inside it. An opaque wash over the dark page is the case the fifth
    // report exists for: light text on a white selection.
    const brand = extendTheme(themes.dark, {
      colors: { selection: "#FFFFFF" },
    });
    const audit = auditTheme(brand);
    const findings = auditFindings(audit).filter(
      (finding) => finding.kind === "selection",
    );

    expect(findings.map((finding) => finding.text)).toContainEqual(
      expect.stringMatching(
        /^foreground on the selection wash over background — 1\.\d+:1 \(needs 7:1\)$/,
      ),
    );

    // Only the selection report can see this theme, and it fails the gate.
    expect([
      ...audit.invalidRoles,
      ...audit.contrast,
      ...audit.decorative,
      ...audit.series.surfaces,
      ...audit.series.distinctness,
    ]).toEqual([]);
    expect(audit.passed).toBe(false);
  });

  it("reports an indicator mark that vanishes into the strip it is drawn on", () => {
    // A bar, dot or filled slider span is neither text nor a boundary, so no
    // contrast pair covers it — `primary` was only ever measured against its own
    // on-colour. This brand paints the page's own colour as its action mark, so
    // a progress bar disappears; only `indicatorFailures` words that as a mark.
    const brand = extendTheme(themes.dark, {
      colors: { primary: themes.dark.colors.background },
    });
    const audit = auditTheme(brand);
    const findings = auditFindings(audit).filter(
      (finding) => finding.kind === "indicator",
    );

    expect(findings.map((finding) => finding.text)).toContain(
      "mark primary on background — 1.00:1 (needs 3:1)",
    );
    expect(audit.passed).toBe(false);
  });

  it("reports a number the renderer cannot lay out, which no colour report sees", () => {
    // A style batch crosses a JSON boundary on its way to native, so `NaN`
    // arrives as `null` and the property is dropped: the theme paints, just not
    // the one the reader described. Only the number report can see it.
    const audit = auditTheme(
      extendTheme(themes.dark, { radius: { md: Number.NaN } }),
    );
    const findings = auditFindings(audit).filter(
      (finding) => finding.kind === "number",
    );

    expect(findings.map((finding) => finding.text)).toEqual([
      "radius md — NaN cannot be laid out (needs a length of zero or more)",
    ]);
    expect([
      ...audit.invalidRoles,
      ...audit.invalidShadows,
      ...audit.contrast,
      ...audit.decorative,
      ...audit.selection,
      ...audit.indicators,
      ...audit.disabledFade,
    ]).toEqual([]);
    expect(audit.passed).toBe(false);
  });

  it("words a control height that misses the press floor", () => {
    // A control height is also the box a pointer presses, so it is held to the
    // target floor. The editor's readout has to say that in the reader's terms,
    // not print the rule's name.
    const density = themes.dark.density;
    const audit = auditTheme(
      extendTheme(themes.dark, {
        density: { controlHeight: { ...density.controlHeight, md: 20 } },
      }),
    );
    const findings = auditFindings(audit).filter(
      (finding) => finding.kind === "number",
    );

    expect(findings.map((finding) => finding.text)).toEqual([
      `density controlHeight.md — 20 cannot be laid out (needs a pressable height of ${targetSize.minimum} or more)`,
    ]);
    expect(audit.contrast).toEqual([]);
    expect(audit.passed).toBe(false);
  });

  it("words a control height too short for the label it carries", () => {
    // A control's box is exactly its control height and its label is laid at the
    // type role's leading, so a height that a pointer can press but the label
    // cannot fit clips the text. It is a second question from the press floor:
    // the editor must tell a reader which one the height failed.
    const audit = auditTheme(
      extendTheme(themes.light, {
        typography: {
          body: { lineHeight: 30 },
          // `bodyStrong` shares the body's leading, so raising one alone also
          // reports `emphasis`; this case is the fit rule alone.
          bodyStrong: { lineHeight: 30 },
        },
      }),
    );
    const findings = auditFindings(audit).filter(
      (finding) => finding.kind === "number",
    );

    expect(findings.map((finding) => finding.text)).toEqual([
      "density controlHeight.sm — 28 cannot be laid out (needs a height that contains the tallest label or icon it carries)",
    ]);
    expect(audit.passed).toBe(false);
  });

  it("words a control height too short for the glyph it draws", () => {
    // The same box is the glyph a square action carries: an `Icon` defaults to
    // `iconSize.md` and an `IconButton` is a square at its control height, so a
    // 26px icon in `compact`'s 24px `sm` control overflows while the label still
    // fits. That is the fit rule's other half, and the readout must say a
    // control carries more than text.
    const audit = auditTheme(
      extendTheme(themes.light, {
        density: "compact",
        iconSize: { md: 26, lg: 28, xl: 30 },
      }),
    );
    const findings = auditFindings(audit).filter(
      (finding) => finding.kind === "number",
    );

    expect(findings.map((finding) => finding.text)).toEqual([
      "density controlHeight.sm — 24 cannot be laid out (needs a height that contains the tallest label or icon it carries)",
    ]);
    expect(audit.contrast).toEqual([]);
    expect(audit.passed).toBe(false);
  });

  it("words a leading that sits inside its own type", () => {
    // The one number rule about two tokens: a line height shorter than its font
    // size stacks the next baseline inside this line's glyphs. The reader is told
    // what the pair has to be, not the rule's name.
    const audit = auditTheme(
      extendTheme(themes.light, { typography: { body: { lineHeight: 12 } } }),
    );
    const findings = auditFindings(audit).filter(
      (finding) => finding.kind === "number",
    );

    expect(findings.map((finding) => finding.text)).toEqual([
      "typography body.lineHeight — 12 cannot be laid out (needs a line height at least its own font size)",
    ]);
    expect(audit.passed).toBe(false);
  });

  it("words an emphasis that weighs the same as the body it lifts", () => {
    // `bodyStrong` shares `body`'s size and leading by design, so the weight is
    // the whole difference between reading and emphasis. A brand that forwards
    // one stored weight to every role keeps every number usable while the
    // emphasis paints exactly like the text it was meant to lift; the readout
    // must say which pair, not print the rule's name.
    const audit = auditTheme(
      extendTheme(themes.light, {
        typography: {
          bodyStrong: { fontWeight: themes.light.typography.body.fontWeight },
        },
      }),
    );
    const findings = auditFindings(audit).filter(
      (finding) => finding.kind === "number",
    );

    expect(findings.map((finding) => finding.text)).toEqual([
      `typography bodyStrong.fontWeight — ${String(themes.light.typography.body.fontWeight)} cannot be laid out (needs the size and leading the body text sets, and a weight that exceeds it)`,
    ]);
    expect(audit.passed).toBe(false);
  });

  it("words an emphasis whose size drifted from the body's", () => {
    // The same rule holds the pair to one measure, so a brand that raises only
    // `body`'s size reports `bodyStrong.fontSize` — a paragraph one step larger
    // than the title above it. The sentence must name the shared measure the
    // size missed rather than the weight, which this brand leaves correct.
    const audit = auditTheme(
      extendTheme(themes.light, {
        typography: {
          body: { fontSize: themes.light.typography.body.fontSize + 1 },
        },
      }),
    );
    const findings = auditFindings(audit).filter(
      (finding) => finding.kind === "number",
    );

    expect(findings.map((finding) => finding.text)).toEqual([
      `typography bodyStrong.fontSize — ${String(themes.light.typography.bodyStrong.fontSize)} cannot be laid out (needs the size and leading the body text sets, and a weight that exceeds it)`,
    ]);
    expect(audit.passed).toBe(false);
  });

  it("reports a faded label the disabled state erases, which the enabled pair passes", () => {
    // `primaryForeground` on `primary` clears 4.5:1 enabled, so the contrast
    // table is silent; `disabledOpacity` composites the label into its own faded
    // fill at 1.04:1, and only the fade report can see that.
    const brand = extendTheme(themes.light, {
      colors: { primary: "#101010", primaryForeground: "#7E7E7E" },
    });
    const audit = auditTheme(brand);
    const findings = auditFindings(audit).filter(
      (finding) => finding.kind === "disabled",
    );

    expect(findings.map((finding) => finding.text)).toContain(
      "primary disabled on background — 1.04:1 (needs 1.5:1)",
    );
    expect(audit.contrast).toEqual([]);
    expect(audit.indicators).toEqual([]);
    expect(audit.passed).toBe(false);
  });

  it("reports a control the keyboard dim erases while another control has focus", () => {
    // The runtime paints every other focusable at 40% while one holds keyboard
    // focus, so a filled action's label composites into its own dimmed fill.
    // The audit gained that tenth report, and the readout read nine: a reader
    // whose action vanished while Tab was elsewhere still saw a passing line.
    const brand = extendTheme(themes.light, {
      colors: {
        primary: themes.light.colors.background,
        primaryForeground: themes.light.colors.background,
      },
    });
    const audit = auditTheme(brand);
    const findings = auditFindings(audit).filter(
      (finding) => finding.kind === "dim",
    );

    expect(findings.map((finding) => finding.text)).toContain(
      "primary dimmed on background — 1.00:1 (needs 1.05:1)",
    );
    expect(audit.keyboardDim.length).toBeGreaterThan(0);
    expect(audit.passed).toBe(false);
  });

  it("reports a wash the reader cannot find at all", () => {
    // A selection at zero opacity paints the surface itself: the reader cannot
    // see what they selected, and the body floor never comes into it.
    const brand = extendTheme(themes.dark, {
      colors: { selection: "#00000000" },
    });
    const findings = auditFindings(auditTheme(brand)).filter(
      (finding) => finding.kind === "selection",
    );

    expect(findings.map((finding) => finding.text)).toContain(
      "selection wash over background — 1.00:1 (needs 1.05:1)",
    );
  });

  it("calls an absent role missing instead of quoting an undefined value", () => {
    // A theme restored from storage can predate a role the library added. The
    // report carries `value: undefined`, and the readout printed
    // `primary — undefined is not a colour GPUix can paint` — which reads as a
    // typo in a value rather than a theme that needs the newer package.
    const lines = invalidColorRoles({ colors: {} }).map(formatInvalidRole);

    expect(lines).toContain("primary — missing from this theme");
    expect(lines.every((line) => !line.includes("undefined"))).toBe(true);
  });

  it("says a selection wash could not be composited, rather than unmeasurable", () => {
    // `selectionFailures` blends the wash over each surface before measuring it,
    // so a theme without the role has no ratio to report at all. "Unmeasurable"
    // is the sentence for a value whose contrast depends on what is behind it;
    // this is a value that is not there.
    const { selection: _drop, ...colors } = themes.dark.colors;
    const lines = selectionFailures({ colors }).map(formatSelectionFailure);

    expect(lines).toContain(
      "selection wash over input — could not be composited (needs 1.05:1)",
    );
    expect(lines).toContain(
      "foreground on the selection wash over background — could not be composited (needs 7:1)",
    );
    expect(lines.every((line) => !line.includes("unmeasurable"))).toBe(true);
  });

  it("describes the number of reports the gate actually returns", () => {
    // The fold said `auditTheme` "reads all nine in one call" after `syntax`
    // and `keyboardDim` had joined the gate, so the editor's own summary told a
    // maintainer that two reports were shown somewhere else. The count is read
    // from the gate, not printed, and every report it returns is flattened by
    // the readout.
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
    ];
    const source = readFileSync(
      new URL("./theme-editor-logic.ts", import.meta.url),
      "utf8",
    );
    const reports = Object.keys(auditTheme(themes.light)).filter(
      (key) => key !== "passed",
    );

    expect(source).toContain(`reads all ${words[reports.length]} in one`);
    expect(source).toContain(
      `Which of the audit's ${words[reports.length]} reports`,
    );
    expect(reports.filter((key) => !source.includes(`report.${key}`))).toEqual(
      [],
    );
  });
});

describe("the structural edits the gate reports", () => {
  it("passes the shipped themes in both modes, and over every platform style", () => {
    // The readout prints the gate's findings before a reader touches anything, so
    // a false positive here would put a permanent red line on a shipped theme.
    const findings = (["light", "dark"] as const).flatMap((mode) => [
      ...auditFindings(auditTheme(themes[mode])),
      ...platformNames.flatMap((platform) =>
        auditFindings(auditTheme(platformThemes(platform)[mode])),
      ),
    ]);

    expect(findings).toEqual([]);
  });

  it("reports a radius an edit raises out of the scale", () => {
    // The editor exposes `radius.md`, so this is an edit a reader can make: 12
    // makes `md` larger than the `lg` above it, and a dialog asking for `lg`
    // then paints a smaller corner than a card asking for `md`.
    const findings = themeFindings("light", {
      colors: {},
      radiusMd: 12,
    });

    expect(findings.map((finding) => finding.text)).toEqual([
      "radius lg — 8 does not exceed md at 12",
    ]);
    expect(findings[0]?.kind).toBe("scale");
  });

  it("reports a find wash an edit paints invisible", () => {
    // A `primary` equal to its own card is a match nobody sees, and it reaches
    // the reader from the gate rather than a section of its own.
    const findings = themeFindings("light", {
      colors: { primary: themes.light.colors.card },
    });
    const highlight = findings.filter(
      (finding) => finding.kind === "highlight",
    );

    expect(highlight.map((finding) => finding.text)).toContain(
      "find match on card — 1.00:1 (needs 1.05:1)",
    );
    expect(highlight.length).toBeGreaterThan(0);
  });

  it("reports a declared switch an edit hides on the strip it stands on", () => {
    // A platform style's three switch colours enter the theme through no role.
    // The macOS light track is Apple's green; painting the card that same green
    // leaves a switch nobody can find.
    const findings = themeFindings(
      "light",
      { colors: { card: "#34C759" } },
      platformThemes("darwin").light,
    );
    const toggle = findings.filter((finding) => finding.kind === "switch");

    expect(toggle.map((finding) => finding.text)).toContain(
      "switch on on card — 1.00:1 (needs 1.05:1)",
    );
  });

  it("words a switch value by slot, and an absent slot as missing", () => {
    expect(formatInvalidSwitch({ slot: "off", value: "#E9E9E" })).toBe(
      'switch off — "#E9E9E" is not a colour GPUix can paint',
    );
    expect(formatInvalidSwitch({ slot: "off", value: undefined })).toBe(
      "switch off — missing from this theme",
    );
  });

  it("words the three jobs a find wash has to do", () => {
    const wash = "#A7A9FF4D";

    expect(
      formatHighlightFailure({
        kind: "visibility",
        state: "match",
        surface: "card",
        wash,
        ratio: 1.01,
        floor: 1.05,
      }),
    ).toBe("find match on card — 1.01:1 (needs 1.05:1)");
    expect(
      formatHighlightFailure({
        kind: "legibility",
        state: "active",
        surface: "muted",
        wash,
        ratio: 2.72,
        floor: 7,
      }),
    ).toBe(
      "foreground on the find active wash over muted — 2.72:1 (needs 7:1)",
    );
    expect(
      formatHighlightFailure({
        kind: "distinct",
        state: "active",
        surface: "card",
        wash,
        ratio: 1.02,
        floor: 1.05,
      }),
    ).toBe("find active and match on card — 1.02:1 apart (needs 1.05:1)");
    expect(
      formatHighlightFailure({
        kind: "visibility",
        state: "match",
        surface: "popover",
        wash: undefined,
        ratio: undefined,
        floor: 1.05,
      }),
    ).toBe("find match on popover — could not be composited (needs 1.05:1)");
  });

  it("reads the structural reports from the gate, not from a second call", () => {
    // The scale order and a declared switch used to be public functions the
    // readout called *beside* `auditTheme`, which meant a consumer running the
    // gate alone shipped a theme the editor flagged. Both are gate keys now, and
    // the readout must take them from that one call: recomputing either here
    // would let the shipped gate and the editor's copy disagree.
    const source = readFileSync(
      new URL("./theme-editor-logic.ts", import.meta.url),
      "utf8",
    );

    // The switch report has two halves, and a readout that printed only the
    // paint would pass a track nobody can find.
    expect(source).toContain("report.scales");
    expect(source).toContain("report.switch.paint");
    expect(source).toContain("report.switch.placements");
    expect(source).not.toContain("invalidScales(theme)");
    expect(source).not.toContain("switchFailures(theme)");
  });
});
