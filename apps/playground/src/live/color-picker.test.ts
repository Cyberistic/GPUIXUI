/**
 * Holds `color-picker-lifecycle` to the shipped component and to its own
 * arithmetic.
 *
 * The gap this guards: every `ColorPicker` rule was a renderer read — each
 * cell's `style.backgroundColor`, the `aria-selected` attribute, the draft the
 * host held — and no window had found the chosen cell's marker in a frame,
 * activated a swatch by key, or typed a shorthand into the field. The probe's
 * swatches are the theme's own roles in the component's own order, its marker is
 * the page fill the component builds the pip from, and its inner-square crop is
 * the rectangle a rounded cell leaves solid. If the component reorders its
 * swatches, paints the marker from another role, or a probe is rewritten around
 * a local swatch grid, the registry, the README and the inventory row would still
 * claim the library's `ColorPicker` while the window measured the fixture.
 *
 * `node:fs` is deliberate, as in the other live fixtures: this reads the
 * repository's own probe, component and prose, never a runtime path.
 */
import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import {
  boxRegion,
  COLOR_PICKER_CHECKS,
  COLOR_PICKER_IDS,
  colorPickerReadout,
  ENTER_ROLE,
  formatRoles,
  INITIAL_ROLE,
  innerRegion,
  INVALID_DRAFT,
  markedRoles,
  partId,
  PRESSED_ROLE,
  SPACE_ROLE,
  swatchColour,
  swatchId,
  SWATCH_INK_FLOOR,
  SWATCH_ROLES,
  TYPED_COLOUR,
  unpaintedRoles,
} from "./color-picker.js";
import { liveRegistry } from "./registry.js";
import { palettes } from "../palettes.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const probe = read("./color-picker-probe.tsx");
const picker = read("../../../../packages/components/src/color-picker.tsx");
const readme = read("../../README.md");

