/**
 * Holds the `ripple-lifecycle` fixture, the probe that paints it and the
 * section a plan reads.
 *
 * The gap this guards: the catalogue's *Ripple button* row claims four things
 * about the glass — the disc is the action's own label ink at a faint share, it
 * is a circle, it grows from the press point, and it is clipped by the control
 * and takes no pointer input — while the component's renderer suite reads the
 * layer's reported box and its declarations only. This suite keeps the wash
 * algebra, the frame arithmetic, the probe's clock discipline and the printed
 * count pointing at one another, so a probe that stopped measuring the paint
 * would fail here rather than pass there.
 *
 * `node:fs` is deliberate, as in the other live fixtures: this reads the
 * repository's own probe and prose, never a runtime path.
 */
import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { liveRegistry } from "./registry.js";
import {
  cornerPoints,
  discCentre,
  insideActionPoint,
  isFainter,
  isSmallFrame,
  isWash,
  outsideActionPoint,
  passesLeftEdge,
  pressOffset,
  pressPoint,
  RIPPLE_ACTION,
  RIPPLE_CHECKS,
  RIPPLE_PRESS,
  RIPPLE_STEPS,
  rippleReadout,
  washShare,
  type Rgb,
  type RippleBox,
} from "./ripple-button.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const probe = read("./ripple-button-probe.tsx");
const scenarios = read("./scenarios.tsx");
const readme = read("../../README.md");

/** The action's frame as the probe measured it on 0.11.0 here. */
const ACTION: RippleBox = { x: 32, y: 68, ...RIPPLE_ACTION };

/** The fill the action paints under the pointer, and the ink the disc mixes. */
const FILL: Rgb = { r: 176, g: 178, b: 254 };
const INK: Rgb = { r: 17, g: 20, b: 26 };

/** The share the two measured frames carry on 0.11.0: small, then clipped. */
const SMALL_SHARE = 0.064;
const CLIP_SHARE = 0.0327;

/** The share a frame sample carries, with `NaN` standing for "not a wash". */
const shareOf = (observed: Rgb): number =>
  Option.getOrElse(washShare(observed, FILL, INK), () => Number.NaN);

/** The probe's own steps, so a count cannot be read out of another probe. */
const stepsOf = (): string => {
  const start = probe.indexOf("export const rippleSteps");
  return probe.slice(start);
};

/** This probe's README section, so a value printed elsewhere cannot pass. */
const sectionOf = (): string => {
  const heading = "### `ripple-lifecycle` — measured on 0.11.0 here";
  const start = readme.indexOf(heading);
  if (start === -1) return "";
  const end = readme.indexOf("\n## ", start + 1);
  return readme.slice(start, end === -1 ? undefined : end);
};

