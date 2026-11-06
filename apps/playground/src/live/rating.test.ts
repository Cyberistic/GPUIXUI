import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { blend } from "@gpuixui/tokens";
import { palettes } from "../palettes.js";
import {
  counterOf,
  disabledInk,
  DISABLED_OPACITY,
  emptyInk,
  filledInk,
  halfSplit,
  inkDistance,
  invalidInk,
  isStarInk,
  RATING_CHECKS,
  RATING_IDS,
  RATING_INITIAL,
  RATING_STARS,
  ratingReadout,
  rgbOf,
  STAR_INK_TOLERANCE,
  valueOf,
} from "./rating.js";
import { liveRegistry } from "./registry.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const probe = read("./rating-probe.tsx");
const registry = read("./registry.ts");
const readme = read("../../README.md");

const stepsOf = (): string => {
  const start = probe.indexOf("export const ratingSteps");
  return start === -1 ? "" : probe.slice(start);
};

const sectionOf = (): string => {
  const heading = "### `rating-lifecycle` — measured on 0.11.0 here";
  const start = readme.indexOf(heading);
  if (start === -1) return "";
  const end = readme.indexOf("\n## ", start + 1);
  return readme.slice(start, end === -1 ? undefined : end);
};

const channels = (hex: string) =>
  Option.getOrElse(rgbOf(hex), () => ({ r: 0, g: 0, b: 0 }));

const primary = channels(filledInk(palettes.dark.colors.primary));
const muted = channels(emptyInk(palettes.dark.colors.mutedForeground));
const destructive = channels(invalidInk(palettes.dark.colors.destructive));
const page = channels(palettes.dark.colors.background);

describe("the readout", () => {
  it("prints the score, then the interactive and disabled counts", () => {
    expect(ratingReadout({ value: 3.5, reports: 2, disabled: 0 })).toBe(
      "value=3.5 reports=2 disabled=0",
    );
    expect(valueOf("value=3.5 reports=2 disabled=0")).toEqual(Option.some(3.5));
    expect(valueOf("no value here")).toEqual(Option.none());
    expect(counterOf("value=5 reports=5 disabled=1", "reports")).toEqual(
      Option.some(5),
    );
    expect(counterOf("value=5 reports=5 disabled=1", "disabled")).toEqual(
      Option.some(1),
    );
    expect(counterOf("value=5 reports=5", "disabled")).toEqual(Option.none());
  });
});

describe("the star's inks", () => {
  it("keeps every role further apart than the paint tolerance", () => {
    expect(STAR_INK_TOLERANCE).toBeGreaterThan(0);
    expect(inkDistance(primary.r, primary.g, primary.b, muted)).toBeGreaterThan(
      STAR_INK_TOLERANCE,
    );
    expect(
      inkDistance(primary.r, primary.g, primary.b, destructive),
    ).toBeGreaterThan(STAR_INK_TOLERANCE);
    expect(inkDistance(primary.r, primary.g, primary.b, page)).toBeGreaterThan(
      STAR_INK_TOLERANCE,
    );
  });

  it("counts a partly covered glyph pixel and refuses the page and the other role", () => {
    const edge = channels(
      blend(palettes.dark.colors.primary, palettes.dark.colors.background, 0.1),
    );
    expect(isStarInk(edge.r, edge.g, edge.b, primary)).toBe(true);
    expect(isStarInk(page.r, page.g, page.b, primary)).toBe(false);
    expect(isStarInk(muted.r, muted.g, muted.b, primary)).toBe(false);
  });

  it("splits a star at the ceil of its own midpoint", () => {
    expect(halfSplit(48)).toBe(24);
    expect(halfSplit(49)).toBe(24);
    expect(halfSplit(47)).toBe(23);
  });

  it("reads a disabled fill as the role at half opacity over the page", () => {
    expect(DISABLED_OPACITY).toBe(0.5);
    expect(
      disabledInk(
        palettes.dark.colors.primary,
        palettes.dark.colors.background,
      ),
    ).toBe(
      blend(palettes.dark.colors.primary, palettes.dark.colors.background, 0.5),
    );

    expect(
      inkDistance(
        primary.r,
        primary.g,
        primary.b,
        channels(
          disabledInk(
            palettes.dark.colors.primary,
            palettes.dark.colors.background,
          ),
        ),
      ),
    ).toBeGreaterThan(0);
  });
});

