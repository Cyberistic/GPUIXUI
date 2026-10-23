import { readFileSync } from "node:fs";
import { platformTheme, themes } from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";
import {
  chromeBackground,
  expectedBackground,
  parsePreview,
  parseReadout,
  samePreviews,
} from "../../scripts/docs-theme-probe";

/**
 * The docs chrome has a light/dark switch of its own, separate from the
 * previews' `?mode=` axis: the chrome's palette is declared in `app.css` while a
 * preview paints the library's theme. `docs-theme.test.ts` measures both
 * schemes' contrast; this file holds the **press** half — the probe that moves
 * `<html>` from one scheme to the other and requires every preview to stay put —
 * and the values it asserts against.
 */

const root = new URL("../../../../", import.meta.url);
const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const policy = read("docs/preview-strategy.md");
const probe = read("apps/docs/scripts/docs-theme-probe.ts");

const preview = (
  mode: string,
  platform: string,
  background: string,
): { mode: string; platform: string; background: string } => ({
  mode,
  platform,
  background,
});

describe("the docs theme's readout", () => {
  it("reads the chrome, the remembered choice and every preview", () => {
    expect(
      parseReadout(
        "light|#ffffff|light|dark:darwin:#11141A,dark:win32:#11141A",
      ),
    ).toEqual({
      scheme: "light",
      chrome: "#ffffff",
      stored: "light",
      previews: [
        preview("dark", "darwin", "#11141A"),
        preview("dark", "win32", "#11141A"),
      ],
    });
  });

  it("reads a page with no preview as no preview, not one empty entry", () => {
    // `"".split(",")` is `[""]`, which would count as a painted surface and let
    // a page that mounts none pass the "every preview stayed" comparison.
    expect(parseReadout("dark|#0a0a0a|dark|")?.previews).toEqual([]);
  });

  it("refuses a truncated or unknown readout instead of guessing", () => {
    expect(parseReadout("light|#ffffff|light")).toBeUndefined();
    expect(parseReadout("")).toBeUndefined();
    expect(
      parseReadout("dim|#ffffff|light|dark:darwin:#11141A"),
    ).toBeUndefined();
  });

  it("refuses a preview entry it cannot read whole", () => {
    // Dropping the unreadable half would compare a shorter list against the
    // opening read and report a preview that moved when the page only failed to
    // paint its platform attribute.
    expect(parsePreview("dark:darwin")).toBeUndefined();
    expect(
      parseReadout("light|#ffffff|light|dark:darwin:#11141A,dark"),
    ).toBeUndefined();
  });
});

describe("the previews comparison", () => {
  it("compares the three fields, not the objects' address", () => {
    const first = preview("dark", "darwin", "#11141A");
    const second = preview("dark", "darwin", "#11141A");
    const moved = preview("light", "darwin", "#FFFFFF");

    expect(samePreviews([first], [second])).toBe(true);
    expect(samePreviews([first], [moved])).toBe(false);
    expect(samePreviews([first], [])).toBe(false);
  });

  it("reads a different platform as a moved preview", () => {
    // The platform switch and the docs theme switch are two axes: a preview
    // that kept its fill but re-resolved its platform would mean the docs
    // theme press leaked into the library's choice.
    expect(
      samePreviews(
        [preview("dark", "darwin", "#11141A")],
        [preview("dark", "win32", "#11141A")],
      ),
    ).toBe(false);
  });
});

describe("the chrome's fills", () => {
  it("are the sheet's own declared values, and the two schemes differ", () => {
    const light = chromeBackground("light");
    const dark = chromeBackground("dark");

    expect(light).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(dark).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(light).not.toBe(dark);
  });

  it("reads the sheet rather than carrying a copy", () => {
    // The probe must not hold a hex of its own: a palette edit in `app.css` has
    // to move what the press asserts, or the guard measures a previous scheme.
    const literals = probe.match(/#[0-9a-fA-F]{6}/g) ?? [];
    expect(literals).toEqual([]);
    expect(probe).toContain("app.css");
    expect(probe).toContain("readFileSync");
  });

  it("derives a preview's fill from the library palette, not from the docs sheet", () => {
    // The two palettes are the point of the probe: a preview is held to the
    // library's `background` role for the mode and platform it reports.
    expect(expectedBackground("dark", "darwin")).toBe(
      platformTheme(themes.dark, "darwin").colors.background,
    );
    expect(expectedBackground("light", "darwin")).not.toBe(
      expectedBackground("dark", "darwin"),
    );
  });
});

describe("the press path", () => {
  it("waits for the toggle's handler before it presses", () => {
    const readyAt = probe.indexOf("session.page.text(ready)");
    const pressAt = probe.indexOf("session.page.text(press)");
    expect(probe).toContain("__reactProps");
    expect(probe).toContain("typeof props.onClick");
    expect(probe).toContain("[data-theme-toggle]");
    expect(readyAt).toBeGreaterThan(-1);
    expect(pressAt).toBeGreaterThan(readyAt);
  });

  it("presses both directions and holds every preview still", () => {
    // One press would pass on a toggle that only ever darkens, and reading the
    // chrome alone would pass while a preview followed it — the separation the
    // policy promises.
    expect(probe.match(/session\.page\.text\(press\)/g)).toHaveLength(2);
    expect(probe).toContain(".gx-demo[data-mode]");
    expect(probe).toContain("a preview followed the docs theme");
    expect(probe).toContain("the chrome did not return to");
  });

  it("holds the remembered choice to the scheme the chrome paints", () => {
    expect(probe).toContain('localStorage.getItem("theme")');
    expect(probe).toContain("remembered");
  });

  it("compares the settled previews with the same-fields rule", () => {
    // The previews are objects; `join(",")` reads `[object Object]` for every
    // entry, so a page whose previews all moved could pass the comparison.
    expect(probe).toContain("samePreviews(next.previews, opening.previews)");
    expect(probe).not.toContain("previews.join");
  });
});

describe("the policy", () => {
  it("records the press, its command and the separation it proves", () => {
    expect(policy).toContain("### The docs theme switch is a measured click");
    expect(policy).toContain("nub apps/docs/scripts/docs-theme-probe.ts");
    expect(policy).toContain("[data-theme-toggle]");
    expect(policy).toContain("does not follow the docs chrome's theme");
    expect(policy).toContain("FAIL a preview followed the docs theme");
  });

  it("names the probe in the site's ledger", () => {
    expect(read("apps/docs/README.md")).toContain(
      "scripts/docs-theme-probe.ts",
    );
  });
});