describe("the fixture", () => {
  it("puts both presses inside the action and off its centre", () => {
    // A disc born at the element's centre (or the window's origin) has to be
    // distinguishable from one born where the pointer landed.
    expect(RIPPLE_PRESS.first.across).toBeGreaterThan(0);
    expect(RIPPLE_PRESS.first.across).toBeLessThan(1);
    expect(RIPPLE_PRESS.first.down).toBeGreaterThan(0);
    expect(RIPPLE_PRESS.first.down).toBeLessThan(1);
    expect(RIPPLE_PRESS.first.across).not.toBe(0.5);
    expect(RIPPLE_PRESS.second.across).toBeGreaterThan(0);
    expect(RIPPLE_PRESS.second.across).toBeLessThan(1);
    expect(RIPPLE_PRESS.second.across).not.toBe(RIPPLE_PRESS.first.across);
    expect(pressOffset(RIPPLE_PRESS.first)).toEqual({
      x: RIPPLE_ACTION.width * RIPPLE_PRESS.first.across,
      y: RIPPLE_ACTION.height * RIPPLE_PRESS.first.down,
    });
  });

  it("places the disc where the runtime's own box says it is", () => {
    const press = pressPoint(ACTION, RIPPLE_PRESS.first);
    expect(press).toEqual({
      x: ACTION.x + ACTION.width * RIPPLE_PRESS.first.across,
      y: ACTION.y + ACTION.height * RIPPLE_PRESS.first.down,
    });
    const disc: RippleBox = {
      x: press.x - 28,
      y: press.y - 28,
      width: 56,
      height: 56,
    };
    expect(discCentre(disc)).toEqual({ x: press.x, y: press.y });
    expect(discCentre(disc).x).toBeCloseTo(ACTION.x + 84, 0);
  });

  it("samples a disc's box corners outside the circle it inscribes", () => {
    const disc: RippleBox = { x: 10, y: 20, width: 100, height: 100 };
    const corners = cornerPoints(disc);
    expect(corners).toHaveLength(4);
    const centre = discCentre(disc);
    for (const corner of corners) {
      expect(corner.x).toBeGreaterThan(disc.x);
      expect(corner.x).toBeLessThan(disc.x + disc.width);
      expect(corner.y).toBeGreaterThan(disc.y);
      expect(corner.y).toBeLessThan(disc.y + disc.height);
      // A round layer is a circle inside this box, so a corner sample has to be
      // outside the circle: the measurement a square layer fails.
      expect(
        Math.hypot(corner.x - centre.x, corner.y - centre.y),
      ).toBeGreaterThan(disc.width / 2);
    }
  });

  it("samples the clip on either side of the action's edge", () => {
    const y = ACTION.y + 40;
    expect(insideActionPoint(ACTION, y).x).toBeGreaterThan(ACTION.x);
    expect(insideActionPoint(ACTION, y).x).toBeLessThan(
      ACTION.x + ACTION.width / 4,
    );
    expect(outsideActionPoint(ACTION, y).x).toBeLessThan(ACTION.x);
    expect(outsideActionPoint(ACTION, y).y).toBe(y);
  });

  it("separates the frames a disc is read in", () => {
    const disc = (width: number): RippleBox => ({
      x: 0,
      y: 0,
      width,
      height: width,
    });
    expect(isSmallFrame(disc(56))).toBe(true);
    expect(isSmallFrame(disc(20))).toBe(false);
    expect(isSmallFrame(disc(201))).toBe(false);
    expect(passesLeftEdge(ACTION, { ...disc(201), x: ACTION.x - 16 })).toBe(
      true,
    );
    expect(passesLeftEdge(ACTION, { ...disc(56), x: ACTION.x + 40 })).toBe(
      false,
    );
  });

  it("reads the share of the ink a frame sample carries", () => {
    // The two measured frames, from the window: a 56.5-point disc and a
    // 201-point one. Both samples sit on the fill-to-ink line, and the later
    // one is fainter because the disc fades as it grows.
    const share = shareOf({ r: 166, g: 168, b: 239 });
    expect(share).toBeCloseTo(SMALL_SHARE, 2);
    expect(isWash(share)).toBe(true);
    expect(isFainter(CLIP_SHARE, share)).toBe(true);
    expect(isFainter(share, share)).toBe(false);
  });

  it("refuses a sample that is not a wash of that ink", () => {
    // The fill itself is no wash, and the ink itself is not a faint one: a
    // layer painted in the action's own fill or one painted solid both fail.
    expect(isWash(shareOf(FILL))).toBe(false);
    expect(isWash(shareOf(INK))).toBe(false);
    // A second colour off the fill-to-ink line: the channels disagree.
    expect(
      Option.isNone(washShare({ r: 120, g: 168, b: 239 }, FILL, INK)),
    ).toBe(true);
    // Too few channels with a span to measure: two of them are rounding.
    expect(
      Option.isNone(
        washShare({ r: 176, g: 179, b: 255 }, FILL, { r: 178, g: 181, b: 26 }),
      ),
    ).toBe(true);
  });

  it("prints the press count in one line", () => {
    expect(rippleReadout(1)).toBe("presses=1");
    expect(rippleReadout(3)).toBe("presses=3");
  });
});