describe("the probe", () => {
  it("mounts the shipped rating and gives each paint role its own star", () => {
    expect(probe).toContain('from "@gpuixui/primitives"');
    expect(probe).toContain("RATING_IDS.empty");
    expect(probe).toContain("RATING_IDS.full");
    expect(probe).toContain("RATING_IDS.half");
    expect(probe).toContain("RATING_IDS.invalid");
    expect(probe).toContain("RATING_IDS.disabled");
    expect(probe).toContain("RATING_IDS.interactive");

    expect(Arr.fromIterable(probe.matchAll(/<Rating\b/g))).toHaveLength(6);
    expect(probe).toContain("max={1}");
    expect(probe).toContain("max={RATING_STARS}");
    expect(probe).toContain("allowHalf");
    expect(probe).toContain("invalid");
  });

  it("reads each ink inside its own star's box", () => {
    expect(probe).toContain("countInk");
    expect(probe).toContain("filledInk(palettes.dark.colors.primary)");
    expect(probe).toContain("emptyInk(palettes.dark.colors.mutedForeground)");
    expect(probe).toContain("invalidInk(palettes.dark.colors.destructive)");
    expect(probe).toContain("disabledInk(");
    expect(probe).toContain("splitOf");
    expect(stepsOf()).toContain(
      "an unrated star paints none of the primary ink",
    );
    expect(stepsOf()).toContain(
      "a half star paints none of the primary ink in its right half",
    );
    expect(stepsOf()).toContain(
      "a disabled rating paints none of the undimmed primary ink",
    );
  });

  it("drives the press, the arrows, both ends and the clear key", () => {
    expect(stepsOf()).toContain("ctx.host.click(RATING_IDS.interactive)");
    expect(stepsOf()).toContain("a press on the middle star chooses three");
    expect(stepsOf()).toContain('ctx.host.key("right")');
    expect(stepsOf()).toContain("Right steps a half star");
    expect(stepsOf()).toContain('ctx.host.key("home")');
    expect(stepsOf()).toContain('ctx.host.key("end")');
    expect(stepsOf()).toContain(
      "Right at the last star clamps without reporting",
    );
    expect(stepsOf()).toContain('ctx.host.key("delete")');
    expect(stepsOf()).toContain("Delete clears the rating");
    expect(stepsOf()).toContain("a press on a disabled rating reports nothing");
  });

  it("counts the checks the probe can assert", () => {
    const sites = Arr.length(
      Arr.fromIterable(stepsOf().matchAll(/ctx\.expect\w+\(/g)),
    );
    expect(sites).toBeGreaterThan(0);

    expect(RATING_CHECKS).toBeGreaterThanOrEqual(sites);
  });
});

describe("the registry and the record", () => {
  it("declares the probe as an input the window can prove", () => {
    const meta = Arr.findFirst(
      liveRegistry,
      (entry) => entry.id === "rating-lifecycle",
    );
    expect(Option.map(meta, (entry) => entry.capability)).toEqual(
      Option.some("input"),
    );
    expect(registry).toContain('id: "rating-lifecycle"');
  });

  it("documents the probe under the version it was measured on", () => {
    expect(sectionOf()).not.toBe("");
    expect(sectionOf()).toContain(`${RATING_CHECKS} checks`);
    expect(sectionOf()).toContain("`--only rating-lifecycle`");
    expect(sectionOf()).toContain("rating-rest");
    expect(sectionOf()).toContain("rating-chosen");
  });

  it("prints the readings the window took", () => {
    const section = sectionOf();

    expect(section).toContain("**196**");
    expect(section).toContain("**270**");
    expect(section).toContain("**168**");
    expect(section).toContain("**98**");
    expect(section).toContain("**274**");
    expect(section).toContain("**282**");
    expect(section).toContain("24×24");
  });

  it("states the three rules a plan needs", () => {
    const section = sectionOf();
    expect(section).toContain("The role is in the glass");
    expect(section).toContain("A half star is a clip, not a tint");
    expect(section).toContain("A press owns the keyboard path");

    expect(section).toContain("left the value at **5**");
  });

  it("names the negative control the probe was held to", () => {
    expect(sectionOf()).toContain("dropping `allowHalf`");
    expect(sectionOf()).toContain("expected true, got false");
  });

  it("names the ids, the default count and the starting score", () => {
    expect(RATING_IDS).toEqual({
      probe: "rating-probe",
      readout: "rating-readout",
      empty: "rating-empty",
      full: "rating-full",
      half: "rating-half",
      invalid: "rating-invalid",
      disabled: "rating-disabled",
      interactive: "rating-interactive",
    });
    expect(RATING_STARS).toBe(5);
    expect(RATING_INITIAL).toBe(0);
  });
});
