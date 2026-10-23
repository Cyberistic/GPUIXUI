/**
 * Holds what the `scrollbar-drag` probe aims at, and the finding its README
 * section prints: the runtime's scrollbar is painted with **no hitbox**, so a
 * pointer cannot grab the thumb.
 *
 * The bug this file guards is a claim, not a formula. The pinned binding's
 * `scrollbar_overlay` is a `canvas` whose own doc comment says it "has no
 * hitbox and takes no input", and the window reads the consequence: a drag on
 * the thumb's centre and a press on the track below it leave the offset at
 * zero, while the same drag runs a sibling React handle's eight moves and a
 * wheel moves the same scroller. A page that promised a draggable native
 * scrollbar would be teaching a gesture the runtime does not have.
 *
 * `node:fs` is deliberate, as in `scrollbar-both.test.ts`: this reads the
 * repository's own probe, host and Markdown, never a runtime path.
 */
import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { liveRegistry } from "./registry.js";
import { thumbOf } from "./scrollbar.js";
import {
  DRAG_BAND,
  DRAG_BY,
  DRAG_CHECKS,
  DRAG_CONTENT,
  DRAG_GRAB,
  DRAG_IDS,
  DRAG_THICKNESS,
  DRAG_THUMB,
  DRAG_TRACK_GRAB,
  DRAG_VIEWPORT,
  DRAG_WHEEL,
  dragThumbAfter,
} from "./scrollbar-drag.js";

const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);

const liveScenarios = readFileSync(
  new URL("./scenarios.tsx", import.meta.url),
  "utf8",
);

const liveHost = readFileSync(new URL("./host.ts", import.meta.url), "utf8");

const hostContract = readFileSync(
  new URL("../../../../packages/testing/src/smoke.ts", import.meta.url),
  "utf8",
);

/** The section's prose on one line, so a wrapped sentence still reads whole. */
const flat = readme.replace(/\s+/g, " ");

describe("what the scrollbar drag aims at", () => {
  it("puts the press on the thumb's own centre", () => {
    // A 160 px track over 700 px of content: 160² / 860 = 29.8 raw, floored by
    // the 20 px minimum? No — the share wins at 37, which is the thumb the
    // window painted.
    expect(DRAG_THUMB).toEqual({ start: 0, length: 37 });
    expect(DRAG_VIEWPORT.height / 2 + DRAG_GRAB.y).toBe(18.5);
    expect(DRAG_VIEWPORT.width / 2 + DRAG_GRAB.x).toBe(
      DRAG_VIEWPORT.width - DRAG_THICKNESS / 2,
    );
    // The press is inside the band the probe reads the tint from.
    expect(DRAG_VIEWPORT.width / 2 + DRAG_GRAB.x).toBeGreaterThanOrEqual(
      DRAG_BAND.x,
    );
    expect(DRAG_VIEWPORT.height / 2 + DRAG_GRAB.y).toBeLessThan(
      DRAG_THUMB.start + DRAG_THUMB.length,
    );
  });

  it("puts the second press on the track below the thumb", () => {
    const y = DRAG_VIEWPORT.height / 2 + DRAG_TRACK_GRAB.y;
    expect(y).toBe(120);
    // Below the thumb's end, so a press there is the track rather than the
    // thumb — the two cases a scrollbar distinguishes.
    expect(y).toBeGreaterThan(DRAG_THUMB.start + DRAG_THUMB.length);
    expect(DRAG_TRACK_GRAB.x).toBe(DRAG_GRAB.x);
  });

  it("moves the thumb by the rule the other scroll probes share", () => {
    // The wheel's offset puts the thumb a third of the way down its free track;
    // restating the arithmetic here would let the paint and the read drift.
    expect(dragThumbAfter(0)).toEqual(DRAG_THUMB);
    expect(dragThumbAfter(DRAG_WHEEL)).toEqual(
      Option.getOrElse(
        thumbOf(DRAG_VIEWPORT.height, DRAG_CONTENT, DRAG_WHEEL),
        () => ({ start: 0, length: 0 }),
      ),
    );
    expect(dragThumbAfter(DRAG_WHEEL).start).toBe(23);
    expect(dragThumbAfter(DRAG_WHEEL).length).toBe(DRAG_THUMB.length);
  });

  it("keeps the drags apart from the wheel's offset", () => {
    expect(DRAG_WHEEL).toBeLessThan(0);
    expect(DRAG_BY).toBeLessThan(DRAG_CONTENT - DRAG_VIEWPORT.height);
    expect(new Set(Object.values(DRAG_IDS)).size).toBe(
      Object.values(DRAG_IDS).length,
    );
  });

  it("counts the checks the probe asserts", () => {
    expect(DRAG_CHECKS).toBe(1 + 1 + 1 + 3 + 3 + 3 + 2 + 2 + 2 + 3);
    expect(DRAG_CHECKS).toBe(21);
  });
});

