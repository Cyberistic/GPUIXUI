import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Capture } from "./captures";
import { captureCaption } from "./captures";
import { ThemeCaptures, selectThemeCaptures } from "./theme-captures";

/**
 * Guards the curated native captures (plan 433). The failure that matters: an
 * image published without the sidecar the capture run wrote, or a caption
 * assembled from a file name instead of real provenance.
 */

const provenance = {
  platform: "darwin-x64",
  gpuixVersion: "0.10.0",
  commit: "7fd029f",
  command: "nub apps/playground/dist/smoke/run.js --screenshots",
  capturedAt: "2026-10-17T15:47:15.213Z",
};

const proven = (screenshot: string): Capture => ({
  screenshot,
  provenance,
});

describe("theme captures", () => {
  it("selects both frames only when their sidecar proves them", () => {
    const both = selectThemeCaptures(proven);
    expect(both.captures).toHaveLength(2);
    expect(both.missing).toEqual([]);

    const one = selectThemeCaptures((screenshot) =>
      screenshot.endsWith("theme-type-and-shadow.png")
        ? undefined
        : proven(screenshot),
    );
    expect(one.captures.map(({ screenshot }) => screenshot)).toEqual([
      "screenshots/theming/theme-color-roles.png",
    ]);
    expect(one.missing).toEqual([
      "screenshots/theming/theme-type-and-shadow.png",
    ]);
  });

  it("renders both real captures with their real provenance", () => {
    const html = renderToStaticMarkup(<ThemeCaptures />);
    expect(html).toContain("/screenshots/theming/theme-color-roles.png");
    expect(html).toContain("/screenshots/theming/theme-type-and-shadow.png");
    expect(html).toContain(captureCaption(provenance));
    expect(html).not.toContain("No proven capture");
  });

  it("never prints a platform or commit the sidecar does not contain", () => {
    const html = renderToStaticMarkup(<ThemeCaptures />);
    expect(html).not.toContain("win32");
    expect(html).not.toContain("0.5.1");
  });
});
