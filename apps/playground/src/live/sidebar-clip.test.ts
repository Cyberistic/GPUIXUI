import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import { liveRegistry } from "./registry.js";
import {
  SIDEBAR_CHECKS,
  SIDEBAR_CONTENT_WIDTH,
  SIDEBAR_FILLS,
  SIDEBAR_IDS,
  SIDEBAR_MARKER_WIDTH,
  SIDEBAR_MARKER_X,
  SIDEBAR_MID_MAX,
  SIDEBAR_REST,
  SIDEBAR_ROW_HEIGHT,
  SIDEBAR_WIDTHS,
  hiddenMarkerBand,
  insideClipPoint,
  isTravelling,
  markerBand,
  outsideClipPoint,
  sidebarReadout,
  type SidebarBox,
} from "./sidebar-clip.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const probe = read("./sidebar-clip-probe.tsx");
const scenarios = read("./scenarios.tsx");
const readme = read("../../README.md");

const stepsOf = (): string => {
  const start = probe.indexOf("export const sidebarClipSteps");
  return probe.slice(start);
};

const sectionOf = (): string => {
  const heading = "### `sidebar-clip-lifecycle` — measured on 0.11.0 here";
  const start = readme.indexOf(heading);
  if (start === -1) return "";
  const end = readme.indexOf("\n## ", start + 1);
  return readme.slice(start, end === -1 ? undefined : end);
};

const ROW: SidebarBox = {
  x: 24,
  y: 88,
  width: 852,
  height: SIDEBAR_ROW_HEIGHT,
};

describe("the fixture", () => {
  it("puts the marker's band at the content's trailing edge", () => {
    expect(SIDEBAR_MARKER_X + SIDEBAR_MARKER_WIDTH).toBe(SIDEBAR_CONTENT_WIDTH);
    expect(SIDEBAR_MARKER_X).toBeGreaterThan(SIDEBAR_CONTENT_WIDTH / 2);
  });

  it("samples the mid frame where the clip covers less than the band", () => {
    expect(SIDEBAR_MID_MAX).toBeLessThan(SIDEBAR_MARKER_X);
    expect(isTravelling(SIDEBAR_MID_MAX)).toBe(true);
    expect(isTravelling(SIDEBAR_WIDTHS.open)).toBe(false);
    expect(isTravelling(SIDEBAR_WIDTHS.closed)).toBe(false);
  });

  it("counts only the band the clip does not cover", () => {
    expect(hiddenMarkerBand(ROW, ROW.x + SIDEBAR_WIDTHS.open).width).toBe(0);
    expect(markerBand(ROW).width).toBe(SIDEBAR_MARKER_WIDTH);

    expect(hiddenMarkerBand(ROW, ROW.x + SIDEBAR_MID_MAX).width).toBe(
      SIDEBAR_MARKER_WIDTH,
    );
    expect(hiddenMarkerBand(ROW, ROW.x).width).toBe(SIDEBAR_MARKER_WIDTH);

    expect(hiddenMarkerBand(ROW, ROW.x + 220).width).toBe(
      SIDEBAR_MARKER_X + SIDEBAR_MARKER_WIDTH - 220,
    );

    expect(hiddenMarkerBand(ROW, ROW.x + 220).x).toBe(ROW.x + 220);
    expect(hiddenMarkerBand(ROW, ROW.x).x).toBe(ROW.x + SIDEBAR_MARKER_X);
  });

  it("puts the two samples on either side of the clip's edge", () => {
    const edge = ROW.x + 120;
    expect(insideClipPoint(edge, 6, ROW.y).x).toBe(edge - 6);
    expect(outsideClipPoint(edge, 6, ROW.y).x).toBe(edge + 6);
    expect(insideClipPoint(edge, 6, ROW.y).x).toBeGreaterThan(ROW.x);
    expect(outsideClipPoint(edge, 6, ROW.y).x).toBeLessThan(ROW.x + ROW.width);
  });

  it("keeps every id and fill apart", () => {
    const ids = Object.values(SIDEBAR_IDS);
    expect(new Set(ids).size).toBe(ids.length);
    const fills = Object.values(SIDEBAR_FILLS);
    expect(new Set(fills).size).toBe(fills.length);
  });

  it("prints the state and the two press counters in one line", () => {
    expect(sidebarReadout(SIDEBAR_REST)).toBe("open=true marker=0 main=0");
    expect(
      sidebarReadout({ open: false, markerPresses: 0, mainPresses: 2 }),
    ).toBe("open=false marker=0 main=2");
  });
});

