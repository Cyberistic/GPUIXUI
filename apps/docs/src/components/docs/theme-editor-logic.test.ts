import { createTheme, themes } from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";
import {
  contrastReport,
  decodeState,
  defaultState,
  editableRoles,
  editsFromTheme,
  formatContrastFailure,
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
});

describe("theme-editor contrast readout", () => {
  it("passes both built-in themes", () => {
    expect(contrastReport("light", defaultState().light)).toEqual([]);
    expect(contrastReport("dark", defaultState().dark)).toEqual([]);
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

    const primary = contrastReport("dark", broken).filter(
      (failure) =>
        failure.foreground === "primaryForeground" &&
        failure.background === "primary",
    );

    expect(primary.map(formatContrastFailure)).toEqual([
      "primaryForeground on primary — 1.00:1 (needs 4.5:1)",
    ]);
  });

  it("reports an unmeasurable pair instead of counting it as passed", () => {
    const edits = defaultState().dark;
    const translucent = {
      ...edits,
      colors: { ...edits.colors, ring: "#00000080" },
    };

    const ring = contrastReport("dark", translucent).filter(
      (failure) => failure.foreground === "ring",
    );

    expect(ring.length).toBeGreaterThan(0);
    expect(ring.every((failure) => failure.ratio === undefined)).toBe(true);
    expect(
      ring
        .map(formatContrastFailure)
        .every((line) => line.includes("unmeasurable")),
    ).toBe(true);
  });
});
