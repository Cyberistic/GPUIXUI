import { auditTheme, createTheme, extendTheme, themes } from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";
import { platformThemes } from "../../lib/platform";
import {
  auditFindings,
  auditReport,
  decodeState,
  defaultState,
  editableRoles,
  noPins,
  paintsEveryRole,
  parseState,
  resolveTheme,
  themeConfig,
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

    const badHex: EditorState = {
      light: { colors: { primary: "red" } },
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
});