describe("the scrollbar-drag probe's record", () => {
  it("registers the probe with the scroll capability", () => {
    expect(
      Arr.filter(liveRegistry, (probe) => probe.id === "scrollbar-drag"),
    ).toEqual([
      {
        id: "scrollbar-drag",
        title: expect.stringContaining("scrollbar"),
        capability: "scroll",
      },
    ]);
  });

  it("documents it under the version it was measured on", () => {
    expect(readme).toContain("### `scrollbar-drag` — measured on 0.11.0 here");
    const printed = Number(
      /(\d+) checks, `--only scrollbar-drag`/.exec(readme)?.[1] ?? Number.NaN,
    );
    expect(printed).toBe(DRAG_CHECKS);
  });

  it("states the finding, its mechanism and its control", () => {
    expect(flat).toContain(
      "The runtime's scrollbar thumb takes no pointer input",
    );
    expect(flat).toContain("has no hitbox and takes no input");
    expect(flat).toContain("`renderer.rs`");
    // Both directions: what does nothing and what proves the drag works.
    expect(flat).toContain("a drag from the thumb's own centre, 40 px down");
    expect(flat).toContain(
      "the same drag on a sibling handle that listens for it",
    );
    expect(flat).toContain("one `-100` wheel on the same scroller");
  });

  it("prints the reads the window gave", () => {
    expect(flat).toContain("the offset is `x=0 y=0`");
    expect(flat).toContain("the thumb paints 37 px long");
    expect(flat).toContain("`moves=8`");
    expect(flat).toContain("`y = -100`");
    expect(flat).toContain("the thumb paints from **23**");
  });
});

describe("the probe asks the question the section answers", () => {
  it("aims the presses from the scroller's centre, not at an element", () => {
    expect(liveScenarios).toContain("offset: DRAG_GRAB");
    expect(liveScenarios).toContain("offset: DRAG_TRACK_GRAB");
    expect(liveScenarios).toContain("viewportTestId={DRAG_IDS.scroller}");
  });

  it("mounts the handle control and the wheel that does work", () => {
    expect(liveScenarios).toContain("testId={DRAG_IDS.handle}");
    expect(liveScenarios).toContain("onMouseMove={() => {");
    expect(liveScenarios).toContain("host.drag(DRAG_IDS.handle, 0, DRAG_BY)");
    expect(liveScenarios).toContain(
      "host.wheel(DRAG_IDS.scroller, 0, DRAG_WHEEL)",
    );
  });

  it("forwards the drag start through the host contract", () => {
    // The offset is what lets a probe aim inside an element; a host that
    // dropped it would press the scroller's centre and measure the content.
    expect(hostContract).toContain("export interface AsyncDragOptions");
    expect(hostContract).toContain("readonly offset?: DragStart");
    expect(liveHost).toContain("at(testId).dragBy(deltaX, deltaY, options)");
  });
});
