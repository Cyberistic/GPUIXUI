import { auditTheme, createTheme, extendTheme, themes } from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";
import {
  auditFindings,
  auditReport,
  decodeState,
  defaultState,
  editableRoles,
  editsFromTheme,
  paintsEveryRole,
  parseState,
  resolveTheme,
  themeConfig,
  themeSource,
  type EditorState,
} from "./theme-editor-logic";

describe("theme-editor bridge", () => {
  it("resolves edits into a complete theme without dropping non-edited roles", () => {
    const edits = editsFromTheme(themes.dark);
    const edited = {
      ...edits,
      colors: { ...edits.colors, primary: "#123456" },
    };
    const resolved = resolveTheme("dark", edited);

    expect(resolved.colors.primary).toBe("#123456");
    // Non-edited roles inherit from the base dark theme.
    expect(resolved.colors.success).toBe(themes.dark.colors.success);
  });

  it("copied createTheme config reproduces the preview theme", () => {
    const edits = editsFromTheme(themes.dark);
    const edited = { ...edits, colors: { ...edits.colors, ring: "#AABBCC" } };

    const resolved = resolveTheme("dark", edited);
    const copied = createTheme(themeConfig("dark", edited));

    for (const role of editableRoles) {
      expect(copied.colors[role]).toBe(resolved.colors[role]);
    }
    expect(copied.radius.md).toBe(resolved.radius.md);
    expect(copied.typography.sans).toBe(resolved.typography.sans);

    // The source string is the same config, formatted.
    expect(themeSource(defaultState())).toContain("import { createTheme }");
    expect(themeSource({ ...defaultState(), dark: edited })).toContain(
      'ring: "#AABBCC"',
    );
  });
});

describe("theme-editor persistence boundary", () => {
  it("round-trips a valid state", () => {
    const state = defaultState();
    expect(parseState(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });

  it("rejects malformed states instead of poisoning the preview", () => {
    expect(parseState(null)).toBeUndefined();
    expect(parseState({ light: {}, dark: {} })).toBeUndefined();

    const badHex = {
      ...defaultState(),
      light: {
        ...defaultState().light,
        colors: { ...defaultState().light.colors, primary: "red" },
      },
    } satisfies EditorState;
    expect(parseState(badHex)).toBeUndefined();

    const missingRole = {
      ...defaultState(),
      dark: { ...defaultState().dark, radiusMd: Number.NaN },
    };
    expect(parseState(missingRole)).toBeUndefined();
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
      const base = defaultState();
      const candidate: EditorState = {
        ...base,
        light: {
          ...base.light,
          colors: { ...base.light.colors, [role]: "not-a-colour" },
        },
      };

      expect(paintsEveryRole("light", candidate.light)).toBe(false);
      expect(parseState(candidate)).toBeUndefined();
    },
  );
});

describe("theme-editor audit readout", () => {
  it("passes both built-in themes", () => {
    expect(auditFindings(auditReport("light", defaultState().light))).toEqual(
      [],
    );
    expect(auditFindings(auditReport("dark", defaultState().dark))).toEqual([]);
  });

  it("names a pair an edit breaks, with the measured ratio and the floor", () => {
    const edits = defaultState().dark;
    const broken = {
      ...edits,
      colors: {
        ...edits.colors,
        // The label on a primary fill, painted in the fill's own colour.
        primary: themes.dark.colors.primaryForeground,
      },
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
    const edits = defaultState().dark;
    const translucent = {
      ...edits,
      colors: { ...edits.colors, ring: "#00000080" },
    };

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
    const edits = defaultState().light;
    const broken = {
      ...edits,
      colors: { ...edits.colors, border: themes.light.colors.background },
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
    const edits = defaultState().dark;
    const typo = { ...edits, colors: { ...edits.colors, primary: "#12345" } };

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
