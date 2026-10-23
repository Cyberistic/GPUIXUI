/**
 * Holds the `menu-radio-lifecycle` fixture, the probe that paints it and the
 * section a plan reads.
 *
 * The bug this guards: a radio row's state is one check mark in a fixed leading
 * slot, so the row's box is the same marked or not — `aria-selected` and the
 * mark's accessible name are renderer facts, and only a frame says whether the
 * `primary` ink reached the glass. The probe's reading is a tolerance count (a
 * 16-point glyph's 1.33-point stroke has no fully covered pixel), and the four
 * row readings are what this suite holds: the ink is on the chosen row, the
 * choice moves it, and the chosen row's own press reports nothing.
 *
 * `node:fs` is deliberate, as in the other live fixtures: this reads the
 * repository's own probe and prose, never a runtime path.
 */
import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { palettes } from "../palettes.js";
import {
  counterOf,
  inkDistance,
  isMarkInk,
  MARK_TOLERANCE,
  MENU_RADIO_CHECKS,
  MENU_RADIO_IDS,
  MENU_RADIO_INITIAL,
  MENU_RADIO_LABEL,
  MENU_RADIO_NEXT,
  MENU_RADIO_NEXT_ID,
  MENU_RADIO_OPTIONS,
  markInk,
  menuRadioReadout,
  rgbOf,
  valueOf,
} from "./menu-radio.js";
import { liveRegistry } from "./registry.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const probe = read("./menu-radio-probe.tsx");
const registry = read("./registry.ts");
const readme = read("../../README.md");

/** The probe's own steps, so a count cannot be read out of another probe. */
const stepsOf = (): string => {
  const start = probe.indexOf("export const menuRadioSteps");
  return start === -1 ? "" : probe.slice(start);
};

/** This probe's README section, so a value printed elsewhere cannot pass. */
const sectionOf = (): string => {
  const heading = "### `menu-radio-lifecycle` — measured on 0.11.0 here";
  const start = readme.indexOf(heading);
  if (start === -1) return "";
  const end = readme.indexOf("\n## ", start + 1);
  return readme.slice(start, end === -1 ? undefined : end);
};

/**
 * The ink the frame was measured against.
 *
 * An unreadable role gives black, which every closeness assertion below then
 * fails: the fallback cannot make a bad palette pass.
 */
const ink = Option.getOrElse(
  rgbOf(markInk(palettes.dark.colors.primary)),
  () => ({ r: 0, g: 0, b: 0 }),
);

describe("the readout", () => {
  it("prints the value, then the reports and the opens and closes", () => {
    expect(
      menuRadioReadout({ value: "system", reports: 0, opens: 1, closes: 0 }),
    ).toBe("value=system reports=0 opens=1 closes=0");
    expect(valueOf("value=dark reports=3 opens=4 closes=2")).toEqual(
      Option.some("dark"),
    );
    expect(valueOf("no value here")).toEqual(Option.none());
    expect(
      counterOf("value=dark reports=3 opens=4 closes=2", "reports"),
    ).toEqual(Option.some(3));
    expect(counterOf("value=dark reports=3 opens=4 closes=2", "opens")).toEqual(
      Option.some(4),
    );
    expect(counterOf("value=dark reports=3", "closes")).toEqual(Option.none());
  });
});

describe("the mark's ink", () => {
  it("counts a glyph whose stroke has no fully covered pixel", () => {
    // The measured closest pixel: 82% of the ink over the popover fill.
    expect(MARK_TOLERANCE).toBeLessThan(inkDistance(173, 175, 179, ink));
    expect(MARK_TOLERANCE).toBeGreaterThan(inkDistance(143, 145, 217, ink));
    expect(isMarkInk(143, 145, 217, ink)).toBe(true);
  });

  it("refuses the row's label and its fill", () => {
    // The row's own text is 67 away at its measured coverage; the fill further.
    expect(isMarkInk(173, 175, 179, ink)).toBe(false);
    expect(
      isMarkInk(
        Number.parseInt(palettes.dark.colors.popover.slice(1, 3), 16),
        Number.parseInt(palettes.dark.colors.popover.slice(3, 5), 16),
        Number.parseInt(palettes.dark.colors.popover.slice(5, 7), 16),
        ink,
      ),
    ).toBe(false);
  });
});

