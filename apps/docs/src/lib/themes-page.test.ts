import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { formatContrastFailure } from "../components/docs/theme-editor-logic";

/**
 * `/docs/themes` teaches the editor's audit.
 *
 * The page described the controls and said nothing about the readout, so the
 * first thing a reader sees after an edit — a line like
 * `mutedForeground on muted — 3.90:1 (needs 4.5:1)`, or the word
 * `unmeasurable` — was left to guesswork. The example is the formatter's own
 * output, not a second copy, so a template change fails the page instead of
 * leaving it teaching a line the editor no longer prints.
 */

const app = new URL("../../", import.meta.url);
const read = (path: string): string => readFileSync(new URL(path, app), "utf8");

const page = read("content/docs/themes.mdx");

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
    // A translucent colour has no fixed contrast, so the formatter answers
    // `unmeasurable` rather than a number; a page that calls that a pass would
    // tell a reader to ship a pair nobody measured.
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
    // A ladder or a shadow is not a colour pair, so the readout carries the
    // report's kind and the page says so.
    expect(page).toContain("report it came from");
    expect(read("src/components/docs/theme-editor.tsx")).toContain(
      "data-kind={finding.kind}",
    );
  });

  it("says what the audit is measured over, and where the edits go", () => {
    // The base is the platform style in the mode on screen, not the built-in
    // identity: a reader who switched to Windows is measured on Windows.
    const editor = read("src/components/docs/theme-editor.tsx");

    expect(page).toContain("platform style");
    expect(page).toContain("per mode");
    expect(editor).toContain("bases[mode]");
    expect(editor).toContain("platformThemes(");
    expect(page).toContain("**Reset**");
    expect(page).toContain("**Copy theme**");
  });
});
