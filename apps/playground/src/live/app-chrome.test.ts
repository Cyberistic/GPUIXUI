/**
 * Holds the `app-chrome-lifecycle` fixture, the window probe that paints it and
 * the section a plan reads.
 *
 * The bug this guards: `@gpuixui/shell`'s three chrome parts shipped with pure
 * navigation suites only, so no renderer had mounted them — a dropdown that
 * never paints below its trigger, a roving stop that moves an internal number
 * but not the native focus, or a status tone painted in the label's role would
 * have passed every test. The probe reads those three facts in a window, and
 * this suite holds the fixture values those readings depend on: the tone
 * tolerance stays under the gap between the label and every tone, the overflow
 * split agrees with the package's own `splitOverflow`, and the printed count
 * and section cannot drift from the probe.
 *
 * `node:fs` is deliberate, as in the other live fixtures: this reads the
 * repository's own probe and prose, never a runtime path.
 */
import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { statusTone } from "@gpuixui/tokens";
import { splitOverflow, type ToolbarItemSpec } from "@gpuixui/shell";
import { describe, expect, it } from "vitest";
import { palettes } from "../palettes.js";
import {
  actionId,
  APP_CHROME_ACTIONS,
  APP_CHROME_CHECKS,
  APP_CHROME_MENUS,
  APP_CHROME_OVERFLOW,
  APP_CHROME_STATUS_LEFT,
  APP_CHROME_STATUS_RIGHT,
  APP_CHROME_TOOLBAR_MAX,
  appChromeReadout,
  counterOf,
  fieldOf,
  inkDistance,
  itemId,
  overflowItemId,
  OVERFLOW_ID,
  TONE_TOLERANCE,
  triggerId,
} from "./app-chrome.js";
import { liveRegistry } from "./registry.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const probe = read("./app-chrome-probe.tsx");
const registry = read("./registry.ts");
const scenarios = read("./scenarios.tsx");
const readme = read("../../README.md");

/** The step function alone, so a count cannot be read out of the view. */
const stepsOf = (): string => {
  const start = probe.indexOf("export const appChromeSteps");
  return start === -1 ? "" : probe.slice(start);
};

/** This probe's README section, so a value printed elsewhere cannot pass. */
const sectionOf = (): string => {
  const heading = "### `app-chrome-lifecycle` — measured on 0.11.0 here";
  const start = readme.indexOf(heading);
  if (start === -1) return "";
  const end = readme.indexOf("\n## ", start + 1);
  return readme.slice(start, end === -1 ? undefined : end);
};

/** The dark palette's label ink, which sits beside both tones in the bar. */
const label = palettes.dark.colors.foreground;

const destructive = statusTone(palettes.dark, "destructive").foreground;
const success = statusTone(palettes.dark, "success").foreground;

/** The distance between two `#rrggbb` colours. */
const distance = (left: string, right: string): number => {
  const channel = (hex: string, at: number): number =>
    Number.parseInt(hex.slice(1 + at * 2, 3 + at * 2), 16);
  return inkDistance(channel(left, 0), channel(left, 1), channel(left, 2), {
    r: channel(right, 0),
    g: channel(right, 1),
    b: channel(right, 2),
  });
};

describe("the readout", () => {
  it("prints both selections, then their counters", () => {
    expect(
      appChromeReadout({
        menu: "file/new",
        action: "copy",
        menuReports: 1,
        actionReports: 2,
      }),
    ).toBe("menu=file/new action=copy menuReports=1 actionReports=2");
    expect(fieldOf("menu=file/save action=none menuReports=2", "menu")).toEqual(
      Option.some("file/save"),
    );
    expect(
      fieldOf("menu=file/save action=none menuReports=2", "action"),
    ).toEqual(Option.some("none"));
    expect(fieldOf("action=copy", "menu")).toEqual(Option.none());
    expect(counterOf("menuReports=2 actionReports=0", "actionReports")).toEqual(
      Option.some(0),
    );
    expect(counterOf("menuReports=2", "actionReports")).toEqual(Option.none());
  });
});

describe("the tone ink", () => {
  it("separates a tone from the label painted beside it", () => {
    // Both status tones are pale; the label is paler still. The tolerance is
    // small enough that a tone count cannot read a plain label's antialiasing.
    expect(distance(label, destructive)).toBeGreaterThan(TONE_TOLERANCE * 3);
    expect(distance(label, success)).toBeGreaterThan(TONE_TOLERANCE * 3);
    expect(distance(destructive, success)).toBeGreaterThan(TONE_TOLERANCE * 3);
    expect(inkDistance(0, 0, 0, { r: 0, g: 0, b: 0 })).toBe(0);
  });

  it("names the roles the fixture's trailing group wears", () => {
    expect(
      Arr.filter(APP_CHROME_STATUS_RIGHT, (item) => item.tone === "destructive")
        .length,
    ).toBe(1);
    expect(
      Arr.filter(APP_CHROME_STATUS_RIGHT, (item) => item.tone === "success")
        .length,
    ).toBe(1);
    expect(
      Arr.every(APP_CHROME_STATUS_LEFT, (item) => item.tone === undefined),
    ).toBe(true);
  });
});

