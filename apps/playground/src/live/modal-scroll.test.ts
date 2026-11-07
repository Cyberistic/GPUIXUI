import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import { liveRegistry } from "./registry.js";
import {
  BODY_ROWS,
  DIALOG_CHROME_HEIGHT,
  DIALOG_CLOSE_TOP,
  DIALOG_VIEWPORT,
  MODAL_PAGE_ROWS,
  MODAL_ROW_HEIGHT,
  MODAL_SCROLL_IDS,
  MODAL_WHEEL,
  PAGE_ROW_WIDTH,
  PAGE_VIEWPORT,
  dialogContentHeight,
  dialogReadout,
  initialScrollReading,
  maxOffset,
  pageContentHeight,
  pageReadout,
} from "./modal-scroll.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const scenarios = read("./scenarios.tsx");
const readme = read("../../README.md");
const component = read("../../../../packages/components/src/dialog.tsx");
const runner = read("./run.ts");

const grouped = (value: number): string => {
  const text = String(Math.abs(value)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return value < 0 ? `-${text}` : text;
};

const stepsOf = (): string => {
  const start = scenarios.indexOf("const modalScrollSteps");
  const end = scenarios.indexOf("const SPLIT_CONTAINER", start);
  return start === -1 || end === -1 ? "" : scenarios.slice(start, end);
};

const sectionOf = (): string => {
  const heading = "### `modal-scroll-lifecycle` — measured on 0.11.0 here";
  const start = readme.indexOf(heading);
  if (start === -1) return "";
  const after = readme.slice(start + heading.length);
  const next = Math.min(
    ...[after.indexOf("\n### "), after.indexOf("\n## ")].filter(
      (index) => index !== -1,
    ),
  );
  return Number.isFinite(next)
    ? readme.slice(start, start + heading.length + next)
    : readme.slice(start);
};

const windowOf = (): number => {
  const window = /const WINDOW = \{ width: (\d+), height: (\d+) \}/.exec(
    runner,
  );
  return Number(window?.[1] ?? Number.NaN);
};

const dialogWidthOf = (): number => {
  const table =
    /const MAX_WIDTH: Readonly<Record<DialogSize, number>> = \{([^}]*)\}/.exec(
      component,
    );
  const entry = /md:\s*(\d+)/.exec(table?.[1] ?? "");
  return Number(entry?.[1] ?? Number.NaN);
};

describe("the fixture's geometry", () => {
  it("gives both scrollers somewhere to scroll", () => {
    expect(pageContentHeight).toBe(MODAL_PAGE_ROWS * MODAL_ROW_HEIGHT);
    expect(dialogContentHeight).toBe(
      BODY_ROWS * MODAL_ROW_HEIGHT + DIALOG_CHROME_HEIGHT,
    );
    expect(maxOffset(pageContentHeight, PAGE_VIEWPORT)).toBe(-1128);
    expect(maxOffset(dialogContentHeight, DIALOG_VIEWPORT)).toBe(-964);

    expect(DIALOG_CLOSE_TOP).toBe(44);
    expect(DIALOG_CHROME_HEIGHT).toBe(220);
  });

  it("keeps a page wheel short of both ends", () => {
    expect(Math.abs(MODAL_WHEEL)).toBeLessThan(
      -maxOffset(pageContentHeight, PAGE_VIEWPORT),
    );
    expect(Math.abs(MODAL_WHEEL)).toBeLessThan(
      -maxOffset(dialogContentHeight, DIALOG_VIEWPORT),
    );
  });

  it("aims the veil wheel outside the centred surface", () => {
    const window = windowOf();
    const surface = dialogWidthOf();
    expect(window).toBe(900);
    expect(surface).toBe(480);
    expect(PAGE_ROW_WIDTH / 2).toBeLessThan((window - surface) / 2);
    expect(PAGE_VIEWPORT).toBeLessThan(window);
    expect(DIALOG_VIEWPORT).toBeLessThan(window);
  });

  it("spells each readout, the page's viewport included", () => {
    expect(pageReadout(initialScrollReading, PAGE_VIEWPORT)).toBe(
      "page=x0 y0 events=0 viewport=472",
    );
    expect(dialogReadout({ x: 0, y: MODAL_WHEEL, events: 1 })).toBe(
      "dialog=x0 y-100 events=1",
    );
  });
});

