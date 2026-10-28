import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { demos } from "./demos";

/**
 * The room each drawing gives its floating surface.
 *
 * A preview card is a stage, not a fixed box: a panel anchored to a trigger is
 * taller than the control and hangs out of the flow, so a stage sized to the
 * control clips it. Six drawings got this wrong in different ways — the
 * combobox list and the date calendar were cut mid-row, the context menu's
 * submenu painted outside the frame, the dropdown panel opened over its card,
 * the command palette left a clipped row's letters against its border, and the
 * date preset calendar was drawn entirely below the card. Each case below
 * models the box the drawing declares (its stage, the trigger's bottom edge and
 * the reserve under it) and holds the panel inside it; the browser run in the
 * task's report checks the same rule against real layout.
 *
 * The panel sizes are the drawings' own measured boxes: the shipped combobox
 * caps the popup at 280px, a two-month calendar is 324px tall, a menu surface is
 * 208px wide. A regression here is one of those numbers outgrowing the reserve.
 */

const css = readFileSync(
  new URL("../../styles/demos.css", import.meta.url),
  "utf8",
).replace(/\/\*[\s\S]*?\*\//g, "");

const app = readFileSync(
  new URL("../../styles/app.css", import.meta.url),
  "utf8",
).replace(/\/\*[\s\S]*?\*\//g, "");

const component = (name: string): string =>
  readFileSync(
    new URL(
      `../../../../../packages/components/src/${name}.tsx`,
      import.meta.url,
    ),
    "utf8",
  );

const demoSource = readFileSync(
  new URL("./demos.tsx", import.meta.url),
  "utf8",
);

/** The declarations of every block whose selector list names `selector`. */
const block = (sheet: string, selector: string): string =>
  [...sheet.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, names]) =>
      (names ?? "").split(",").some((one) => one.trim() === selector),
    )
    .map(([, , body]) => body ?? "")
    .join("\n");

/** A pixel declaration, or `NaN` when the drawing does not declare it. */
const px = (body: string, property: string): number => {
  const value = new RegExp(`${property}:\\s*(-?\\d+)px`).exec(body)?.[1];
  return value === undefined ? Number.NaN : Number(value);
};

/** A bare number declaration (the components' style objects carry no `px`). */
const number = (body: string, property: string): number => {
  const value = new RegExp(`${property}:\\s*(-?\\d+)`).exec(body)?.[1];
  return value === undefined ? Number.NaN : Number(value);
};

const render = (name: string): string => {
  const demo = demos[name];
  if (demo === undefined) throw new Error(`${name} is not registered`);
  const Drawing = demo.render;
  return renderToStaticMarkup(<Drawing />);
};

/** A box in the stage's coordinates. */
interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const box = (x: number, y: number, width: number, height: number): Box => ({
  x,
  y,
  width,
  height,
});

const inside = (panel: Box, frame: Box): boolean =>
  panel.y >= frame.y &&
  panel.y + panel.height <= frame.y + frame.height &&
  panel.x >= frame.x &&
  panel.x + panel.width <= frame.x + frame.width;

/** The trigger's bottom inside the stage, past its padding and label. */
const TRIGGER_BOTTOM = 111;

const combobox = render("combobox-workflow");
const datePicker = render("date-picker-workflow");
const contextMenu = render("context-menu-workflow");
const dropdown = render("dropdown-menu-demo");
const commandMenu = render("command-menu-demo");

describe("the combobox drawing", () => {
  it("reserves the popup's box below the control", () => {
    const stage = block(css, ".gx-demo-combobox");
    const popup = block(css, ".gx-combobox-popup");
    const height = number(component("combobox"), "maxHeight");

    // The shipped popup's own cap is what the drawing has to fit.
    expect(height).toBe(280);
    expect(px(popup, "max-height")).toBe(height);

    const reserve = px(stage, "padding-bottom");
    const panel = box(80, TRIGGER_BOTTOM + 4, 320, height);
    const frame = box(0, 0, 480, TRIGGER_BOTTOM + reserve);

    expect(inside(panel, frame)).toBe(true);
    // The trigger is still the listbox's control.
    expect(combobox).toContain('aria-haspopup="listbox"');
    expect(combobox).toContain('class="gx-combobox-trigger"');
  });
});