/** The probe's README section, so a value printed elsewhere cannot pass. */
const section = (() => {
  const heading = "### `color-picker-lifecycle` — measured on 0.11.0 here";
  const start = readme.indexOf(heading);
  if (start === -1) return "";
  const end = readme.slice(start).search(/\n#{2,3} /);
  return end === -1 ? readme.slice(start) : readme.slice(start, start + end);
})();

/** The `theme.colors.<role>` names the component's default swatches name. */
const componentSwatches = (): ReadonlyArray<string> => {
  const start = picker.indexOf("const defaultSwatches");
  const body = picker.slice(start, picker.indexOf("];", start));
  return Arr.map(
    Arr.fromIterable(body.matchAll(/colors\.([A-Za-z]+)/g)),
    (match) => match[1] ?? "",
  );
};

describe("the color picker scene's arithmetic", () => {
  it("reads the swatch order and the marker the component ships", () => {
    // The probe's frame expectations are this list: a reordered or recoloured
    // marker would pass every renderer read and fail every window reading.
    expect(componentSwatches()).toEqual([...SWATCH_ROLES]);
    expect(picker).toContain("backgroundColor: theme.colors.background");
    expect(picker).toContain("borderColor: theme.colors.foreground");
  });

  it("names the two swatches the key and the press choose", () => {
    expect(PRESSED_ROLE).not.toBe(INITIAL_ROLE);
    expect(
      Arr.dedupe([INITIAL_ROLE, PRESSED_ROLE, SPACE_ROLE, ENTER_ROLE]),
    ).toHaveLength(4);
    expect(swatchId(COLOR_PICKER_IDS.enabled, "muted")).toBe("cp-swatch-3");
    expect(partId(COLOR_PICKER_IDS.enabled, "hex")).toBe("cp-hex");
    expect(swatchId(COLOR_PICKER_IDS.disabled, INITIAL_ROLE)).toBe(
      "dp-swatch-0",
    );
  });

  it("prints the one readout shape every state is checked against", () => {
    expect(
      colorPickerReadout({ value: "#a7a9ff", changes: 0, refused: 0 }),
    ).toBe("value=#a7a9ff changes=0 refused=0");
    expect(
      colorPickerReadout({ value: TYPED_COLOUR, changes: 4, refused: 0 }),
    ).toBe("value=#ff00aa changes=4 refused=0");
  });

  it("crops the inner square a rounded cell leaves solid", () => {
    const cell = { x: 100, y: 60, width: 28, height: 28 };
    // A quarter inset on a 28-point cell starts 7 points in and is 14 across.
    const inner = innerRegion(cell, 2);
    expect({
      x: inner.x,
      y: inner.y,
      width: inner.width,
      height: inner.height,
    }).toEqual({ x: 214, y: 134, width: 28, height: 28 });
    const box = boxRegion(cell, 2);
    expect({
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
    }).toEqual({ x: 200, y: 120, width: 56, height: 56 });
    // The floor is above a marker's few dozen pixels and below a whole fill.
    expect(SWATCH_INK_FLOOR).toBeLessThan(inner.width * inner.height);
    expect(SWATCH_INK_FLOOR).toBeGreaterThan(100);
  });

  it("reads the roles whose cells painted, and the one that carries the pip", () => {
    expect(formatRoles(markedRoles([0, 0, 53, 0, 0, 0]))).toBe("accent");
    expect(formatRoles(markedRoles([0, 0, 0, 0, 0, 0]))).toBe("");
    expect(formatRoles(unpaintedRoles([700, 700, 700, 700, 700, 700]))).toBe(
      "",
    );
    expect(formatRoles(unpaintedRoles([700, 700, 4, 700, 700, 700]))).toBe(
      "accent",
    );
    // The inks are the theme's own, lowercased for the normal form.
    expect(swatchColour(palettes.dark.colors, INITIAL_ROLE)).toBe(
      palettes.dark.colors.primary.toLowerCase(),
    );
  });

  it("counts the checks the probe asserts, its loops included", () => {
    // Three sites run many times: the swatch loop's ink read runs once per
    // role, the box helper once per cell plus the preview and the field, and
    // the capture helper once per paint state.
    const sites = probe.match(/ctx\.expect[A-Za-z]+\(/g)?.length ?? 0;
    const captures = probe.match(/yield\* capture\(ctx,/g)?.length ?? 0;
    const boxes = 2; // the preview and the field, beside the six cells
    expect(
      sites +
        (SWATCH_ROLES.length - 1) +
        (SWATCH_ROLES.length + boxes - 1) +
        (captures - 1),
    ).toBe(COLOR_PICKER_CHECKS);
    expect(COLOR_PICKER_CHECKS).toBe(47);
  });
});

describe("the color-picker-lifecycle probe's record", () => {
  it("registers the probe once, over the input capability", () => {
    const entries = Arr.filter(
      liveRegistry,
      (entry) => entry.id === "color-picker-lifecycle",
    );
    expect(entries).toHaveLength(1);
    expect(entries[0]?.capability).toBe("input");
    expect(entries[0]?.title).toContain("ColorPicker");
  });

  it("documents it under the version it was measured on", () => {
    expect(section).not.toBe("");
    const printed = Number(
      /(\d+) checks, `--only color-picker-lifecycle`/.exec(section)?.[1] ??
        Number.NaN,
    );
    expect(printed).toBe(COLOR_PICKER_CHECKS);
  });

  it("prints the scene and the readings the window measured", () => {
    // A page that printed only fixture constants would claim no measurement.
    Arr.forEach(SWATCH_ROLES, (role) => {
      expect(section).toContain(`\`${role}\``);
    });
    expect(section).toContain(TYPED_COLOUR);
    expect(section).toContain(INVALID_DRAFT);
    expect(section).toContain("marker");
    expect(section).toContain("**500**");
    expect(section).toContain("refused=0");
    expect(section).toContain("tabIndex: -1");
  });
});

describe("the probe mounts the shipped color picker", () => {
  it("composes the package's component instead of a local swatch grid", () => {
    expect(probe).toContain('} from "@gpuixui/components"');
    expect(probe).toContain("<ColorPicker");
    expect(probe).toContain("testId={COLOR_PICKER_IDS.enabled}");
    expect(probe).toContain("testId={COLOR_PICKER_IDS.disabled}");
    expect(probe).toContain("disabled");
    expect(probe).not.toContain('role="button"');
  });

  it("drives the field through the window's own keys", () => {
    // The typed path is the only one that proves the normal form reaches the
    // value: the swatch presses commit a colour the theme already names.
    expect(probe).toContain('ctx.host.key("cmd-a")');
    expect(probe).toContain("TYPED_DRAFT");
    expect(probe).toContain('ctx.host.key("enter")');
    expect(probe).toContain('keyUp("space")');
  });
});
