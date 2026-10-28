import { themes, controlHeight, type Theme } from "@gpuixui/tokens";
import {
  classesToStyle,
  COLOR_PICKER_AREA,
  COLOR_PICKER_FIELD,
  COLOR_PICKER_PANEL,
  COLOR_PICKER_ROW,
  COLOR_PICKER_SWATCHES,
  COLOR_PICKER_TRIGGER,
} from "@gpuixui/tw";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ColorPickerStatesBody,
  ColorPickerWorkflowBody,
} from "./color-picker-demo";
import * as preview from "./color-picker-preview";
import {
  Hsva,
  contrast as componentContrast,
  parseColor as componentParse,
  toHex as componentToHex,
} from "../../../../../packages/components/src/color-picker/logic";

/**
 * The drawing, held to the picker it documents.
 *
 * Guarded bugs: a preview that accepts a colour function the component refuses,
 * a saturation area drawn as one flat fill instead of the component's three
 * two-stop layers, a hue rail with fewer than six ramps, an alpha rail that
 * pretends to be a checkerboard the runtime cannot paint, and a panel whose
 * spacing drifts from `COLOR_PICKER_PANEL` — the drawing is a reader's only
 * picture of the component, so a mirror that spaces itself differently teaches
 * the wrong geometry.
 *
 * The grammar cases execute both modules: the component is the authority, and a
 * drift fails in the direction of the preview.
 */

