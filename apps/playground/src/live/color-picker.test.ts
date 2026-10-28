/**
 * Holds `color-picker-lifecycle` to the shipped component and to its own
 * arithmetic.
 *
 * The gap this guards: the window is the only place the panel's placement, an
 * area press and a refused draft's painted edge are measured, and a probe
 * rewritten around a local swatch grid or its own hex normal form would still
 * pass while the README called it the library's picker. The fixture's area
 * arithmetic is therefore executed beside the component's own colour model, and
 * the registry and the README are held to the probe that ran.
 *
 * `node:fs` is deliberate, as in the other live fixtures: this reads the
 * repository's own probe, component and prose, never a runtime path.
 */
import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  Hsva,
  parseColor,
  toHex,
} from "../../../../packages/components/src/color-picker/logic.js";
import {
  AREA_SATURATION,
  AREA_VALUE,
  areaColour,
  COLOR_PICKER_CHECKS,
  COLOR_PICKER_IDS,
  colorPickerReadout,
  INITIAL_ROLE,
  INVALID_DRAFT,
  partId,
  presetId,
  PRESSED_ROLE,
  SWATCH_ROLES,
  TYPED_COLOUR,
} from "./color-picker.js";
import { liveRegistry } from "./registry.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const probe = read("./color-picker-probe.tsx");
const picker = read("../../../../packages/components/src/color-picker.tsx");
const parts = read(
  "../../../../packages/components/src/color-picker/parts.tsx",
);
const readme = read("../../README.md");

/** The probe's README section, so a value printed elsewhere cannot pass. */
const section = (() => {
  const heading = "### `color-picker-lifecycle` — measured on 0.11.0 here";
  const start = readme.indexOf(heading);
  if (start === -1) return "";
  const end = readme.slice(start).search(/\n#{2,3} /);
  return end === -1 ? readme.slice(start) : readme.slice(start, start + end);
})();

/** The `theme.colors.<role>` names the component's default presets name. */
const componentSwatches = (): ReadonlyArray<string> => {
  const start = picker.indexOf("const defaultSwatches");
  const body = picker.slice(start, picker.indexOf("];", start));
  return Arr.map(
    Arr.fromIterable(body.matchAll(/colors\.([A-Za-z]+)/g)),
    (match) => match[1] ?? "",
  );
};

describe("the color picker scene's arithmetic", () => {
  it("reads the preset order the component ships", () => {
    expect(componentSwatches()).toEqual([...SWATCH_ROLES]);
    expect(PRESSED_ROLE).not.toBe(INITIAL_ROLE);
  });

  it("computes the area's colour with the component's own model", () => {
    const parsed = parseColor("#A7A9FF");
    if (Option.isNone(parsed)) throw new Error("the premise is a colour");
    const expected = toHex(
      new Hsva({ ...parsed.value, s: AREA_SATURATION, v: AREA_VALUE, a: 1 }),
    );

    expect(areaColour("#A7A9FF")).toBe(expected);
  });

  it("addresses the parts the component derives", () => {
    expect(partId(COLOR_PICKER_IDS.enabled, "area")).toBe("cp-area");
    expect(partId(COLOR_PICKER_IDS.disabled, "hex")).toBe("dp-hex");
    expect(presetId(COLOR_PICKER_IDS.enabled, 2)).toBe("cp-preset-2");
    Arr.forEach(["area", "hue", "alpha", "hex", "preset"] as const, (part) =>
      expect(picker, `picker derives -${part}`).toContain(`\${testId}-${part}`),
    );
    expect(parts).toContain("${testId}-thumb");
  });

  it("prints the one readout shape every state is checked against", () => {
    expect(
      colorPickerReadout({ value: "#A7A9FF", changes: 0, refused: 0 }),
    ).toBe("value=#A7A9FF changes=0 refused=0");
  });

  it("counts the checks the probe asserts", () => {
    const sites = probe.match(/ctx\.expect[A-Za-z]+\(/g)?.length ?? 0;
    expect(sites).toBe(COLOR_PICKER_CHECKS);
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
    Arr.forEach(SWATCH_ROLES, (role) => {
      expect(section).toContain(`\`${role}\``);
    });
    expect(section).toContain(TYPED_COLOUR);
    expect(section).toContain(INVALID_DRAFT);
    expect(section).toContain("area");
    expect(section).toContain("panel");
    expect(section).toContain("refused=0");
    expect(section).toContain("tabIndex: -1");
  });
});

describe("the probe mounts the shipped color picker", () => {
  it("composes the package's component instead of a local grid", () => {
    expect(probe).toContain('} from "@gpuixui/components"');
    expect(probe).toContain("<ColorPicker");
    expect(probe).toContain("testId={COLOR_PICKER_IDS.enabled}");
    expect(probe).toContain("testId={COLOR_PICKER_IDS.disabled}");
    expect(probe).toContain("disabled");
    expect(probe).not.toContain('role="button"');
  });

  it("drives the field and the area through the window's own verbs", () => {
    expect(probe).toContain('ctx.host.key("cmd-a")');
    expect(probe).toContain("TYPED_DRAFT");
    expect(probe).toContain('ctx.host.key("enter")');
    expect(probe).toContain("ctx.host.clickAt(");
  });
});
