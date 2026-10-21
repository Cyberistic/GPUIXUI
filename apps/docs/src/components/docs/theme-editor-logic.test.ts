import { createTheme, themes } from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";
import {
  decodeState,
  defaultState,
  editableRoles,
  editsFromTheme,
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