describe("the date-picker drawing", () => {
  it("reserves the calendar's box and keeps the readout out of the anchor", () => {
    const scene = block(css, ".gx-date-popup");
    const height = px(scene, "--gx-date-popup-height");
    const gap = 6;
    const reserve = height + gap + 20;

    expect(height).toBe(324);
    expect(scene).toContain(
      "padding-bottom: calc(var(--gx-date-popup-height) + 6px + 20px)",
    );

    const panel = box(104, TRIGGER_BOTTOM + gap, 272, height);
    const frame = box(0, 0, 480, TRIGGER_BOTTOM + reserve);
    expect(inside(panel, frame)).toBe(true);

    // The status line is a sibling of the anchor, not part of it: inside the
    // frame it pushed the calendar a readout's height further down.
    expect(datePicker).toContain('</div><p class="gx-date-readout"');
    expect(datePicker).toContain('class="gx-date-trigger"');
    expect(datePicker).toContain('aria-expanded="false"');
  });
});

describe("the context-menu drawing", () => {
  it("gives the menu a scene with a floor, and the trigger still opens it", () => {
    // The preview panel's `min-height: 100%` resolved against a panel that hugs
    // its demo, so it collapsed every demo root that declared its own floor —
    // the context scene drew 206px instead of its 320. The rule is gone.
    expect(block(app, ".gx-component-panel .gx-demo")).toBe("");
    expect(block(css, ".gx-context-scene")).toContain("min-height: 320px");

    const frame = box(0, 0, 520, 320);
    const panel = box(292, 144, 208, 156);
    expect(inside(panel, frame)).toBe(true);

    expect(contextMenu).toContain('class="gx-context-row"');
    expect(contextMenu).toContain("release-notes.md");
  });
});

describe("the dropdown-menu drawing", () => {
  it("opens the panel below the card, with the stage room to hold it", () => {
    // The trigger used to sit inside the card, vertically centred, so a panel
    // 4px below it covered the card's bottom edge and rounded corner. It is a
    // row under the card now.
    expect(dropdown).toContain('</div></div><div class="gx-menu-actions">');
    expect(dropdown.indexOf('class="gx-menu-file"')).toBeLessThan(
      dropdown.indexOf('class="gx-menu-anchor"'),
    );

    const stage = block(css, ".gx-demo-menu");
    const floor = px(stage, "min-height");
    // 24px padding, the card, a 10px gap, the actions row and its 4px gap.
    const abovePanel = 24 + 88 + 10 + 28 + 4;
    const reserve = floor - abovePanel;

    expect(px(block(css, ".gx-menu"), "min-width")).toBe(208);
    expect(reserve).toBeGreaterThanOrEqual(157);
    expect(stage).toContain("justify-content: flex-start");

    const panel = box(80, 40 + abovePanel, 208, 157);
    expect(inside(panel, box(0, 0, 480, floor + 80))).toBe(true);

    expect(dropdown).toContain('aria-expanded="false"');
    expect(dropdown).toContain("gx-menu-anchor");
  });
});

describe("the command-menu drawing", () => {
  it("blurs without a scroll container in between, and cuts no row's letters", () => {
    // A backdrop-filter inside a scrollport composites its backdrop against the
    // clip; the stage stops being a scroll container for this drawing.
    expect(
      block(css, ".gx-demo:has(> .gx-demo-command):not(.gx-grid-preview)"),
    ).toContain("overflow: visible");
    expect(block(css, ".gx-overlay-veil")).toContain(
      "backdrop-filter: blur(6px)",
    );
    expect(block(css, ".gx-overlay-veil")).toContain(
      "color-mix(in srgb, var(--background) 55%, transparent)",
    );
    // The scroll list fades its cut edge instead of leaving glyph tops on the
    // palette's border — the bright speck the drawing showed as a blur artifact.
    expect(block(css, ".gx-palette-list")).toContain("mask-image");

    const panel = box(60, 60, 360, 265);
    expect(inside(panel, box(0, 0, 480, 420))).toBe(true);

    expect(commandMenu).toContain("Commands");
    expect(demoSource).toContain("onClick={openPalette}");
  });
});