describe("the probe", () => {
  it("mounts the shipped menu and one radio row per choice", () => {
    expect(probe).toContain("DropdownMenuRadioGroup");
    expect(probe).toContain("DropdownMenuRadioItem");
    // The rows, ids and group name come from the fixture, not a second list.
    expect(probe).toContain("Arr.map(MENU_RADIO_OPTIONS");
    expect(probe).toContain("testId={option.testId}");
    expect(probe).toContain("value={option.value}");
    expect(probe).toContain("label={MENU_RADIO_LABEL}");
    expect(probe).toContain("value={value}");
    expect(probe).toContain("setReports");
    expect(probe).toContain("setOpens");
    expect(probe).toContain("setCloses");
  });

  it("reads the primary ink inside each row's own box", () => {
    expect(probe).toContain("countsByRow");
    expect(probe).toContain("markInk(palettes.dark.colors.primary)");
    expect(probe).toContain("isMarkInk");
    expect(probe).toContain("rowBoxes");
    expect(stepsOf()).toContain("the chosen row paints the mark");
    expect(stepsOf()).toContain("the mark follows the value to the next row");
    expect(stepsOf()).toContain("no other row paints the mark");
    expect(stepsOf()).toContain("choosing the chosen row reports nothing");
  });

  it("counts the checks the probe can assert", () => {
    const sites = Arr.length(
      Arr.fromIterable(stepsOf().matchAll(/ctx\.expect\w+\(/g)),
    );
    expect(sites).toBeGreaterThan(0);
    // Capture and row helpers assert once per call, so the printed count floors
    // the sites in the steps.
    expect(MENU_RADIO_CHECKS).toBeGreaterThanOrEqual(sites);
  });
});

describe("the registry and the record", () => {
  it("declares the probe as an input the window can prove", () => {
    const meta = Arr.findFirst(
      liveRegistry,
      (entry) => entry.id === "menu-radio-lifecycle",
    );
    expect(Option.map(meta, (entry) => entry.capability)).toEqual(
      Option.some("input"),
    );
    expect(registry).toContain('id: "menu-radio-lifecycle"');
  });

  it("documents the probe under the version it was measured on", () => {
    expect(sectionOf()).not.toBe("");
    expect(sectionOf()).toContain(`${MENU_RADIO_CHECKS} checks`);
    expect(sectionOf()).toContain("`--only menu-radio-lifecycle`");
    expect(sectionOf()).toContain("menu-radio.png");
    expect(sectionOf()).toContain("menu-radio-next.png");
  });

  it("states the three rules a plan needs", () => {
    const section = sectionOf();
    expect(section).toContain("The mark is the row's state");
    expect(section).toContain("A radio choice closes the surface");
    expect(section).toContain("The chosen row's own press reports nothing");
    // The measurement is a paint count, not a layout read.
    expect(section).toContain("41");
  });

  it("names the rows and the choice the probe drives", () => {
    expect(MENU_RADIO_OPTIONS.map((option) => option.value)).toEqual([
      "system",
      "light",
      "dark",
    ]);
    expect(MENU_RADIO_OPTIONS.map((option) => option.testId)).toEqual([
      MENU_RADIO_IDS.system,
      MENU_RADIO_IDS.light,
      MENU_RADIO_IDS.dark,
    ]);
    expect(MENU_RADIO_INITIAL).toBe("system");
    expect(MENU_RADIO_NEXT).toBe("dark");
    expect(MENU_RADIO_NEXT_ID).toBe(MENU_RADIO_IDS.dark);
    expect(MENU_RADIO_LABEL).toBe("Appearance");
  });
});