const repo = new URL("../../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, repo), "utf8");

const css = read("apps/docs/src/styles/demos.css");

/** The declarations of the first `selector { … }` block in the sheet. */
const rule = (selector: string): string => {
  const start = css.indexOf(`\n${selector} {`);
  if (start === -1) throw new Error(`no ${selector} block`);
  return css.slice(start, css.indexOf("}", start));
};

const style = (recipe: string, theme: Theme = themes.dark) =>
  classesToStyle(recipe, theme).style;

const parts = read("packages/components/src/color-picker/parts.tsx");

/** The painted height and thumb the component uses. */
const AREA_HEIGHT = Number(/const AREA_HEIGHT = (\d+);/.exec(parts)?.[1]);
const THUMB = Number(/const THUMB = (\d+);/.exec(parts)?.[1]);

const workflow = renderToStaticMarkup(
  <ColorPickerWorkflowBody theme={themes.dark} />,
);
const states = renderToStaticMarkup(
  <ColorPickerStatesBody theme={themes.dark} />,
);

describe("the colour grammar the drawing executes", () => {
  const inputs = [
    "#f0a",
    "f0a",
    "#F0A8",
    "#FF00AA80",
    "#ff00aa",
    "#12345",
    "rgb(255, 0, 0)",
    "oklch(62.8% 0.25 29)",
    "red",
    "",
  ];

  it("commits exactly what the component commits", () => {
    const drift = inputs.flatMap((input) => {
      const mine = preview.parseHex(input, 210);
      const theirs = componentParse(input, 210);
      const shown = mine === undefined ? "none" : preview.toHex(mine);
      const committed =
        theirs._tag === "None" ? "none" : componentToHex(theirs.value);
      return shown === committed
        ? []
        : [`${input}: preview ${shown}, component ${committed}`];
    });

    expect(drift).toEqual([]);
    expect(
      inputs.slice(0, 5).map((input) => preview.parseHex(input) !== undefined),
    ).toEqual([true, true, true, true, true]);
    expect(
      inputs.slice(5).map((input) => preview.parseHex(input) === undefined),
    ).toEqual([true, true, true, true, true]);
  });

  it("measures contrast the way the component does, alpha included", () => {
    const samples: ReadonlyArray<Hsva> = [
      { h: 220, s: 0.8, v: 1, a: 1 },
      { h: 220, s: 0.8, v: 1, a: 0.5 },
      { h: 0, s: 0, v: 1, a: 1 },
    ];
    const background = themes.dark.colors.background;

    const drift = samples.flatMap((sample) => {
      const mine = preview.contrast(sample, background);
      const theirs = componentContrast(new Hsva(sample), background);
      const expected = theirs._tag === "None" ? undefined : theirs.value;
      return mine === undefined || expected === undefined
        ? [`${JSON.stringify(sample)}: unreadable`]
        : [
            Math.abs(mine - expected) < 1e-9
              ? ""
              : `${JSON.stringify(sample)}: ${mine} vs ${expected}`,
          ];
    });

    expect(drift.filter((entry) => entry !== "")).toEqual([]);
  });
});

describe("the colour picker workflow drawing", () => {
  it("draws the trigger and an open panel with the component's anatomy", () => {
    expect(workflow).toContain('class="gx-cp-trigger"');
    expect(workflow).toContain('aria-expanded="true"');
    expect(workflow).toContain('aria-haspopup="dialog"');
    expect(workflow).toContain('class="gx-cp-panel"');
    expect(workflow).toContain('class="gx-cp-area"');
    expect(workflow).toContain('class="gx-cp-input"');
    expect(workflow).toContain('class="gx-cp-contrast"');
    expect(workflow).toContain('role="slider"');
  });

  it("paints the area as the hue under the component's two ramps", () => {
    // One fill for the hue and two two-stop layers above it: the runtime has no
    // single three-stop gradient, so a flat square would be a different paint.
    expect((workflow.match(/class="gx-cp-area-layer"/g) ?? []).length).toBe(2);
    expect(workflow).toContain(
      "background:linear-gradient(to right, #FFFFFF, #FFFFFF00)",
    );
    expect(workflow).toContain(
      "background:linear-gradient(to top, #000000, #00000000)",
    );
    expect(workflow).toContain("hsl(");
  });

  it("draws six hue ramps and one alpha ramp, not a checkerboard", () => {
    expect((workflow.match(/class="gx-cp-segment"/g) ?? []).length).toBe(6);
    expect(workflow).toContain("background:linear-gradient(to right, #");
    expect(workflow).not.toContain("conic-gradient");
    expect(workflow).not.toContain("repeating");
  });

  it("offers one preset per theme role and marks the chosen one", () => {
    expect((workflow.match(/class="gx-cp-preset"/g) ?? []).length).toBe(6);
    expect((workflow.match(/class="gx-cp-pip"/g) ?? []).length).toBe(1);
    expect(workflow).toContain('aria-selected="true"');
  });

  it("prints the ratio and its grade", () => {
    expect(workflow).toContain('class="gx-cp-ratio"');
    expect(workflow).toMatch(/\d+\.\d\d:1/);
    expect(workflow).toMatch(/data-grade="(pass|large|fail)"/);
  });
});

describe("the colour picker states drawing", () => {
  it("draws three named states", () => {
    const labels = [
      "Open — the theme primary is chosen",
      "A refused draft — destructive edge, committed value kept",
      "Closed — the trigger reports the value and the colour",
    ];

    expect((states.match(/class="gx-cp-state"/g) ?? []).length).toBe(3);
    labels.forEach((label) =>
      expect(states).toContain(`aria-label="${label}"`),
    );
  });

  it("marks a refused draft and keeps the committed fill", () => {
    expect(states).toContain('data-invalid=""');
    expect(states).toContain('aria-description="Invalid hex colour"');
    expect(states).toContain('value="zzz"');
    expect(states).toContain(themes.dark.colors.accent.toUpperCase());
  });

  it("leaves a disabled trigger out of the tab order and faded", () => {
    expect(states).toContain('disabled=""');
    expect(states).toContain("Locked colour");
    expect(rule(".gx-cp-trigger[disabled]")).toContain("opacity: 0.5;");
  });
});

describe("the drawing's style sheet", () => {
  it("spaces the panel from the component's recipe", () => {
    const panel = style(COLOR_PICKER_PANEL);

    expect(panel.gap).toBe(14);
    expect(panel.padding).toBe(14);
    expect(rule(".gx-cp-panel")).toContain(`gap: ${String(panel.gap)}px;`);
    expect(rule(".gx-cp-panel")).toContain(
      `padding: ${String(panel.padding)}px;`,
    );
    expect(rule(".gx-cp-panel")).toContain("background: var(--popover);");
  });

  it("draws the trigger at the component's pill and gap", () => {
    const trigger = style(COLOR_PICKER_TRIGGER);
    const drawn = rule(".gx-cp-trigger");

    expect(drawn).toContain(`gap: ${String(trigger.gap)}px;`);
    expect(trigger.padding).toBe(6);
    expect(trigger.paddingRight).toBe(16);
    expect(drawn).toContain(
      `padding: ${String(trigger.padding)}px ${String(trigger.paddingRight)}px ${String(trigger.padding)}px ${String(trigger.padding)}px;`,
    );
    expect(trigger.borderRadius).toBe(themes.dark.radius.full);
    expect(drawn).toContain("border-radius: 9999px;");
    expect(drawn).toContain("background: var(--background);");
    expect(controlHeight(themes.dark, "sm")).toBe(28);
    expect(rule(".gx-cp-chip")).toContain("width: var(--control-height-sm);");
  });

  it("draws the area and its thumb at the component's geometry", () => {
    const area = rule(".gx-cp-area");
    const recipe = style(COLOR_PICKER_AREA);

    expect(AREA_HEIGHT).toBe(148);
    expect(THUMB).toBe(20);
    expect(area).toContain(`height: ${String(AREA_HEIGHT)}px;`);
    expect(recipe.borderRadius).toBe(themes.dark.radius.xl);
    expect(area).toContain("border-radius: var(--radius-xl);");
    expect(rule(".gx-cp-thumb")).toContain(`width: ${String(THUMB)}px;`);
    expect(rule(".gx-cp-thumb")).toContain("border: 3px solid #ffffff;");
  });

  it("draws a slider row and the preset row from the recipes", () => {
    expect(style(COLOR_PICKER_ROW).gap).toBe(8);
    expect(rule(".gx-cp-row")).toContain("gap: 8px;");
    expect(style(COLOR_PICKER_SWATCHES).gap).toBe(6);
    expect(rule(".gx-cp-presets")).toContain("gap: 6px;");
    expect(style(COLOR_PICKER_FIELD).gap).toBe(8);
    expect(rule(".gx-cp-field")).toContain("gap: 8px;");
    expect(rule(".gx-cp-rail")).toContain(
      `height: ${String(themes.dark.spacing.md)}px;`,
    );
    expect(rule(".gx-cp-preset")).toContain(
      `width: ${String(themes.dark.iconSize.xl)}px;`,
    );
  });
});
