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
  it("walks the display-hidden control, and not the carousel's spare slide", () => {
    expect(HIDDEN_STOPS).toEqual([
      HIDDEN_IDS.before,
      HIDDEN_IDS.displayControl,
      HIDDEN_IDS.carousel,
      HIDDEN_IDS.activeSlide,
      HIDDEN_IDS.after,
    ]);

    expect(Arr.contains(HIDDEN_STOPS, HIDDEN_IDS.inactiveSlide)).toBe(false);
  });

  it("leaves the invisible control out of the walk", () => {
    expect(Arr.contains(HIDDEN_STOPS, HIDDEN_IDS.visibilityControl)).toBe(
      false,
    );

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
    expect(HIDDEN_CHECKS).toBe(2 + 1 + 4 + 5 + 2 + 4 + 4 + 2);
    expect(HIDDEN_CHECKS).toBe(24);
  });

  it("holds the count to the assertions the steps run", () => {
    const asserted =
      probeSource.match(/yield\* ctx\.expect[A-Za-z]+\(/g)?.length ?? 0;
    const sampled = probeSource.match(/yield\* sampleAt\(/g)?.length ?? 0;
    const painted = probeSource.match(/yield\* expectPaint\(/g)?.length ?? 0;
    expect(asserted).toBeGreaterThan(15);
    expect(sampled).toBe(2);
    expect(painted).toBe(2);
    expect(HIDDEN_CHECKS).toBe(asserted + sampled + painted);
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

    expect(flat).toContain("**one** slide box");
    expect(flat).toContain("**866** wide inside the **868** carousel");
    expect(flat).toContain("`invisibleKeys=0`");
    Arr.forEach(
      [
        "hidden-display-control",
        "hidden-carousel",
        "hidden-active-slide",
        "hidden-after",
      ],
      (id) => {
        expect(flat).toContain(`\`${id}\``);
      },
    );
  });

  it("states the rules and the mount window that follows from them", () => {
    expect(flat).toContain(
      "`display: none` is not a hiding word in this runtime",
    );
    expect(flat).toContain("`visibility: hidden` is.");
    expect(flat).toContain("The traversal follows `visibility`, not `display`");
    expect(flat).toContain(
      "A code focus on an invisible control is a focus id with no input",
    );
    expect(flat).toContain(
      "A subtree that must not paint is unmounted, not hidden",
    );
    expect(flat).toContain("a slide's local state does not survive a visit");

    expect(flat).not.toContain("still report their box");
    expect(flat).not.toContain("broken by rule 1");
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

    expect(probeSource).toContain("invisibleKeys");
  });
});
