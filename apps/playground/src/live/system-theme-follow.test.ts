/**
 * Holds the system-palette follow the `system-theme-follow` probe drives, and
 * the claims its README section prints.
 *
 * The probe's subject is the half `@gpuixui/tokens` cannot measure by itself:
 * `paletteToTokens` is pure and `watchSystemTheme`'s poll is arithmetic, but
 * "the window repaints and keeps its tree" is a paint claim. The fixture below
 * derives every expected colour from the same mapping the view applies, so a
 * palette or mapper change cannot leave the probe asserting an old colour, and
 * the state the poll reads is driven through its own setters here.
 *
 * `node:fs` is deliberate, as in `registry.test.ts`: this checks the
 * repository's own probe and prose, not a runtime path.
 */
import { readFileSync } from "node:fs";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  BASE_PAGE,
  BASE_SWATCH,
  NIGHT_PAGE,
  NIGHT_SWATCH,
  PAPER_PAGE,
  PAPER_SWATCH,
  PROBE_BOX,
  SWATCH_BOX,
  SYSTEM_THEME_CHECKS,
  SYSTEM_THEME_POLL_MS,
  baseTheme,
  clearSystemPalette,
  followedTheme,
  mountCount,
  nightPalette,
  pageOf,
  paperPalette,
  readSystemPalette,
  recordMount,
  resetSystemPalette,
  setSystemPalette,
  swatchOf,
  swatchPoint,
  pagePoint,
} from "./system-theme.js";
import { liveRegistry } from "./registry.js";

const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);

const scenarios = readFileSync(
  new URL("./scenarios.tsx", import.meta.url),
  "utf8",
);

/** The `systemThemeSteps` effect, bounded by the first declaration after it. */
const steps = (() => {
  const start = scenarios.indexOf("const systemThemeSteps");
  if (start === -1) return "";
  const after = [
    scenarios.indexOf("\nconst ", start + 1),
    scenarios.indexOf("\nexport const ", start + 1),
    scenarios.indexOf("\n/** The bodies", start + 1),
  ].filter((end) => end > start);
  return scenarios.slice(
    start,
    after.length === 0 ? scenarios.length : Math.min(...after),
  );
})();

describe("the palette the probe follows", () => {
  it("maps each desktop theme to the page and accent the view paints", () => {
    // Derived through the mapping the window applies, so this is the fixture's
    // guarantee and not a second table of hexes.
    expect(followedTheme(nightPalette).colors.background).toBe("#1B1B1F");
    expect(followedTheme(nightPalette).colors.primary).toBe("#B49CFF");
    expect(followedTheme(paperPalette).colors.background).toBe("#F4F1EA");
    expect(followedTheme(paperPalette).colors.primary).toBe("#6A45F0");
    expect(NIGHT_PAGE).toBe("#1B1B1F");
    expect(PAPER_PAGE).toBe("#F4F1EA");
    expect(NIGHT_SWATCH).toBe("#B49CFF");
    expect(PAPER_SWATCH).toBe("#6A45F0");
  });

  it("paints two themes a reader can tell apart", () => {
    expect(NIGHT_PAGE).not.toBe(PAPER_PAGE);
    expect(NIGHT_SWATCH).not.toBe(PAPER_SWATCH);
  });

  it("returns to the application's own theme when there is no palette", () => {
    // The deleted-file case: the base theme the probe mounts with, not a
    // built-in guessed from the empty palette.
    expect(BASE_PAGE).toBe(baseTheme.colors.background);
    expect(BASE_SWATCH).toBe(baseTheme.colors.primary);
    expect(pageOf(Option.none())).toBe(baseTheme.colors.background);
    expect(swatchOf(Option.none())).toBe(baseTheme.colors.primary);
    expect(pageOf(Option.some(nightPalette))).toBe(NIGHT_PAGE);
    expect(swatchOf(Option.some(paperPalette))).toBe(PAPER_SWATCH);
  });
});

