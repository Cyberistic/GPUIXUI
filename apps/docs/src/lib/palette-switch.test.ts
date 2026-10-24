import { readFileSync } from "node:fs";
import { platformNames, platformTheme, themes } from "@gpuixui/tokens";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PlatformSwitch } from "../components/docs/platform-toggle";
import { resolvePlatformTheme } from "./platform";
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
    // The gate is the shared read (`react-ready.ts`), over every copy of the
    // group; `react-ready.test.ts` proves the read itself.
    expect(probe).toContain("firstReady(");
    const start = probe.indexOf("const ready = ");
    const end = probe.indexOf("const press = ");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(readyAt).toBeGreaterThan(-1);
    expect(pressAt).toBeGreaterThan(readyAt);
  });

  it("waits for the surface it measures, not only the switch", () => {
    // Bug guarded: the sidebar's group hydrates before the page's previews, and
    // a press in that window updated the group while the page's own hydration
    // render landed afterwards — the surfaces kept the server's palette, so the
    // probe reported "pressing Light left no surface in light mode" against a
    // page a reader could not yet have clicked. Measured on the served build:
    // the first hydration read pressed Light while every surface stayed `dark`,
    // and the same press 250 ms later read `light` on all three.
    const start = probe.indexOf("const ready = ");
    const end = probe.indexOf("const press = ");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const body = probe.slice(start, end);
    expect(body).toContain(".gx-demo[data-mode]");
    const surfacePart = body.slice(body.indexOf("const surface"));
    expect(surfacePart).toContain("propsOfScript");
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

describe("the switch's mount marker", () => {
  it("reports from inside the content boundary, after the page", () => {
    // The marker still sits in the same `Suspense` boundary as the page and
    // after it, so its effect runs once there is a preview to repaint — the
    // state bump is what re-resolves every surface, not a disabled button.
    const view = read("apps/docs/src/lib/docs-view.tsx");
    const start = view.indexOf("<Suspense>");
    const end = view.indexOf("</Suspense>");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const boundary = view.slice(start, end);
    const marker = boundary.indexOf("<ContentMounted />");
    expect(marker).toBeGreaterThan(boundary.indexOf("<SiteContent"));
    expect(marker).toBeGreaterThan(boundary.indexOf("<PackageContent"));
  });

  it("answers every press, at any point after the switch paints", () => {
    const markup = renderToStaticMarkup(
      createElement(PlatformSwitch, {
        mode: "dark",
        platform: "darwin",
        theme: resolvePlatformTheme("darwin", "dark"),
        setMode: () => undefined,
        setPlatform: () => undefined,
      }),
    );

    expect(markup.match(/disabled=""/g) ?? []).toEqual([]);
    expect(markup).toContain("Platform style");
    expect(markup).toContain("Preview palette");
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
