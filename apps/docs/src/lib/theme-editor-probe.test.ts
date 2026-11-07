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

const app = new URL("../../", import.meta.url);
const read = (path: string): string => readFileSync(new URL(path, app), "utf8");
const policy = read("../../docs/preview-strategy.md").replace(/\s+/g, " ");
const page = read("content/docs/themes.mdx").replace(/\s+/g, " ");

describe("the theme editor probe", () => {
  it("expects the finding the gate itself reports for its edit", () => {
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

    expect(editor).toContain(resetSelector.replace(".", ""));
    expect(editor).toContain("aria-label={`${role} value`}");
    expect(editor).toContain("gx-te-audit");
    expect(editor).toContain("data-kind={finding.kind}");

    expect(editorSelector.replace(".", "")).toContain("gx-theme-editor");
    expect(typeValue("primary", "#ffffff")).toContain("input[aria-label=");
  });

  it("refuses every storage call before the page's own scripts run", () => {
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
    expect(page).toContain("refuses site storage");
    expect(policy).toContain("theme-editor-probe.ts");
    expect(read("README.md")).toContain("scripts/theme-editor-probe.ts");
  });
});
