import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import {
  CAROUSEL_BORDER,
  CAROUSEL_CHECKS,
  CAROUSEL_DOT,
  CAROUSEL_IDS,
  CAROUSEL_LEVEL_MS,
  CAROUSEL_PARTIAL_MS,
  CAROUSEL_TRACK_WIDTH,
  carouselFrameHeight,
  carouselReadout,
  carouselSlides,
  dotId,
  dotWidth,
  sameWidth,
  slideId,
  travelling,
} from "./carousel.js";
import { liveRegistry } from "./registry.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const probe = read("./carousel-probe.tsx");
const scenarios = read("./scenarios.tsx");
const readme = read("../../README.md");
const component = read("../../../../packages/components/src/carousel.tsx");
const recipes = read("../../../../packages/tw/src/recipes.ts");
const scale = read("../../../../packages/tokens/src/scale.ts");
const timing = read("../../../../packages/motion/src/timing.ts");

const channelsOf = (hex: string) => {
  const value = Number.parseInt(hex.slice(1), 16);
  return {
    r: (value >>> 16) & 0xff,
    g: (value >>> 8) & 0xff,
    b: value & 0xff,
  };
};

describe("the slides", () => {
  it("carries a fill, an ink and a height no other slide shares", () => {
    const slides = carouselSlides();
    expect(Arr.length(slides)).toBe(3);
    Arr.forEach(slides, (slide) => {
      expect(channelsOf(slide.fill.hex)).toEqual({
        r: slide.fill.r,
        g: slide.fill.g,
        b: slide.fill.b,
      });
      expect(channelsOf(slide.ink.hex)).toEqual({
        r: slide.ink.r,
        g: slide.ink.g,
        b: slide.ink.b,
      });

      Arr.forEach(
        Arr.filter(slides, (other) => other.name !== slide.name),
        (other) => {
          expect(other.fill.hex).not.toBe(slide.fill.hex);
          expect(other.ink.hex).not.toBe(slide.ink.hex);
          expect(other.height).not.toBe(slide.height);
        },
      );

      expect(slide.ink.hex).not.toBe(slide.fill.hex);
    });
  });

  it("takes the frame's height from the slide on screen, plus the track's border", () => {
    const heights = Arr.map(carouselSlides(), (slide, index) => ({
      declared: slide.height + 2 * CAROUSEL_BORDER,
      derived: carouselFrameHeight(index),
    }));
    Arr.forEach(heights, (entry) => expect(entry.derived).toBe(entry.declared));
    expect(heights[0]?.derived).toBe(122);
    expect(heights[1]?.derived).toBe(162);
    expect(heights[2]?.derived).toBe(102);

    expect(new Set(Arr.map(heights, (entry) => entry.derived)).size).toBe(3);
  });

  it("names the pill only for the slide that is on screen", () => {
    Arr.forEach([0, 1, 2], (index) => {
      expect(dotWidth(index, index)).toBe(CAROUSEL_DOT.active);
      Arr.forEach(
        Arr.filter([0, 1, 2], (other) => other !== index),
        (other) => expect(dotWidth(other, index)).toBe(CAROUSEL_DOT.rest),
      );
    });
    expect(CAROUSEL_DOT.active).not.toBe(CAROUSEL_DOT.rest);
  });
});

describe("the invariants", () => {
  it("reads a width through the point a rounded drawing loses", () => {
    expect(sameWidth(5, CAROUSEL_DOT.rest)).toBe(true);
    expect(sameWidth(17, CAROUSEL_DOT.active)).toBe(true);
    expect(sameWidth(6, CAROUSEL_DOT.rest)).toBe(true);
    expect(sameWidth(CAROUSEL_DOT.rest, CAROUSEL_DOT.active)).toBe(false);
    expect(sameWidth(5, CAROUSEL_DOT.active)).toBe(false);
  });

  it("calls a width travelling only between a dot and a pill", () => {
    expect(travelling(11)).toBe(true);
    expect(travelling(CAROUSEL_DOT.rest + 2)).toBe(false);
    expect(travelling(CAROUSEL_DOT.active - 2)).toBe(false);
    expect(travelling(5)).toBe(false);
    expect(travelling(17)).toBe(false);
  });

  it("prints the state a reader checks", () => {
    expect(carouselReadout({ active: 1, reports: 9, loop: true })).toBe(
      "active=1 reports=9 loop=on",
    );
    expect(carouselReadout({ active: 0, reports: 0, loop: false })).toBe(
      "active=0 reports=0 loop=off",
    );
  });
});

