import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  formatContrastFailure,
  formatSwitchMetric,
} from "../components/docs/theme-editor-logic";

const app = new URL("../../", import.meta.url);
const read = (path: string): string => readFileSync(new URL(path, app), "utf8");

const page = read("content/docs/themes.mdx").replace(/\s+/g, " ");

describe("the theme page's audit section", () => {
  it("prints the contrast line the formatter produces", () => {
    const line = formatContrastFailure({
      foreground: "mutedForeground",
      background: "muted",
      ratio: 3.9,
      floor: 4.5,
    });

    expect(line).toBe("mutedForeground on muted — 3.90:1 (needs 4.5:1)");
    expect(page).toContain(line);
  });

  it("teaches the one failure a ratio cannot express", () => {
    const line = formatContrastFailure({
      foreground: "primary",
      background: "card",
      ratio: undefined,
      floor: 4.5,
    });

    expect(line).toContain("unmeasurable");
    expect(page.toLowerCase()).toContain("unmeasurable");
    expect(page).toContain("cannot be computed");
  });

  it("names the report a finding came from", () => {
    expect(page).toContain("report it came from");
    expect(read("src/components/docs/theme-editor.tsx")).toContain(
      "data-kind={finding.kind}",
    );
  });

  it("teaches the switch box a reader cannot draw", () => {
    const fits = formatSwitchMetric({
      slot: "height",
      value: 22,
      rule: "fits",
      needs: 32,
    });
    const unlayable = formatSwitchMetric({
      slot: "width",
      value: 0,
      rule: "positive",
    });

    expect(fits).toBe("switch height — 22 cannot hold a knob that needs 32");
    expect(unlayable).toBe(
      "switch width — 0 cannot be laid out (needs a size greater than zero)",
    );
    expect(page).toContain(fits);
    expect(page).toContain(unlayable);
    expect(page).toContain("platform style");
  });

  it("says what the audit is measured over, and where the edits go", () => {
    const editor = read("src/components/docs/theme-editor.tsx");

    expect(page).toContain("platform style");
    expect(page).toContain("per mode");
    expect(editor).toContain("bases[mode]");
    expect(editor).toContain("platformThemes(");
    expect(page).toContain("**Reset**");
    expect(page).toContain("**Copy theme**");
  });
});