describe("the desktop the poll reads", () => {
  it("hands over what the steps last wrote, and nothing after a delete", () => {
    resetSystemPalette();
    expect(readSystemPalette()).toBe(nightPalette);
    setSystemPalette(paperPalette);
    expect(readSystemPalette()).toBe(paperPalette);
    clearSystemPalette();
    expect(readSystemPalette()).toBeUndefined();
    resetSystemPalette();
    expect(readSystemPalette()).toBe(nightPalette);
  });

  it("polls faster than a reader can mistake the run for a restart", () => {
    // The window's check is "the same window after a change", so the interval
    // must be short enough that a settle poll sees the change; the seam's own
    // documented poll is seconds because a desktop theme changes by hand.
    expect(SYSTEM_THEME_POLL_MS).toBeGreaterThan(0);
    expect(SYSTEM_THEME_POLL_MS).toBeLessThanOrEqual(50);
  });
});

describe("the mount count", () => {
  it("counts one per recordMount, not one per render", () => {
    const first = recordMount();
    expect(mountCount()).toBe(first);
    expect(recordMount()).toBe(first + 1);
    expect(mountCount()).toBe(first + 1);
  });
});

describe("the sample points", () => {
  it("sits the accent sample in the swatch and the page sample outside it", () => {
    expect(swatchPoint.x).toBeGreaterThan(SWATCH_BOX.x);
    expect(swatchPoint.x).toBeLessThan(SWATCH_BOX.x + SWATCH_BOX.width);
    expect(swatchPoint.y).toBeGreaterThan(SWATCH_BOX.y);
    expect(swatchPoint.y).toBeLessThan(SWATCH_BOX.y + SWATCH_BOX.height);
    expect(pagePoint.x).toBeGreaterThan(SWATCH_BOX.x + SWATCH_BOX.width);
    expect(pagePoint.y).toBeGreaterThan(SWATCH_BOX.y + SWATCH_BOX.height);
    expect(pagePoint.x).toBeLessThan(PROBE_BOX.width);
    expect(pagePoint.y).toBeLessThan(PROBE_BOX.height);
  });
});

describe("the system-theme probe's record", () => {
  it("registers the probe and its capability", () => {
    expect(
      liveRegistry.filter((probe) => probe.id === "system-theme-follow"),
    ).toEqual([
      {
        id: "system-theme-follow",
        title: expect.stringContaining("without a restart"),
        capability: "theme",
      },
    ]);
  });

  it("documents it under the version it was measured on", () => {
    expect(readme).toContain(
      "### `system-theme-follow` — measured on 0.11.0 here",
    );
  });

  it("prints the number of checks the probe asserts", () => {
    const printed = Number(
      /(\d+) checks, `--only system-theme-follow`/.exec(readme)?.[1] ??
        Number.NaN,
    );
    expect(printed).toBe(SYSTEM_THEME_CHECKS);
    expect(SYSTEM_THEME_CHECKS).toBe(12);
  });

  it("names the probe in the theme-switching interaction row", () => {
    const row = readme
      .split("\n")
      .find((line) => line.startsWith("| theme switching |"));
    expect(row).toContain("`system-theme-follow`");
    const interaction = /\| theme switching \| ([^|]+) \|/.exec(row ?? "");
    expect(interaction?.[1]).toContain("`system-theme-follow`");
  });

  it("asks the view for every part the section teaches", () => {
    expect(steps).toContain("settled(NIGHT_PAGE)");
    expect(steps).toContain("setSystemPalette(paperPalette)");
    expect(steps).toContain("clearSystemPalette");
    expect(steps).toContain("SYSTEM_THEME_IDS.mounts");
    expect(steps).toContain('ctx.host.capture("system-theme-paper")');
    expect(scenarios).toContain("watchSystemTheme({");
    expect(scenarios).toContain("every: SYSTEM_THEME_POLL_MS");
    expect(scenarios).toContain("useState(recordMount)");
    expect(scenarios).toContain("<TokensThemeProvider theme={applied}>");
    expect(scenarios).toContain("SYSTEM_THEME_IDS.swatch");
  });

  it("prints the measured rules and the limit", () => {
    // The one claim the probe cannot make: this host is macOS, so the
    // platform's file is the consumer's decoder and Omarchy itself is not run.
    // Prose wraps, so the sentences are read from one flat line.
    const flat = readme.replace(/\s+/g, " ");
    expect(flat).toContain("without a restart");
    expect(flat).toContain("not remounted");
    expect(flat).toContain("the application's own theme");
    expect(flat).toContain("consumer owns the platform's decoder");
    expect(flat).toContain("this host is macOS");
  });
});