describe("the fixture", () => {
  it("carries a disabled row and a disabled menu the keys must skip", () => {
    expect(Arr.map(APP_CHROME_MENUS, (menu) => menu.id)).toEqual([
      "file",
      "edit",
      "help",
    ]);
    expect(APP_CHROME_MENUS[2]?.disabled).toBe(true);
    expect(
      Arr.filter(
        APP_CHROME_MENUS[0]?.items ?? [],
        (item) => item.disabled === true,
      ).map((item) => item.id),
    ).toEqual(["open"]);
    expect(triggerId("file")).toBe("app-menu-trigger-file");
    expect(itemId("open")).toBe("app-menu-item-open");
    expect(actionId("copy")).toBe("toolbar-action-copy");
    expect(OVERFLOW_ID).toBe("toolbar-overflow");
    expect(overflowItemId("link")).toBe("toolbar-overflow-item-link");
  });

  it("agrees with the package's own overflow split", () => {
    const specs: ReadonlyArray<ToolbarItemSpec> = Arr.map(
      APP_CHROME_ACTIONS,
      (action) => ({ id: action.id, disabled: action.disabled === true }),
    );
    const split = splitOverflow(specs, APP_CHROME_TOOLBAR_MAX);
    expect(Arr.map(split.visible, (item) => item.id)).toEqual([
      "open",
      "save",
      "copy",
    ]);
    expect(Arr.map(split.overflow, (item) => item.id)).toEqual(
      APP_CHROME_OVERFLOW,
    );
  });
});

describe("the probe", () => {
  it("mounts the three shipped chrome parts over the fixture", () => {
    expect(probe).toContain("AppMenu");
    expect(probe).toContain("Toolbar");
    expect(probe).toContain("StatusBar");
    expect(probe).toContain("menus={APP_CHROME_MENUS}");
    expect(probe).toContain("actions={APP_CHROME_ACTIONS}");
    expect(probe).toContain("max={APP_CHROME_TOOLBAR_MAX}");
    expect(probe).toContain("platform={APP_CHROME_PLATFORM}");
    expect(probe).toContain("left={APP_CHROME_STATUS_LEFT}");
    expect(probe).toContain("right={APP_CHROME_STATUS_RIGHT}");
  });

  it("reads the native focus, the dropdown box and the frame's toned ink", () => {
    expect(probe).toContain("focusElement");
    expect(probe).toContain("ctx.host.focused()");
    expect(probe).toContain("first.y >= file.y + file.height - 2");
    expect(probe).toContain("captureScale");
    expect(probe).toContain("Pixels.hexToRgba(toneInk(");
    expect(probe).toContain('sideOf(box, "trailing", 200)');
    expect(probe).toContain('sideOf(box, "leading", 200)');
  });

  it("asserts the three rules and the measured gap", () => {
    const steps = stepsOf();
    expect(steps).toContain("Enter reports the highlighted row");
    expect(steps).toContain("Down skips the disabled row");
    expect(steps).toContain("Right wraps past the disabled menu");
    expect(steps).toContain("Escape returns the focus to the trigger");
    expect(steps).toContain(
      "the overflowed action paints nothing in the strip",
    );
    expect(steps).toContain("Right moves the focus to the next enabled action");
    expect(steps).toContain(
      "Escape leaves the overflow open, because its surface never takes the focus",
    );
    expect(steps).toContain("the trigger's own Enter closes it again");
    expect(probe).toContain("the trailing group paints the destructive tone");
    expect(probe).toContain("the leading group paints neither tone");
  });

  it("iterates the overflow tail from the fixture, not a second list", () => {
    expect(probe).toContain("Effect.forEach(");
    expect(probe).toContain("APP_CHROME_OVERFLOW");
    expect(probe).toContain("overflowItemId(action)");
  });

  it("counts the checks the probe can assert", () => {
    const sites = Arr.length(
      Arr.fromIterable(stepsOf().matchAll(/ctx\.expect\w+\(/g)),
    );
    expect(sites).toBeGreaterThan(0);
    // Each helper site asserts once, and the loops and tone checks assert more,
    // so the printed count has the sites as a floor.
    expect(APP_CHROME_CHECKS).toBeGreaterThanOrEqual(sites);
  });
});

describe("the registry and the record", () => {
  it("declares the probe as a workspace the window can prove", () => {
    const meta = Arr.findFirst(
      liveRegistry,
      (entry) => entry.id === "app-chrome-lifecycle",
    );
    expect(Option.map(meta, (entry) => entry.capability)).toEqual(
      Option.some("workspace"),
    );
    expect(registry).toContain('id: "app-chrome-lifecycle"');
    expect(scenarios).toContain('"app-chrome-lifecycle": {');
    expect(scenarios).toContain("appChromeSteps");
  });

  it("documents the probe under the version it was measured on", () => {
    const section = sectionOf();
    expect(section).not.toBe("");
    expect(section).toContain(`${APP_CHROME_CHECKS} checks`);
    expect(section).toContain("`--only app-chrome-lifecycle`");
    expect(section).toContain("app-chrome.png");
    expect(section).toContain("app-chrome-menu.png");
    expect(section).toContain("does **not** dismiss");
  });

  it("states the three rules a plan needs", () => {
    const section = sectionOf();
    expect(section).toContain("The bar is one keyboard surface");
    expect(section).toContain("A roving move must name a real element");
    expect(section).toContain("A tone is a role");
    // The printed tone values are the dark roles the probe counts.
    expect(section).toContain(destructive);
    expect(section).toContain(success);
  });

  it("records both negative controls by their measured messages", () => {
    const section = sectionOf();
    expect(section).toContain("expected true, got false");
    expect(section).toContain(
      'expected "toolbar-action-copy", got "toolbar-overflow"',
    );
  });
});
