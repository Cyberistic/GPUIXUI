/**
 * Holds the arithmetic the `hidden-subtree-lifecycle` probe reads a window with,
 * and the claims its README section prints.
 *
 * The finding this guards is that the pinned renderer's two hiding words are not
 * the same capability: `apply_styles` only acts on `display` of `flex` or
 * `grid`, while `visibility: "hidden"` becomes GPUI's `invisible()`. A
 * `display: none` box therefore lays out, paints and keeps its tab stop, and the
 * shipped `Carousel` — which hides its spare slides that way — paints every
 * slide. The stops below are the window's measurement, not the CSS's intent, so
 * a runtime upgrade that starts honouring `display` fails this file by name and
 * the record has to move with it.
 *
 * `node:fs` is deliberate, as in `collapse.test.ts`: this reads the repository's
 * own probe, view and Markdown, never a runtime path.
 */
import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import {
  HIDDEN_CHECKS,
  HIDDEN_IDS,
  HIDDEN_KEY,
  HIDDEN_STOPS,
  HIDDEN_WALK,
  HIDING_CASES,
  hiddenReadout,
  isHiddenControl,
} from "./hidden-subtree.js";
import { liveRegistry } from "./registry.js";

const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);

const probeSource = readFileSync(
  new URL("./hidden-subtree-probe.tsx", import.meta.url),
  "utf8",
);

/** The section's prose on one line, so a wrapped sentence still reads whole. */
const flat = readme.replace(/\s+/g, " ");

describe("the two hiding words", () => {
  it("mounts display and visibility, each with the cost of ignoring it", () => {
    expect(Arr.map(HIDING_CASES, (entry) => entry.word)).toEqual([
      "display",
      "visibility",
    ]);
    expect(Arr.map(HIDING_CASES, (entry) => entry.control)).toEqual([
      HIDDEN_IDS.displayControl,
      HIDDEN_IDS.visibilityControl,
    ]);
    // The costs are what a reader loses, not a restatement of the word.
    expect(HIDING_CASES[0]?.consequence).toContain("tab stop");
    expect(HIDING_CASES[1]?.consequence).toContain("layout space");
  });

  it("keeps every locator apart", () => {
    const ids = Object.values(HIDDEN_IDS);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("recognises only the controls inside a hidden subtree", () => {
    expect(isHiddenControl(HIDDEN_IDS.displayControl)).toBe(true);
    expect(isHiddenControl(HIDDEN_IDS.visibilityControl)).toBe(true);
    expect(isHiddenControl(HIDDEN_IDS.activeSlide)).toBe(false);
    expect(isHiddenControl(HIDDEN_IDS.after)).toBe(false);
  });
});

describe("the stops the window measured", () => {
  it("walks the display-hidden control and the spare slide, in tree order", () => {
    expect(HIDDEN_STOPS).toEqual([
      HIDDEN_IDS.before,
      HIDDEN_IDS.displayControl,
      HIDDEN_IDS.carousel,
      HIDDEN_IDS.activeSlide,
      HIDDEN_IDS.inactiveSlide,
      HIDDEN_IDS.after,
    ]);
  });

  it("leaves the invisible control out of the walk", () => {
    // The one rule the runtime does keep: `visibility` removes a stop.
    expect(Arr.contains(HIDDEN_STOPS, HIDDEN_IDS.visibilityControl)).toBe(
      false,
    );
    // The walk has to be long enough to see the whole cycle and repeat once.
    expect(HIDDEN_WALK).toBeGreaterThan(HIDDEN_STOPS.length);
  });

  it("prints the one readout shape every step is checked against", () => {
    expect(hiddenReadout({ slide: 0, invisibleKeys: 0 })).toBe(
      "slide=0 invisibleKeys=0",
    );
    expect(hiddenReadout({ slide: 1, invisibleKeys: 0 })).toBe(
      "slide=1 invisibleKeys=0",
    );
  });

  it("counts the checks the probe asserts", () => {
    expect(HIDDEN_CHECKS).toBe(2 + 1 + 4 + 5 + 2 + 4 + 3 + 2);
    expect(HIDDEN_CHECKS).toBe(23);
  });
});

describe("the hidden-subtree-lifecycle probe's record", () => {
  it("registers the probe with the focus capability", () => {
    expect(
      Arr.filter(
        liveRegistry,
        (probe) => probe.id === "hidden-subtree-lifecycle",
      ),
    ).toEqual([
      {
        id: "hidden-subtree-lifecycle",
        title: expect.stringContaining("display:none"),
        capability: "focus",
      },
    ]);
  });

  it("documents it under the version it was measured on", () => {
    expect(readme).toContain(
      "### `hidden-subtree-lifecycle` — measured on 0.11.0 here",
    );
    const printed = Number(
      /(\d+) checks, `--only hidden-subtree-lifecycle`/.exec(readme)?.[1] ??
        Number.NaN,
    );
    expect(printed).toBe(HIDDEN_CHECKS);
  });

  it("prints the reads the window made, not only the constants", () => {
    expect(flat).toContain("still reports its own **200×32** box");
    expect(flat).toContain("`#1E222A`");
    expect(flat).toContain("`#11141A`");
    expect(flat).toContain("each **433** wide");
    expect(flat).toContain("`invisibleKeys=0`");
    Arr.forEach(
      [
        "hidden-display-control",
        "hidden-carousel",
        "hidden-active-slide",
        "hidden-inactive-slide",
        "hidden-after",
      ],
      (id) => {
        expect(flat).toContain(`\`${id}\``);
      },
    );
  });

  it("states the rules and the carousel defect they leave", () => {
    expect(flat).toContain(
      "`display: none` is not a hiding word in this runtime",
    );
    expect(flat).toContain("`visibility: hidden` is.");
    expect(flat).toContain("The traversal follows `visibility`, not `display`");
    expect(flat).toContain(
      "A code focus on an invisible control is a focus id with no input",
    );
    expect(flat).toContain("The shipped `Carousel` is broken by rule 1");
  });

  it("states the negative control it measured", () => {
    expect(flat).toContain(
      "fails `the display:none control paints its own fill` (`expected false, got true`)",
    );
  });
});

describe("the probe asks the question the section answers", () => {
  it("mounts the shipped carousel and both hiding words", () => {
    expect(probeSource).toContain("<Carousel");
    expect(probeSource).toContain('style={{ display: "none" as const }}');
    expect(probeSource).toContain('style={{ visibility: "hidden" as const }}');
    expect(probeSource).toContain("testId={HIDDEN_IDS.activeSlideFrame}");
    expect(probeSource).toContain("testId={HIDDEN_IDS.inactiveSlideFrame}");
  });

  it("types the one key the hidden control counts", () => {
    expect(probeSource).toContain("ctx.host.key(HIDDEN_KEY)");
    expect(HIDDEN_KEY).toBe("a");
    // The counter reads the same word the readout prints.
    expect(probeSource).toContain("invisibleKeys");
  });
});