describe("the probe", () => {
  it("is registered under the panel capability", () => {
    const entry = liveRegistry.find(
      (candidate) => candidate.id === "sidebar-clip-lifecycle",
    );
    expect(entry?.capability).toBe("panel");
  });

  it("is mounted by the live runner", () => {
    expect(scenarios).toContain('"sidebar-clip-lifecycle": {');
    expect(scenarios).toContain("view: () => <SidebarClipProbe />");
    expect(scenarios).toContain("steps: sidebarClipSteps");
    expect(scenarios).toContain(
      'import { SidebarClipProbe, sidebarClipSteps } from "./sidebar-clip-probe.js";',
    );
  });

  it("clips the animated box while the content keeps its width", () => {
    const animated = probe.slice(
      probe.indexOf("<motion.div"),
      probe.indexOf("</motion.div>"),
    );
    expect(animated).toContain('overflow: "hidden"');
    expect(animated).toContain("width: open ? SIDEBAR_WIDTHS.open");
    expect(animated).toContain("transition={SIDEBAR_TWEEN}");

    expect(probe).toContain("flexShrink: 0");
    expect(probe).toContain("width: SIDEBAR_CONTENT_WIDTH");

    expect(probe).toContain("testId={SIDEBAR_IDS.content} style={content}");
  });

  it("paints the document under the sidebar, so overflow would land on it", () => {
    const document = probe.indexOf("testId={SIDEBAR_IDS.main}");
    const clip = probe.indexOf("testId={SIDEBAR_IDS.clip}");
    expect(document).toBeGreaterThan(-1);
    expect(clip).toBeGreaterThan(document);
    expect(probe).toContain('position: "absolute" as const');
    expect(probe).toContain('position: "relative" as const');
  });

  it("freezes the motion clock before the press and resumes it after the frame", () => {
    const steps = stepsOf();
    const pause = steps.indexOf("yield* pauseClock()");
    const press = steps.indexOf("yield* ctx.host.click(SIDEBAR_IDS.toggle)");
    const travel = steps.indexOf("yield* travel(SIDEBAR_STEPS)");
    const resume = steps.indexOf("yield* resumeClock()");
    expect(pause).toBeGreaterThan(-1);
    expect(press).toBeGreaterThan(pause);
    expect(travel).toBeGreaterThan(press);
    expect(resume).toBeGreaterThan(travel);

    expect(steps).toContain("ctx.host.clockPause");
    expect(steps).toContain("ctx.host.clockFastForward");
    expect(steps).toContain("ctx.host.clockResume");
  });

  it("aims a press at the clipped marker before and after the collapse", () => {
    const steps = stepsOf();
    const clicks = Arr.length(
      Arr.fromIterable(
        steps.matchAll(/ctx\.host\.click\(SIDEBAR_IDS\.marker\)/g),
      ),
    );
    expect(clicks).toBe(3);

    const midCapture = steps.indexOf("captureFrame(MID)");
    const firstPress = steps.indexOf("ctx.host.click(SIDEBAR_IDS.marker)");
    expect(midCapture).toBeGreaterThan(-1);
    expect(firstPress).toBeGreaterThan(midCapture);
  });

  it("counts the checks the probe can assert", () => {
    const sites = Arr.length(
      Arr.fromIterable(stepsOf().matchAll(/ctx\.expect\w+\(/g)),
    );
    expect(sites).toBeGreaterThan(0);

    expect(SIDEBAR_CHECKS).toBeGreaterThanOrEqual(sites);
  });
});

describe("the record", () => {
  it("documents the probe under the version it was measured on", () => {
    expect(sectionOf()).not.toBe("");
    expect(sectionOf()).toContain(`${SIDEBAR_CHECKS} checks`);
    expect(sectionOf()).toContain("`--only sidebar-clip-lifecycle`");
  });

  it("prints the states the probe measured", () => {
    const section = sectionOf();
    expect(section).toContain("open");
    expect(section).toContain("marker=1");
    expect(section).toContain("main=1");
    expect(section).toContain("main=2");
    expect(section).toContain("paints **0** red");
    expect(section).toContain("The content reports **240** in every state");
  });

  it("names the probe among those measured alone", () => {
    const intro = /the\s+(\d+) probes a real window can prove/.exec(readme);
    expect(intro?.[1]).toBe(`${liveRegistry.length}`);
    const start = readme.indexOf("Measured alone since then:");
    const clause = readme.slice(start, readme.indexOf("(", start));
    expect(clause).toContain("`sidebar-clip-lifecycle`");
  });

  it("cites the probes that measured the other halves", () => {
    expect(sectionOf()).toContain("`dock-focus-lifecycle`");
    expect(sectionOf()).toContain("`motion-geometry`");
  });
});