describe("the probe", () => {
  it("is registered under the layout capability", () => {
    const entry = liveRegistry.find(
      (candidate) => candidate.id === "ripple-lifecycle",
    );
    expect(entry?.capability).toBe("layout");
  });

  it("is mounted by the live runner", () => {
    expect(scenarios).toContain('"ripple-lifecycle": {');
    expect(scenarios).toContain("view: () => <RippleProbe />");
    expect(scenarios).toContain("steps: rippleSteps");
    expect(scenarios).toContain(
      'import { RippleProbe, rippleSteps } from "./ripple-button-probe.js";',
    );
  });

  it("mounts a named action with no visible label inside the measured box", () => {
    // A text run in the action would be a second paint to tell from the wash.
    const element = probe.slice(
      probe.indexOf("<RippleButton"),
      probe.indexOf("/>", probe.indexOf("<RippleButton")),
    );
    expect(element).toContain('aria-label="Ship the release"');
    expect(probe).not.toContain("</RippleButton>");
  });

  it("reads the fill from the frame under the pointer, not from the palette", () => {
    // A hovered filled action repaints in the theme's `filledHover` role, so the
    // wash has to be measured over the fill the glass actually shows.
    const steps = stepsOf();
    expect(steps).toContain("ctx.host.hoverAt(RIPPLE_IDS.action");
    expect(steps).toContain("const fill = yield* sample(");
    expect(steps).toContain("washShare(wash, fill, ink)");
    expect(steps).toContain("washShare(");
    expect(steps).toContain("fill,\n        ink,");
  });

  it("freezes the clock once per disc, so one capture fits inside the tween", () => {
    const steps = stepsOf();
    const pauses = Arr.length(
      Arr.fromIterable(steps.matchAll(/pauseClock\(\)/g)),
    );
    const resumes = Arr.length(
      Arr.fromIterable(steps.matchAll(/resumeClock\(\)/g)),
    );
    expect(pauses).toBe(2);
    expect(resumes).toBe(2);
    // The first pause comes before the first press, and the disc is captured
    // and sampled before the clock is resumed: the wash is a frozen progress.
    expect(steps.indexOf("yield* pauseClock()")).toBeLessThan(
      steps.indexOf("yield* pressAt("),
    );
    expect(steps.indexOf("captureFrame(SMALL)")).toBeLessThan(
      steps.indexOf("yield* resumeClock()"),
    );
    expect(RIPPLE_STEPS).toBeGreaterThan(0);
  });

  it("counts the checks the probe can assert", () => {
    const sites = Arr.length(
      Arr.fromIterable(stepsOf().matchAll(/ctx\.expect\w+\(/g)),
    );
    expect(sites).toBeGreaterThan(0);
    // The printed count is the run's own (the closures assert per call), so it
    // can only floor a probe: a site added without a count fails here.
    expect(RIPPLE_CHECKS).toBe(51);
    expect(RIPPLE_CHECKS).toBeGreaterThanOrEqual(sites);
  });
});

describe("the record", () => {
  it("documents the probe under the version it was measured on", () => {
    expect(sectionOf()).not.toBe("");
    expect(sectionOf()).toContain(`${RIPPLE_CHECKS} checks`);
    expect(sectionOf()).toContain("`--only ripple-lifecycle`");
  });

  it("prints the frames the probe measured", () => {
    const section = sectionOf();
    expect(section).toContain("240x160");
    expect(section).toContain("56.5");
    expect(section).toContain("201");
    expect(section).toContain("0.064");
    expect(section).toContain("0.0327");
    expect(section).toContain("presses=1");
    expect(section).toContain("presses=2");
    expect(section).toContain("presses=3");
  });

  it("names the probe among those measured alone", () => {
    const intro = /the\s+(\d+) probes a real window can prove/.exec(readme);
    expect(intro?.[1]).toBe(`${liveRegistry.length}`);
    const start = readme.indexOf("Measured alone since then:");
    const clause = readme.slice(start, readme.indexOf("(", start));
    expect(clause).toContain("`ripple-lifecycle`");
  });

  it("cites the probes the paint rests on", () => {
    // The wash's fill is the hover role, and the frame's clock is the renderer's:
    // a section that loses either citation stops saying why it measured them.
    expect(sectionOf()).toContain("`filled-action-dim`");
    expect(sectionOf()).toContain("`motion-geometry`");
  });
});