describe("the reason the probe exists", () => {
  it("mounts the shipped dialog, whose veil and body are one occluded layer", () => {
    expect(component).toContain("occlude");
    expect(component).toContain('testId="dialog-backdrop"');
    expect(component).toContain('overflow: "scroll"');
  });

  it("holds the close control outside the scroller the body scrolls", () => {
    expect(component.indexOf("</DismissScope>")).toBeLessThan(
      component.indexOf('testId="dialog-close"'),
    );
    expect(component).not.toContain('position: "sticky"');
  });
});

describe("the probe", () => {
  it("is registered as a modal", () => {
    const entry = liveRegistry.find(
      (candidate) => candidate.id === "modal-scroll-lifecycle",
    );
    expect(entry?.capability).toBe("modal");
  });

  it("is mounted by the live runner with the shipped parts", () => {
    expect(scenarios).toContain('"modal-scroll-lifecycle": {');
    expect(scenarios).toContain("view: () => <ModalScrollProbe />");
    expect(scenarios).toContain("steps: modalScrollSteps");
    expect(scenarios).toContain("<DialogContent");
    expect(scenarios).toContain(`testId={MODAL_SCROLL_IDS.dialog}`);
    expect(scenarios).toContain('label="Scrolling dialog"');
  });

  it("reads its ids from the fixture rather than repeating strings", () => {
    const ids = Object.values(MODAL_SCROLL_IDS);
    expect(new Set(ids).size).toBe(ids.length);
    expect(scenarios).toContain("MODAL_SCROLL_IDS.page");
    expect(scenarios).toContain("MODAL_SCROLL_IDS.opener");
  });

  it("counts the checks the probe can assert", () => {
    const sites = Arr.length(
      Arr.fromIterable(stepsOf().matchAll(/ctx\.expect\w+\(/g)),
    );
    const painted = Arr.length(
      Arr.fromIterable(stepsOf().matchAll(/paintedBox\(ctx,/g)),
    );
    expect(sites + painted).toBe(35);
  });
});

describe("the record", () => {
  it("documents the probe under the version it was measured on", () => {
    const section = sectionOf();
    expect(section).not.toBe("");
    expect(section).toContain("35 checks");
    expect(section).toContain("`--only modal-scroll-lifecycle`");
  });

  it("prints the clamps the fixture derives", () => {
    const section = sectionOf();
    expect(section).toContain(
      grouped(maxOffset(pageContentHeight, PAGE_VIEWPORT)),
    );
    expect(section).toContain(
      grouped(maxOffset(dialogContentHeight, DIALOG_VIEWPORT)),
    );
    expect(section).toContain(grouped(dialogContentHeight));
    expect(section).toContain(grouped(pageContentHeight));
    expect(section).toContain(`${PAGE_VIEWPORT}`);
    expect(section).toContain(`${DIALOG_VIEWPORT}`);
    expect(section).toContain(`${DIALOG_CLOSE_TOP}`);
  });

  it("prints the close control staying put, not the carry the fix removed", () => {
    const section = sectionOf();

    expect(section).toContain("stays at `44`");
    expect(section).not.toContain("at `-932`");
    expect(section).not.toContain("takes the close control with it");
    expect(section).not.toContain("976 points above the surface");
  });

  it("names the component, the fixture and the wheel-stopping rule", () => {
    const section = sectionOf();
    expect(section).toContain("`DialogContent`");
    expect(section).toContain("src/live/modal-scroll.ts");
    expect(section).toContain("`occlude()`");
    expect(section).toContain("`onScroll`");
  });
});
