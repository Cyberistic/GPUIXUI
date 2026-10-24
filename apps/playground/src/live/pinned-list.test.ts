/**
 * The `pinned-list-lifecycle` fixture, held to the arithmetic its probe reads.
 *
 * The probe measures a window, so its premises must be refused before a window
 * opens: the list must have travel, the wheel must land inside it, the pressed
 * row's centre must lie under the held title (a centre below the title would
 * make the pass-through check measure a free row), and a wheel past the first
 * section's end must really retire its title while leaving the second at the
 * top. The printed check count is derived from the probe's own assertion sites,
 * so a check added without the README fails here.
 *
 * The press the held title lets through is a premise now that the component's
 * painted header carries the opt-out: the probe's expectation, the page's rule
 * and the component's two declarations are held together, so restoring the
 * measured limitation fails before a window opens.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  PINNED_CONTENT,
  PINNED_END_WHEEL,
  PINNED_HEADER,
  PINNED_IDS,
  PINNED_MAX,
  PINNED_RETURN_WHEEL,
  PINNED_ROW_HEIGHT,
  PINNED_SECTION_HEIGHT,
  PINNED_VIEWPORT,
  PINNED_WHEEL,
  pinnedReadout,
  ROW_TODAY_TOP,
  rowCentre,
} from "./pinned-list.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const readme = read("../../README.md");

describe("the pinned-list fixture", () => {
  it("gives the list more content than it shows", () => {
    expect(PINNED_CONTENT).toBe(2 * PINNED_SECTION_HEIGHT);
    expect(PINNED_CONTENT).toBe(464);
    expect(PINNED_MAX).toBe(PINNED_VIEWPORT.height - PINNED_CONTENT);
    expect(PINNED_MAX).toBe(-304);
  });

  it("puts the pressed row's centre under the held title", () => {
    // The point the host's click presses is the row's centre. At rest it is
    // below the title; at the probe's wheel it must be inside the title's own
    // 32-point row, or the pass-through check would press a free row.
    expect(rowCentre(ROW_TODAY_TOP, PINNED_ROW_HEIGHT, 0)).toBe(132);
    const held = rowCentre(ROW_TODAY_TOP, PINNED_ROW_HEIGHT, PINNED_WHEEL);
    expect(held).toBe(12);
    expect(held > 2 && held < PINNED_HEADER - 2).toBe(true);
  });

  it("retires the first title at the end and leaves the second at the top", () => {
    const firstBottom = PINNED_SECTION_HEIGHT + PINNED_MAX;
    const secondTop = PINNED_SECTION_HEIGHT + PINNED_MAX;
    expect(firstBottom).toBe(-72);
    expect(firstBottom < 0).toBe(true);
    expect(secondTop < 0).toBe(true);
    // The second section's own bottom is still inside the viewport, so its
    // title clamps to the top instead of being pushed out.
    expect(PINNED_CONTENT + PINNED_MAX).toBe(PINNED_VIEWPORT.height);
  });

  it("asks for travel in both directions", () => {
    expect(PINNED_WHEEL < 0 && PINNED_WHEEL > PINNED_MAX).toBe(true);
    expect(PINNED_END_WHEEL < PINNED_MAX).toBe(true);
    expect(PINNED_RETURN_WHEEL > 0).toBe(true);
  });

  it("spells the readout one way", () => {
    expect(
      pinnedReadout({
        offsetY: -120,
        today: 1,
        yesterday: 0,
        covered: 0,
        cover: 1,
      }),
    ).toBe("y=-120 presses=1,0 control=0,1");
  });

  it("gives every element its own id", () => {
    const ids = Object.values(PINNED_IDS);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("presses the row through the held title, and records the rule", () => {
    // The press the window measures is the row's own. Restoring the pre-fix
    // expectation would make the probe red against the shipped component, so
    // the premise is held here rather than discovered when a window opens.
    const probe = read("./pinned-list-probe.tsx");
    const press = probe.indexOf(
      "a press through the held title reaches the row beneath it",
    );
    expect(press).toBeGreaterThan(-1);
    expect(probe.slice(press, press + 300)).toContain("today: 2");
    expect(probe).not.toContain(
      "the held title takes the press the row beneath it would have taken",
    );

    const section = readme.slice(readme.indexOf("### `pinned-list-lifecycle`"));
    expect(section).toContain(
      "| a press on the row **under the held title** | `presses=2,0` — the press reaches the row |",
    );
    expect(section).toContain("The opt-out belongs to the element that paints.");
    expect(section).toContain("filled cover");
    expect(section).not.toContain("`presses` stays `1`");
  });

  it("prints the checks the probe actually asserts", () => {
    // A helper costs one check per call: `box`, `capture`, `sample` and
    // `readout` each read one assertion, and every direct `ctx.expect*` call
    // stands alone. The helpers' own inner assertion sites are subtracted, so a
    // definition is not counted as a step, and the helper *calls* — including
    // the ones a `const` binds — are added once per call.
    const probe = read("./pinned-list-probe.tsx");
    // The steps start at the first read of the mounted list; the definitions
    // above it are the helpers, whose own assertions are counted through their
    // calls instead.
    const steps = probe.slice(probe.indexOf("const viewport = yield* box("));
    const direct = steps.match(/yield\* ctx\.expect[A-Za-z]+\(/g)?.length ?? 0;
    const throughHelpers =
      steps.match(/yield\* (?:box|capture|sample|readout)\(/g)?.length ?? 0;
    const asserted = direct + throughHelpers;
    expect(asserted).toBeGreaterThan(30);
    const printed = Number(
      /(\d+) checks, `--only pinned-list-lifecycle`/.exec(readme)?.[1] ??
        Number.NaN,
    );
    expect(printed).toBe(asserted);
  });

  it("carries the opt-out on the header and the text that paint", () => {
    // A declaration on the layer alone leaves the title's own fill in the hit
    // test; both elements have to say it, which is why the rule is stated here
    // as well as in the component's behaviour suite.
    const pinned = read("../../../../packages/components/src/pinned-list.tsx");
    const header = pinned.slice(
      pinned.indexOf("testId={`pinned-header-${frame.index}`}"),
    );
    expect(header.slice(0, header.indexOf("<text"))).toContain(
      'pointerEvents: "none"',
    );
    expect(header.slice(0, header.indexOf("</div>"))).toContain(
      'pointerEvents: "none"',
    );
  });
});
