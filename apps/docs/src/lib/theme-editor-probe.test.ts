import { readFileSync } from "node:fs";
import { themes } from "@gpuixui/tokens";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  editorSelector,
  hydrated,
  parseReadout,
  resetSelector,
  storageRefusal,
  typeValue,
} from "../../scripts/theme-editor-probe";
import {
  editableRoles,
  themeFindings,
} from "../components/docs/theme-editor-logic";

/**
 * The theme editor probe's premise, held to the site it presses.
 *
 * `scripts/theme-editor-probe.ts` opens `/docs/themes` in a browser whose
 * `localStorage` throws on every call, edits one colour, reads the audit and
 * presses **Reset**. Its expectation has to be the gate's own answer, not a
 * second copy of it: the probe writes the page's `background` value into
 * `primary`, and the case below asks `themeFindings` whether that edit is the
 * failure the probe expects.
 */

const app = new URL("../../", import.meta.url);
const read = (path: string): string => readFileSync(new URL(path, app), "utf8");
const policy = read("../../docs/preview-strategy.md").replace(/\s+/g, " ");
const page = read("content/docs/themes.mdx").replace(/\s+/g, " ");

describe("the theme editor probe", () => {
  it("expects the finding the gate itself reports for its edit", () => {
    // The probe's edit is `primary` painted in the page's own `background`.
    const findings = themeFindings("light", {
      colors: { primary: themes.light.colors.background },
    });

    expect(findings.length).toBeGreaterThan(0);
    expect(findings.some((finding) => finding.text.includes("primary"))).toBe(
      true,
    );
    expect(editableRoles).toContain("primary");
    expect(editableRoles).toContain("background");
  });

  it("names the controls the editor renders", () => {
    const editor = read("src/components/docs/theme-editor.tsx");

    expect(editor).toContain(`className="${resetSelector.replace(".", "")}"`);
    expect(editor).toContain("aria-label={`${role} value`}");
    expect(editor).toContain("gx-te-audit");
    expect(editor).toContain("data-kind={finding.kind}");
    // The selectors are the page's, not the probe's own invention.
    expect(editorSelector.replace(".", "")).toContain("gx-theme-editor");
    expect(typeValue("primary", "#ffffff")).toContain("input[aria-label=");
  });

  it("refuses every storage call before the page's own scripts run", () => {
    // A refusal installed after load is too late: the editor's mount effect has
    // already read the store by then. The probe passes this as `preload`.
    ["getItem", "setItem", "removeItem"].forEach((call) => {
      expect(storageRefusal).toContain(`Storage.prototype.${call}`);
    });
    expect(storageRefusal).toContain("SecurityError");
    expect(storageRefusal).toContain("__storeAttempts");
    expect(read("scripts/theme-editor-probe.ts")).toContain(
      "preload: storageRefusal",
    );
    expect(read("scripts/chrome-session.ts")).toContain(
      "Page.addScriptToEvaluateOnNewDocument",
    );
  });

  it("waits for React before pressing, and reads the state it wrote", () => {
    expect(hydrated).toContain("__reactProps");
    expect(hydrated).toContain("onClick");
    expect(typeValue("primary", "#000000")).toContain("HTMLInputElement");
    expect(typeValue("primary", "#000000")).toContain("InputEvent");
  });

  it("refuses a readout that is not the shape the probe wrote", () => {
    // A truncated line must not read as an empty page: the assertions compare
    // fields, so a missing one has to fail here rather than compare two blanks.
    expect(Option.isNone(parseReadout('{"primary":"#fff"}'))).toBe(true);
    expect(Option.isNone(parseReadout('{"primary":"#fff"'))).toBe(true);

    const valid = {
      mounted: true,
      background: "#F6F8FA",
      primary: "#2559D6",
      audit: "Passes the library audit",
      findings: 0,
      shared: false,
      attempts: 3,
    };
    expect(Option.isSome(parseReadout(JSON.stringify(valid)))).toBe(true);
  });

  it("teaches the refusal on the page and the policy", () => {
    // The page promises persistence; it has to say what a refused store does,
    // the rule `/docs/theming` already states for the platform switch.
    expect(page).toContain("refuses site storage");
    expect(policy).toContain("theme-editor-probe.ts");
    expect(read("README.md")).toContain("scripts/theme-editor-probe.ts");
  });
});
