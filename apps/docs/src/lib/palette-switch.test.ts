import { readFileSync } from "node:fs";
import { platformNames, platformTheme, themes } from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";
import {
  expectedBackground,
  parseSurface,
  platformOf,
} from "../../scripts/palette-switch-probe";

/**
 * The palette switch is the one axis a reader uses to see a component in both
 * of the library's themes, so its two halves need holding: the **state** half
 * is covered by `platform.test.ts` (the query parameter, the switch's order and
 * the labels), and the **press** half is React in a browser, which no
 * server-rendered capture proves. `apps/docs/scripts/palette-switch-probe.ts`
 * presses the group in a hydrated page and reads the consequence off the
 * surfaces; this file keeps the probe and the policy from drifting apart, and
 * holds the readout parser the probe's assertions depend on.
 */

const root = new URL("../../../../", import.meta.url);
const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const policy = read("docs/preview-strategy.md");
const probe = read("apps/docs/scripts/palette-switch-probe.ts");

describe("the palette switch's readout", () => {
  it("reads the five fields the probe asserts on", () => {
    expect(
      parseSurface("light|darwin|#F6F8FA|Light|?platform=darwin&mode=light"),
    ).toEqual({
      mode: "light",
      platform: "darwin",
      background: "#F6F8FA",
      pressed: "Light",
      search: "?platform=darwin&mode=light",
    });
  });

  it("refuses a truncated readout instead of guessing a field", () => {
    // A missing field must be absent, not silently defaulted: a parser that
    // read `light` and filled the rest would let a surface that reported
    // nothing pass the mode assertion.
    expect(parseSurface("light|darwin|#F6F8FA")).toBeUndefined();
    expect(parseSurface("")).toBeUndefined();
    expect(parseSurface("none|none||")).toBeUndefined();
  });

  it("accepts only a platform the library names", () => {
    // The expected fill is derived from the surface's own platform, so an
    // unknown value must not resolve to a theme by accident.
    expect(platformNames.filter((name) => platformOf(name) === name)).toEqual([
      ...platformNames,
    ]);
    expect(platformOf("windows")).toBeUndefined();
    expect(platformOf("")).toBeUndefined();
  });

  it("derives the fill from the library, and the two palettes differ", () => {
    const dark = expectedBackground("dark", "darwin");
    const light = expectedBackground("light", "darwin");

    expect(dark).toBe(platformTheme(themes.dark, "darwin").colors.background);
    expect(light).toBe(platformTheme(themes.light, "darwin").colors.background);
    expect(dark).not.toBe(light);
  });
});

describe("the switch's press path", () => {
  it("waits for the button's own handler before it presses", () => {
    // A capture taken while the dev server compiles the route tree found no
    // React fiber at all; the handler is the precondition a press needs.
    const readyAt = probe.indexOf('ready("Light")');
    const pressAt = probe.indexOf('press("Light")');
    expect(probe).toContain("__reactProps");
    expect(probe).toContain("typeof props.onClick");
    expect(readyAt).toBeGreaterThan(-1);
    expect(pressAt).toBeGreaterThan(readyAt);
  });

  it("presses both palettes and reads every surface", () => {
    // One direction would pass on a group that only lights one palette, or on
    // a page whose single preview never re-resolved.
    expect(probe).toContain('press("Dark")');
    expect(probe).toContain('countSurfaces("light")');
    expect(probe).toContain("data-mode");
    expect(probe).toContain("data-platform");
    expect(probe).toContain('includes("mode=light")');
    expect(probe).toContain('includes("mode=dark")');
  });

  it("carries no colour of its own", () => {
    // Every expected fill is derived with `platformTheme`, so a palette edit in
    // the library reaches the probe instead of leaving a stale hex.
    expect(probe).toContain("platformTheme(themes[mode], platform)");
    expect(probe.match(/#[0-9a-fA-F]{6}/g) ?? []).toEqual([]);
  });
});

describe("the policy", () => {
  it("records the measured click, its command and its negative control", () => {
    expect(policy).toContain("### The palette switch is a measured click");
    expect(policy).toContain("nub apps/docs/scripts/palette-switch-probe.ts");
    expect(policy).toContain("__reactProps.onClick");
    // The two measurements a reader can repeat, and the failure that proves
    // the probe is not vacuous.
    expect(policy).toContain("3 of 3 surfaces painted");
    expect(policy).toContain("a preview opened in light, not dark");
  });

  it("names the probe in the site's ledger", () => {
    const ledger = read("apps/docs/README.md");
    expect(ledger).toContain("scripts/palette-switch-probe.ts");
  });
});
