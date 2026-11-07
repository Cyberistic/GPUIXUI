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

const root = new URL("../../../../", import.meta.url);
const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const policy = read("docs/preview-strategy.md");
const probe = read("apps/docs/scripts/palette-switch-probe.ts");

describe("the palette switch's readout", () => {
  it("reads the four fields the probe asserts on", () => {
    expect(parseSurface("light|darwin|#F6F8FA|Light")).toEqual({
      mode: "light",
      platform: "darwin",
      background: "#F6F8FA",
      pressed: "Light",
    });
  });

  it("refuses a truncated readout instead of guessing a field", () => {
    expect(parseSurface("light|darwin|#F6F8FA")).toBeUndefined();
    expect(parseSurface("")).toBeUndefined();
  });

  it("accepts only a platform the library names", () => {
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
    const readyAt = probe.indexOf('ready("Light")');
    const pressAt = probe.indexOf('press("Light")');

    expect(probe).toContain("firstReady(");
    const start = probe.indexOf("const ready = ");
    const end = probe.indexOf("const press = ");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(readyAt).toBeGreaterThan(-1);
    expect(pressAt).toBeGreaterThan(readyAt);
  });

  it("waits for the surface it measures, not only the switch", () => {
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
    expect(probe).toContain('press("Dark")');
    expect(probe).toContain('countSurfaces("light")');
    expect(probe).toContain("data-mode");
    expect(probe).toContain("data-platform");

    expect(probe).toContain("namesSwitchAxis(");
    expect(probe).toContain("location.search");
  });

  it("carries no colour of its own", () => {
    expect(probe).toContain("platformTheme(themes[mode], platform)");
    expect(probe.match(/#[0-9a-fA-F]{6}/g) ?? []).toEqual([]);
  });
});

describe("the switch's mount marker", () => {
  it("reports from inside the content boundary, after the page", () => {
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

    expect(policy).toContain("3 of 3 surfaces painted");
    expect(policy).toContain("the address bar carries the switch's state");
  });

  it("names the probe in the site's ledger", () => {
    const ledger = read("apps/docs/README.md");
    expect(ledger).toContain("scripts/palette-switch-probe.ts");
  });
});
