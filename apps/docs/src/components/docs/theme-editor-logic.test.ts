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
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { platformThemes } from "../../lib/platform";
import {
  auditFindings,
  auditReport,
  auditSummary,
  decodeState,
  defaultState,
  editableRoles,
  formatHighlightFailure,
  formatInvalidRole,
  formatInvalidSwitch,
  formatSelectionFailure,
  formatSwitchMetric,
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

    expect(resolved.colors.success).toBe(themes.dark.colors.success);
  });

  it("takes the base theme as the whole of every role the reader did not pin", () => {
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

    expect(
      themeSource({ light: resolveTheme("light", noPins()), dark: resolved }),
    ).toContain("import { createTheme }");
    expect(
      themeSource({ light: resolveTheme("light", noPins()), dark: resolved }),
    ).toContain('ring: "#AABBCC"');
  });

  it("prints the resolved platform values, not only the reader's pins", () => {
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

    const audit = auditTheme(brand);
    expect([...audit.contrast, ...audit.decorative]).toEqual([]);
    expect(audit.passed).toBe(false);
  });

  it("reports a scale that collapses only for a colour-blind reader", () => {
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

    expect(findings).toHaveLength(syntaxSurfaces.length);

    expect(audit.contrast).toEqual([]);
    expect(audit.decorative).toEqual([]);
    expect(audit.indicators).toEqual([]);
    expect(audit.passed).toBe(false);
  });

  it("names the elevation level a shadow cannot lift off, one line per decision", () => {
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

    expect(new Set(lines).size).toBeGreaterThan(levels.length);
  });

  it("reports an elevation shadow the renderer cannot paint, which no colour role covers", () => {
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
    const audit = auditTheme(
      extendTheme(themes.light, {
        typography: {
          body: { lineHeight: 30 },

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
    const lines = invalidColorRoles({ colors: {} }).map(formatInvalidRole);

    expect(lines).toContain("primary — missing from this theme");
    expect(lines.every((line) => !line.includes("undefined"))).toBe(true);
  });

  it("says a selection wash could not be composited, rather than unmeasurable", () => {
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
    const source = readFileSync(
      new URL("./theme-editor-logic.ts", import.meta.url),
      "utf8",
    );
    const reports = Object.keys(auditTheme(themes.light)).filter(
      (key) => key !== "passed",
    );

    expect(reports.filter((key) => !source.includes(`report.${key}`))).toEqual(
      [],
    );
  });

  it("keeps one distinct sentence per report the gate returns", () => {
    const reports = Object.keys(auditTheme(themes.light))
      .filter((key) => key !== "passed")
      .toSorted();

    expect(Object.keys(auditSummary).toSorted()).toEqual(reports);
    expect(new Set(Object.values(auditSummary)).size).toBe(reports.length);
    expect(
      Object.values(auditSummary).filter((sentence) => sentence.trim() === ""),
    ).toEqual([]);
  });
});

describe("the structural edits the gate reports", () => {
  it("passes the shipped themes in both modes, and over every platform style", () => {
    const findings = (["light", "dark"] as const).flatMap((mode) =>
      platformNames.flatMap((platform) =>
        themeFindings(mode, noPins(), platformThemes(platform)[mode], {
          warnings: platform === "default",
        }),
      ),
    );
    const errors = findings.filter((finding) => finding.warning !== true);

    expect(errors).toEqual([]);
    expect(
      findings.filter((finding) => finding.warning === true).length,
    ).toBeGreaterThan(0);
  });

  it("reports a radius an edit raises out of the scale", () => {
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

  it("reports a switch box the theme cannot draw, beside its paint", () => {
    const darwin = platformThemes("darwin").light;
    const boxed = extendTheme(darwin, {
      switchMetrics: { width: 38, height: 22, knob: 30, inset: 1, border: 0 },
    });
    const report = auditTheme(boxed);
    const findings = themeFindings("light", noPins(), boxed).filter(
      (finding) => finding.kind === "switch",
    );

    expect(report.switch.metrics).toEqual([
      { slot: "height", value: 22, rule: "fits", needs: 32 },
    ]);
    expect(report.passed).toBe(false);
    expect(findings.map((finding) => finding.text)).toContain(
      "switch height — 22 cannot hold a knob that needs 32",
    );
  });

  it("words a switch box's unlayable slot and the one a store lost", () => {
    expect(
      formatSwitchMetric({
        slot: "height",
        value: 22,
        rule: "fits",
        needs: 32,
      }),
    ).toBe("switch height — 22 cannot hold a knob that needs 32");
    expect(
      formatSwitchMetric({ slot: "width", value: 0, rule: "positive" }),
    ).toBe(
      "switch width — 0 cannot be laid out (needs a size greater than zero)",
    );
    expect(
      formatSwitchMetric({ slot: "knob", value: undefined, rule: "finite" }),
    ).toBe("switch knob — missing from this theme");
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
    const source = readFileSync(
      new URL("./theme-editor-logic.ts", import.meta.url),
      "utf8",
    );

    expect(source).toContain("report.scales");
    expect(source).toContain("report.switch.paint");
    expect(source).toContain("report.switch.placements");
    expect(source).toContain("report.switch.metrics");
    expect(source).not.toContain("invalidScales(theme)");
    expect(source).not.toContain("switchFailures(theme)");
  });

  it("folds every list the gate returns into a finding", () => {
    const tokensDir = new URL(
      "../../../../../packages/tokens/src/",
      import.meta.url,
    );
    const tokensSource = readdirSync(tokensDir, {
      recursive: true,
      encoding: "utf8",
    })
      .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
      .map((name) => readFileSync(new URL(name, tokensDir), "utf8"))
      .join("\n");
    const source = readFileSync(
      new URL("./theme-editor-logic.ts", import.meta.url),
      "utf8",
    );
    const bodyOf = (name: string): string =>
      tokensSource.split(`export interface ${name} {`)[1]?.split("\n}")[0] ??
      "";
    const fieldsOf = (body: string): ReadonlyArray<string> =>
      [...body.matchAll(/readonly (\w+)[?]?:/g)].flatMap((match) =>
        match[1] === undefined ? [] : [match[1]],
      );

    const auditFields = fieldsOf(bodyOf("ThemeAudit")).filter(
      (field) => field !== "passed",
    );
    const folded = auditFields.flatMap((field) => {
      const declaration =
        bodyOf("ThemeAudit").match(
          new RegExp(`readonly ${field}:\\s*([^;]+);`),
        )?.[1] ?? "";
      if (declaration.includes("[]")) return [`report.${field}`];
      const typeName = declaration.trim().replace(/;$/, "");
      const nested = fieldsOf(bodyOf(typeName));
      return nested.length === 0
        ? [`report.${field}`]
        : nested.map((sub) => `report.${field}.${sub}`);
    });

    expect(auditFields.length).toBeGreaterThanOrEqual(10);
    expect(folded.filter((read) => !source.includes(read))).toEqual([]);
  });
});
