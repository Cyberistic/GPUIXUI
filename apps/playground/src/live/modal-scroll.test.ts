/**
 * Holds the `modal-scroll-lifecycle` fixture, the probe that drives it and the
 * section the README records it in.
 *
 * The gap this guards: `nested-scroll-lifecycle` measured that one wheel moves
 * every scrollable ancestor on the hit path, and `@gpuixui/primitives` documents
 * that `occlude()` "stops the wheel too" — but no window had measured an
 * `occlude` layer, so a modal's relationship to the page behind it was a claim
 * rather than evidence. The probe's expected numbers are the fixture's
 * arithmetic, so this suite holds the row counts, the two viewports, the wheel
 * delta and the row width that keeps a page wheel outside the centred surface
 * against the component and the runner they depend on. The check count is
 * derived from the probe's own assertion sites plus the two `paintedBox`
 * premises, so a check added without the README sentence (or the sentence
 * edited alone) fails here.
 *
 * `node:fs` is deliberate, as in the other live fixtures: this reads the
 * repository's own component, probe and prose, never a runtime path.
 */
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
const primitives = read(
  "../../../../packages/primitives/src/components/internal.ts",
);
const runner = read("./run.ts");

/** A number as the README prints it: thousands separated by a thin space. */
const grouped = (value: number): string => {
  const text = String(Math.abs(value)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return value < 0 ? `-${text}` : text;
};

/** This probe's steps, so a count cannot be read out of another probe. */
const stepsOf = (): string => {
  const start = scenarios.indexOf("const modalScrollSteps");
  const end = scenarios.indexOf("const SPLIT_CONTAINER", start);
  return start === -1 || end === -1 ? "" : scenarios.slice(start, end);
};

/** This probe's README section, so a value printed elsewhere cannot pass. */
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

/** The window the runner opens, from its own constant. */
const windowOf = (): number => {
  const window = /const WINDOW = \{ width: (\d+), height: (\d+) \}/.exec(
    runner,
  );
  return Number(window?.[1] ?? Number.NaN);
};

/** The dialog's `md` width, from the component's own table. */
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
    expect(maxOffset(dialogContentHeight, DIALOG_VIEWPORT)).toBe(-976);
    // The close control rides the body's scroll: where it lands at the end.
    expect(
      DIALOG_CLOSE_TOP + maxOffset(dialogContentHeight, DIALOG_VIEWPORT),
    ).toBe(-932);
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
    // The wheel is aimed at a page row's centre, so the row has to be narrow
    // enough that the point is on the veil rather than on the modal.
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
  it("reads the wheel-stopping rule from the primitives", () => {
    expect(primitives).toContain("`occlude()`");
    expect(primitives).toContain("stops the wheel too");
  });

  it("mounts the shipped dialog, whose veil and body are one occluded layer", () => {
    expect(component).toContain("occlude");
    expect(component).toContain('testId="dialog-backdrop"');
    expect(component).toContain('overflow: "scroll"');
  });

  it("holds the close control inside the scroller, which is why it scrolls", () => {
    // The measured gap: the surface scrolls and its own close control is an
    // absolutely positioned child of it, so a scrolled body carries the control
    // out of view. Pinned outside the scroller, this case fails first.
    expect(component.indexOf('overflow: "scroll"')).toBeLessThan(
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
    expect(section).toContain(
      grouped(
        DIALOG_CLOSE_TOP + maxOffset(dialogContentHeight, DIALOG_VIEWPORT),
      ),
    );
  });

  it("names the component, the fixture and the wheel-stopping rule", () => {
    const section = sectionOf();
    expect(section).toContain("`DialogContent`");
    expect(section).toContain("src/live/modal-scroll.ts");
    expect(section).toContain("`occlude()`");
    expect(section).toContain("`onScroll`");
  });
});
