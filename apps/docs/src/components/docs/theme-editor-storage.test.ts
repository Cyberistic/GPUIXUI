import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { KeyValueStore } from "../../lib/browser-storage";
import { defaultState } from "./theme-editor-logic";
import {
  clearStoredEditorState,
  readStoredEditorState,
  themeStorageKey,
  writeStoredEditorState,
} from "./theme-editor-storage";

/**
 * The editor's half of a remembered preference.
 *
 * `/themes` promises that edits persist to the URL and `localStorage`, and
 * it used to read and write that store directly — inside the mount effect, on
 * every colour keystroke and on **Reset**. A browser with site data blocked
 * throws from all three, so such a reader lost the page to `Something went
 * wrong` — measured on the served build by blocking `Storage.prototype` and
 * navigating to `/themes`. The platform switch already answered a refusal
 * as absence; these cases hold the editor to the same rule.
 */

/** A `Storage` stand-in, so the rule is testable without a browser. */
const memoryStore = (
  entries: ReadonlyArray<readonly [string, string]> = [],
): KeyValueStore & { readonly values: Map<string, string> } => {
  const values = new Map(entries);
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
};

/** A store that refuses every call, the way a blocked one does. */
const refusingStore = (): KeyValueStore => ({
  getItem: () => {
    throw new Error("SecurityError: site data is blocked");
  },
  setItem: () => {
    throw new Error("SecurityError: site data is blocked");
  },
  removeItem: () => {
    throw new Error("SecurityError: site data is blocked");
  },
});

const edited = {
  light: { colors: { primary: "#123456" }, radiusMd: 10 },
  dark: { colors: {} },
} as const;

describe("the theme editor's remembered state", () => {
  it("round-trips the pins a reader made", () => {
    const store = memoryStore();
    writeStoredEditorState(store, edited);

    expect(store.values.get(themeStorageKey)).toBeDefined();
    expect(readStoredEditorState(store)).toEqual(edited);
  });

  it("reads a store with nothing to say as no state, not an empty theme", () => {
    expect(readStoredEditorState(memoryStore())).toBeUndefined();
    expect(readStoredEditorState(undefined)).toBeUndefined();
  });

  it("refuses a stored value this release cannot decode", () => {
    // A value written by an older build must open on the base style rather
    // than half-applying fields the editor no longer has.
    const store = memoryStore([[themeStorageKey, '{"light":{"colors":']]);
    expect(readStoredEditorState(store)).toBeUndefined();
  });

  it("answers every refusal as absence, and never throws", () => {
    const store = refusingStore();

    expect(() => writeStoredEditorState(store, edited)).not.toThrow();
    expect(readStoredEditorState(store)).toBeUndefined();
    expect(() => clearStoredEditorState(store)).not.toThrow();
  });

  it("clears the key Reset is documented to clear", () => {
    const store = memoryStore();
    writeStoredEditorState(store, edited);
    clearStoredEditorState(store);

    expect(store.values.has(themeStorageKey)).toBe(false);
    expect(themeStorageKey).toBe("gpuixui-theme");
  });

  it("is the only route the editor takes to the store or the clipboard", () => {
    // The page reads no `window.localStorage` and calls no
    // `navigator.clipboard`: both capabilities can be refused, and the editor
    // answers a refusal as absence through these two modules.
    const editor = readFileSync(
      new URL("./theme-editor.tsx", import.meta.url),
      "utf8",
    );

    expect(editor).not.toContain("localStorage");
    expect(editor).not.toContain("navigator.clipboard");
    expect(editor).toContain("readStoredEditorState");
    expect(editor).toContain("writeStoredEditorState");
    expect(editor).toContain("clearStoredEditorState");
    expect(editor).toContain("writeClipboard");
    // The default state still comes from the editor's own logic module.
    expect(defaultState().light.colors).toEqual({});
  });
});
