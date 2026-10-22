import { themes } from "@gpuixui/tokens";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ColorPickerStatesBody,
  ColorPickerWorkflowBody,
} from "./color-picker-demo";

/**
 * The color picker previews, as they render.
 *
 * The page's two drawings are the only place a reader sees a chosen swatch, an
 * invalid draft or the disabled picker. A demo that dropped the pip, painted
 * the invalid draft as the committed colour, or rendered the disabled field
 * as editable would still build. These cases hold the markup to the rules the
 * model owns, and the style sheet to the roles the component paints.
 */

const workflow = renderToStaticMarkup(
  <ColorPickerWorkflowBody theme={themes.dark} />,
);
const states = renderToStaticMarkup(
  <ColorPickerStatesBody theme={themes.dark} />,
);

const css = readFileSync(
  new URL("../../styles/demos.css", import.meta.url),
  "utf8",
);

/** The declarations of the first `selector { … }` block in the style sheet. */
const block = (selector: string): string => {
  const start = css.indexOf(`${selector} {`);
  return start === -1 ? "" : css.slice(start, css.indexOf("}", start));
};

describe("the color picker workflow", () => {
  it("starts on the theme's primary, so the mark and the switch agree", () => {
    const primary = themes.dark.colors.primary;

    expect(workflow).toContain(`value="${primary}"`);
    expect(workflow).toContain('aria-selected="true"');
    expect((workflow.match(/class="gx-color-pip"/g) ?? []).length).toBe(1);
    expect(workflow).toContain(`value=${primary} draft=${primary} valid`);
  });

  it("draws the chosen colour from the value, not from the field's text", () => {
    // The preview starts with draft === value, so the cell's fill is the
    // committed colour. A preview that painted the draft would let an invalid
    // string reach a surface the picker reports as a colour.
    expect(workflow).toContain(
      `background-color:${themes.dark.colors.primary}`,
    );
  });
});

describe("the color picker states", () => {
  it("renders four named states", () => {
    const labels = [
      "Rest — the theme primary is chosen",
      "A custom palette — the swatches are not theme roles",
      "An invalid draft — destructive edge, committed value kept",
      "Disabled — out of the tab order and read-only",
    ];

    expect((states.match(/class="gx-color-state"/g) ?? []).length).toBe(4);
    labels.forEach((label) => {
      expect(states).toContain(`aria-label="${label}"`);
    });
  });

  it("marks an invalid draft and keeps the committed preview", () => {
    expect(states).toContain('data-invalid=""');
    expect(states).toContain('aria-description="Invalid hex colour"');
    expect(states).toContain('value="zzz"');
    // The preview cell is the committed accent, not the `zzz` draft.
    expect(states).toContain(`background-color:${themes.dark.colors.accent}`);
  });

  it("leaves the disabled picker out of the tab order and read-only", () => {
    const disabled = states.slice(
      states.indexOf('data-disabled=""'),
      states.indexOf("</div></div>", states.indexOf('data-disabled=""')),
    );
    const swatches = disabled.match(/tabindex="-1"/g) ?? [];

    expect(disabled.length).toBeGreaterThan(0);
    expect(swatches.length).toBe(6);
    expect(disabled).toMatch(/readonly/i);
  });
});

describe("the color picker style sheet", () => {
  it("takes the mark, the field and the pip from the library's roles", () => {
    // The component paints the chosen edge `foreground` and marks the chosen
    // cell with the page fill inside the body ink. The field's own fill is the
    // page role (`background`), not the `input` surface fill, and its value is
    // `inputForeground`; an invalid draft's edge is `destructive`.
    expect(block('.gx-color-swatch[aria-selected="true"]')).toContain(
      "var(--foreground)",
    );
    expect(block(".gx-color-pip")).toContain("var(--background)");
    expect(block(".gx-color-pip")).toContain("var(--foreground)");
    expect(block(".gx-color-input")).toContain("var(--background)");
    expect(block(".gx-color-input")).toContain("var(--input-foreground)");
    expect(block(".gx-color-input[data-invalid]")).toContain(
      "var(--destructive)",
    );
    expect(block(".gx-color-preview")).toContain("var(--control-height-md)");
  });

  it("reads a swatch cell from the density step and the theme's corner", () => {
    // A cell is `controlHeight(theme, "sm")` square, its `rounded-md` is the
    // theme's `radius.md` (the tw registry stopped folding it to a fixed 6px),
    // and the preview cell is the `md` step — so the platform switch resizes
    // and reshapes them with the controls beside them.
    expect(block(".gx-color-swatch")).toContain("var(--control-height-sm)");
    expect(block(".gx-color-swatch")).toContain("border-radius: var(--radius)");
    expect(block(".gx-color-preview")).toContain(
      "border-radius: var(--radius)",
    );
  });
});
