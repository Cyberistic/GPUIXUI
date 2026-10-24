import { readFileSync } from "node:fs";
import { platformNames, platformTheme, themes } from "@gpuixui/tokens";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PlatformSwitch } from "../components/docs/platform-toggle";
import { resolvePlatformTheme } from "./platform";
import {
  earlyPress,
  expectedBackground,
  parseEarlyPress,
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
    const start = probe.indexOf("const ready = ");
    const end = probe.indexOf("const press = ");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    // The handler is not enough any more: the switch is disabled until the
    // content mounts, so a read that ignored the gate would press a button
    // that refuses the click and report that the press did nothing.
    expect(probe.slice(start, end)).toContain("button.disabled");
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
    expect(surfacePart).toContain("__reactProps");
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

describe("the switch's gate", () => {
  const switchMarkup = (contentReady: boolean): string =>
    renderToStaticMarkup(
      createElement(PlatformSwitch, {
        contentReady,
        mode: "dark",
        platform: "darwin",
        theme: resolvePlatformTheme("darwin", "dark"),
        setMode: () => undefined,
        setPlatform: () => undefined,
      }),
    );

  it("refuses every choice until the content it repaints has mounted", () => {
    // Bug guarded: the sidebar hydrates before the page's previews, so a press
    // in that window moved the group and the URL while every surface kept the
    // server's palette and no later render recovered it. The buttons are the
    // only thing a reader can click, so they carry the gate.
    const closed = switchMarkup(false);
    const ready = switchMarkup(true);

    expect(closed.match(/disabled=""/g) ?? []).toHaveLength(6);
    expect(ready.match(/disabled=""/g) ?? []).toEqual([]);
    // The switch is still readable while it waits — a hidden control would be
    // a different answer.
    expect(closed).toContain("Platform style");
    expect(closed).toContain("Preview palette");
  });

  it("reports from inside the content boundary, after the page", () => {
    // The marker is what turns the gate off: it has to sit in the same
    // `Suspense` boundary as the page and after it, so its effect cannot run
    // while the previews are still suspended.
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
});

describe("the early press", () => {
  it("reads the gate, both choices and the address bar", () => {
    expect(
      parseEarlyPress("closed|Dark|Dark|?platform=darwin&mode=dark"),
    ).toEqual({
      gate: "closed",
      before: "Dark",
      after: "Dark",
      search: "?platform=darwin&mode=dark",
    });
    expect(parseEarlyPress("open|Dark|Light|?mode=light")?.after).toBe("Light");
  });

  it("refuses an unreadable gate instead of guessing one", () => {
    // A readout that dropped the gate would let a press that moved the group
    // pass as a refusal, which is the failure the probe exists to catch.
    expect(parseEarlyPress("Dark|Dark|")).toBeUndefined();
    expect(parseEarlyPress("shut|Dark|Dark|")).toBeUndefined();
  });

  it("presses before it waits for React's handler", () => {
    // The press being measured is the one a reader makes on the styled switch
    // before hydration, so it must not be gated behind the handler the probe
    // later waits for.
    expect(earlyPress()).toContain("button.disabled");
    expect(probe.indexOf("earlyPress()")).toBeGreaterThan(-1);
    expect(probe.indexOf("earlyPress()")).toBeLessThan(
      probe.indexOf('ready("Light")'),
    );
    expect(probe).toContain('early.gate === "closed"');
  });

  it("judges the press on the choice and the URL it left", () => {
    // A disabled press that still wrote `mode=light` would be lost, not
    // refused; the probe holds both consequences.
    expect(probe).toContain("refused.before");
    expect(probe).toContain("refused.after");
    expect(probe).toContain('refused.search.includes("mode=light")');
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

  it("records the closed switch and the early press that proves it", () => {
    // A policy that only says the probe waits for the surface would leave the
    // gate a reader experiences unrecorded.
    expect(policy).toContain("closed until");
    expect(policy).toContain("early: the disabled switch refused the press");
    expect(policy).toContain("ContentMounted");
  });

  it("names the probe in the site's ledger", () => {
    const ledger = read("apps/docs/README.md");
    expect(ledger).toContain("scripts/palette-switch-probe.ts");
  });
});
