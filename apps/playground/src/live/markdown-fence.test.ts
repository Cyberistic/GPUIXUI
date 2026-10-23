/**
 * Holds the `markdown-fence` fixtures and its record to the paint a window
 * carries.
 *
 * The bug this guards: `@gpuixui/tokens` derives the fence's two washes and
 * reads the syntax palette on that composite, but nothing had painted a fence —
 * and the derivation assumed the fill **behind** the host is the theme's own
 * `background`. The probe measured the other half: a fence composites over
 * whatever fill its host sits on, so a document wearing a platform theme on the
 * shell's page paints the shell page's fence, not the platform theme's (the
 * first run read `#242426/6` where the block painted the base page's
 * `#191C22/174776`). The view therefore paints each block on its own theme's
 * page, and this file holds that wiring, both washes, both keywords and the
 * printed evidence.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  contrastFloorsFor,
  contrastRatio,
  extendTheme,
  nativeFenceFill,
  nativeFenceHeaderFill,
  syntaxColors,
} from "@gpuixui/tokens";
import { liveRegistry } from "./registry.js";
import {
  FENCE_BODY_FLOOR,
  FENCE_LANGUAGE,
  FENCE_SOURCE,
  FENCE_STRIP_FLOOR,
  fenceBaseTheme,
  fenceBody,
  fenceKeyword,
  fencePlatformTheme,
  fenceStrip,
  keywordClearsFence,
  MARKDOWN_FENCE_CHECKS,
  MARKDOWN_FENCE_IDS,
  stripIsSecondWash,
} from "./markdown-fence.js";
import { palettes } from "../palettes.js";

const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);

const scenarios = readFileSync(
  new URL("./scenarios.tsx", import.meta.url),
  "utf8",
);

const readmeFlat = readme.replace(/\s+/g, " ");

describe("the fence composite", () => {
  it("derives both washes from the fill the theme paints", () => {
    Arr.forEach([fenceBaseTheme, fencePlatformTheme], (theme) => {
      const body = fenceBody(theme);
      const strip = fenceStrip(theme);
      expect(Option.isSome(body)).toBe(true);
      expect(Option.isSome(strip)).toBe(true);
      // The value is the seam's derivation, not a fixture literal: a palette
      // change must move the expected ink with it.
      expect(body).toEqual(
        Option.fromNullishOr(nativeFenceFill(theme.colors.background)),
      );
      expect(strip).toEqual(
        Option.fromNullishOr(nativeFenceHeaderFill(theme.colors.background)),
      );
      // A fence is a surface: it is not the page it sits on, which is why a
      // keyword that clears the page can miss on the block.
      expect(Option.getOrElse(body, () => theme.colors.background)).not.toBe(
        theme.colors.background,
      );
    });
  });

  it("makes the strip a second wash rather than a boundary", () => {
    Arr.forEach([fenceBaseTheme, fencePlatformTheme], (theme) => {
      expect(stripIsSecondWash(theme)).toBe(true);
      const body = Option.getOrElse(
        fenceBody(theme),
        () => theme.colors.background,
      );
      const strip = Option.getOrElse(
        fenceStrip(theme),
        () => theme.colors.background,
      );
      expect(strip).not.toBe(body);
      // The rule the runtime draws carries the strip; the fill only has to be
      // a step above its body.
      const ratio = Option.fromNullishOr(contrastRatio(strip, body));
      expect(Option.isSome(ratio)).toBe(true);
      expect(
        Option.getOrElse(ratio, () => Number.POSITIVE_INFINITY),
      ).toBeLessThan(1.1);
    });
  });
});

describe("the keyword on the fence", () => {
  it("puts the platform look one ramp above the identity", () => {
    const base = fenceKeyword(fenceBaseTheme);
    const platform = fenceKeyword(fencePlatformTheme);
    expect(base).toBe(syntaxColors(palettes.dark).keyword);
    expect(platform).toBe(syntaxColors(fencePlatformTheme).keyword);
    expect(platform).not.toBe(base);
  });

  it("measures the keyword on the fence, not on the page", () => {
    Arr.forEach([fenceBaseTheme, fencePlatformTheme], (theme) => {
      expect(keywordClearsFence(theme)).toBe(true);
      const floor = contrastFloorsFor(theme).body;
      expect(
        contrastRatio(fenceKeyword(theme), theme.colors.background),
      ).toBeGreaterThanOrEqual(floor);
    });
    // `#9E9EC6` clears the base dark page at 7.17:1 and misses the fence at
    // 6.63:1: a report that read the page would pass the brand the fence fails.
    const onThePageOnly = extendTheme(fenceBaseTheme, {
      syntax: { ...syntaxColors(fenceBaseTheme), keyword: "#9E9EC6" },
    });
    expect(
      contrastRatio("#9E9EC6", fenceBaseTheme.colors.background),
    ).toBeGreaterThanOrEqual(contrastFloorsFor(fenceBaseTheme).body);
    expect(keywordClearsFence(onThePageOnly)).toBe(false);
  });

  it("keeps the runtime's own keyword out of both shipped palettes", () => {
    const base = fenceKeyword(fenceBaseTheme);
    const platform = fenceKeyword(fencePlatformTheme);
    expect(base).not.toBe(platform);
    // The control paints the runtime's palette, so the probe's negative reads
    // can tell a handover from a fallback.
    expect(Arr.dedupe([base, platform])).toHaveLength(2);
  });
});

describe("the source every fence paints", () => {
  it("is one fenced block in the language the strip names", () => {
    const lines = FENCE_SOURCE.split("\n");
    expect(lines[0]).toBe(`\`\`\`${FENCE_LANGUAGE}`);
    expect(lines[lines.length - 1]).toBe("```");
    const body = lines.slice(1, -1);
    expect(body.length).toBeGreaterThan(3);
    expect(Arr.every(body, (line) => line.startsWith("const "))).toBe(true);
  });

  it("is large enough for the floors the probe asserts", () => {
    expect(FENCE_BODY_FLOOR).toBeGreaterThan(FENCE_STRIP_FLOOR);
    expect(FENCE_STRIP_FLOOR).toBeGreaterThan(0);
  });
});

describe("the fence probe's record", () => {
  it("paints each fence on the page it composites over", () => {
    // The measured rule: the fence lays its ink over the fill *behind* the
    // host, so the wrapper's fill is what the fill assertion can name.
    expect(scenarios).toContain("backgroundColor: page");
    expect(scenarios).toContain("page={fenceBaseTheme.colors.background}");
    expect(scenarios).toContain("page={fencePlatformTheme.colors.background}");
    expect(scenarios).toContain("page={palettes.dark.colors.background}");
    expect(scenarios).toContain("theme === undefined ? undefined :");
    expect(scenarios).toContain('nativeTextTheme(theme, "background")');
  });

  it("registers the probe with the text capability", () => {
    expect(
      Arr.filter(liveRegistry, (probe) => probe.id === "markdown-fence"),
    ).toEqual([
      {
        id: "markdown-fence",
        title: expect.stringContaining("markdown fence"),
        capability: "text",
      },
    ]);
  });

  it("prints the check count the probe asserts", () => {
    const printed = Number(
      /(\d+) checks, `--only markdown-fence`/.exec(readme)?.[1] ?? Number.NaN,
    );
    expect(printed).toBe(MARKDOWN_FENCE_CHECKS);
  });

  it("prints the fills and keywords the window measured", () => {
    // The numbers are the run's, not the seam's: a changed palette has to
    // re-measure before the page can keep claiming them.
    expect(readmeFlat).toContain("`#191C22`");
    expect(readmeFlat).toContain("`#1E2126`");
    expect(readmeFlat).toContain("`#A7A9FF`");
    expect(readmeFlat).toContain("`#242426`");
    expect(readmeFlat).toContain("`#28282A`");
    expect(readmeFlat).toContain("`#B0B2FF`");
    expect(readmeFlat).toContain("**174 776**");
    expect(readmeFlat).toContain("**174 570**");
    expect(readmeFlat).toContain("**57 822**");
    expect(readmeFlat).toContain("**57 630**");
    expect(readmeFlat).toContain("**896**");
    expect(readmeFlat).toContain("**988**");
  });

  it("records the page-wrapper negative control", () => {
    expect(readmeFlat).toContain("on the shell's page");
    expect(readmeFlat).toContain("on **6** pixels");
  });

  it("mounts the three blocks the section describes", () => {
    expect(scenarios).toContain("const MarkdownFenceProbe");
    expect(scenarios).toContain(
      "<FenceBlock\n        id={MARKDOWN_FENCE_IDS.base}",
    );
    expect(scenarios).toContain(
      "<FenceBlock\n        id={MARKDOWN_FENCE_IDS.platform}",
    );
    expect(scenarios).toContain(
      "<FenceBlock\n        id={MARKDOWN_FENCE_IDS.runtime}",
    );
    expect(scenarios).toContain('ctx.host.capture("markdown-fence")');
    expect(scenarios).toContain('ctx.host.pixels("markdown-fence")');
  });

  it("addresses the blocks with ids no other probe owns", () => {
    const ids = Object.values(MARKDOWN_FENCE_IDS);
    expect(new Set(ids).size).toBe(ids.length);
    expect(Arr.every(ids, (id) => id.startsWith("md-fence"))).toBe(true);
    expect(ids).toContain(MARKDOWN_FENCE_IDS.base);
  });
});