describe("the component", () => {
  it("declares the dot geometry the fixture measures", () => {
    expect(component).toContain("const DOT_HEIGHT = 6;");
    expect(CAROUSEL_DOT.height).toBe(6);
    expect(component).toContain("const DOT_REST_WIDTH = 6;");
    expect(CAROUSEL_DOT.rest).toBe(6);
    expect(component).toContain("const DOT_ACTIVE_WIDTH = 18;");
    expect(CAROUSEL_DOT.active).toBe(18);

    expect(component).toContain("width: targetSize.minimum,");
    expect(scale).toContain("minimum: 24");
    expect(CAROUSEL_DOT.target).toBe(24);
  });

  it("paints the two inks the probe counts", () => {
    expect(component).toContain("backgroundColor: selected");
    expect(component).toContain("? theme.colors.primary");
    expect(component).toContain(": theme.colors.mutedForeground,");

    expect(component).toContain('pointerEvents: "none"');
  });

  it("unmounts the slide that is not on screen, which is what the capture proves", () => {
    expect(component).toContain("if (index !== activeIndex) return null;");

    expect(component).not.toContain('display: "none"');
  });

  it("travels the indicator on the fast level, from the width on screen", () => {
    expect(component).toContain('from "./internal/presence.js"');
    expect(component).toMatch(/use(?:Move|Surface)Timing\("fast"\)/);
    expect(component).toContain("initial: false");
    expect(timing).toContain("fast: 160");
    expect(CAROUSEL_LEVEL_MS).toBe(160);

    expect(CAROUSEL_PARTIAL_MS).toBe(40);
    expect(CAROUSEL_PARTIAL_MS).toBeGreaterThan(0);
    expect(CAROUSEL_PARTIAL_MS).toBeLessThan(CAROUSEL_LEVEL_MS);
  });

  it("clamps without loop and wraps with it, on the keys and the controls", () => {
    expect(component).toContain("loop");
    expect(component).toContain("next < 0 || next >= count");
    expect(component).toContain("(next + count) % count");
    expect(component).toContain("Math.min(Math.max(next, 0), count - 1)");

    expect(component).toContain(
      "disabled={disabled || count === 0 || (atEdge && !loop)}",
    );
  });

  it("draws the frame's border from the recipe the probe's height adds", () => {
    expect(recipes).toContain("const CAROUSEL_TRACK");
    expect(recipes).toContain("border border-input");
    expect(CAROUSEL_BORDER).toBe(1);
    expect(CAROUSEL_TRACK_WIDTH).toBe(360);
  });

  it("publishes the slide ids the probe looks for", () => {
    Arr.forEach(carouselSlides(), (slide) =>
      expect(slideId(slide.name)).toContain(slide.name),
    );
    Arr.forEach([0, 1, 2], (index) =>
      expect(dotId(index)).toBe(`${CAROUSEL_IDS.dots}-${index}`),
    );

    expect(component).toContain("`${rest.testId}-${index}`");
  });
});

describe("the probe and the registry", () => {
  it("registers the probe as an input measurement", () => {
    expect(liveRegistry).toContainEqual({
      id: "carousel-lifecycle",
      title:
        "Input: the shipped carousel paints only the slide on screen, sizes its frame to that slide, swaps the indicator's inks in the press's frame and travels its widths to land, and steps, clamps and wraps through its controls",
      capability: "input",
    });
  });

  it("mounts the probe in the live registry", () => {
    expect(scenarios).toContain(
      'import { CarouselProbe, carouselSteps } from "./carousel-probe.js";',
    );
    expect(scenarios).toContain('"carousel-lifecycle": {');
    expect(scenarios).toContain("view: () => <CarouselProbe />,");
    expect(scenarios).toContain("steps: carouselSteps,");
  });

  it("drives the shipped component through the fixture's own readings", () => {
    expect(probe).toContain("<Carousel");
    expect(probe).toContain("<CarouselSlide");
    expect(probe).toContain(
      "<CarouselIndicators testId={CAROUSEL_IDS.dots} />",
    );
    expect(probe).toContain("dotId(index)");
    expect(probe).toContain("carouselFrameHeight(1)");
    expect(probe).toContain("travelling(inkWidth(paint))");
    expect(probe).toContain("sameWidth(box.width, dotWidth(index, 1))");
    expect(probe).toContain("clockPause");
    expect(probe).toContain("clockFastForward");
    expect(probe).toContain("clockResume");

    expect(probe).toContain("loop={loop}");
  });

  it("counts the checks the probe can assert", () => {
    const steps = probe.slice(probe.indexOf("export const carouselSteps"));
    const sites = Arr.length(
      Arr.fromIterable(steps.matchAll(/ctx\.expect[A-Za-z]+\(/g)),
    );
    expect(sites).toBeGreaterThan(0);
    expect(CAROUSEL_CHECKS).toBeGreaterThanOrEqual(sites);
  });
});

describe("the README", () => {
  it("documents the measurement under the version it was made on", () => {
    expect(readme).toContain(
      "### `carousel-lifecycle` — measured on 0.11.0 here",
    );
    expect(readme).toContain(`${CAROUSEL_CHECKS} checks`);
    expect(readme).toContain("`src/live/carousel.ts`");
    expect(readme).toContain("carousel.test.ts");
  });

  it("prints the values the fixture computes", () => {
    const flat = readme.replace(/\s+/g, " ");
    expect(flat).toContain(`${CAROUSEL_TRACK_WIDTH}`);
    expect(flat).toContain("122");
    expect(flat).toContain("162");
    expect(flat).toContain("102");
    expect(flat).toContain("18×6");
    expect(flat).toContain("6×6");
    expect(flat).toContain(String(CAROUSEL_LEVEL_MS));
    expect(flat).toContain("primary");
    expect(flat).toContain("mutedForeground");
    Arr.forEach(carouselSlides(), (slide) => {
      expect(flat).toContain(slide.fill.hex);
      expect(flat).toContain(slide.ink.hex);
    });
  });

  it("states the limitation it measured rather than implying a travelling track", () => {
    const flat = readme.replace(/\s+/g, " ");
    expect(flat).toContain("does not travel");
    expect(flat).toContain("inks");
    expect(flat).toContain("widths");
  });
});
