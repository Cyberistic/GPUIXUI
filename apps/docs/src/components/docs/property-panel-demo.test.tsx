import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  PropertyPanelDemo,
  propertyPanelDemoSource,
} from "./property-panel-demo";

/**
 * The Property panels preview, as it renders, and the sample under its Code tab.
 *
 * The page's whole subject is that one object is read by four surfaces without
 * a second copy of it: the stage, the editable row, the key-value table and the
 * metric. A drawing that printed the area from a constant, dropped the field,
 * drew a blank `Tag` cell or left `Reset size` without its handler would still
 * build. These cases hold the markup to the model's numbers, the two size
 * actions to the handlers that run the model, and the sample to the imports a
 * reader copies.
 */

const markup = renderToStaticMarkup(<PropertyPanelDemo />);

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const css = read("../../styles/demos.css");

/**
 * The label column the window probe measured, so the drawing scans its rows
 * down one column rather than a width chosen to fit the panel.
 */
const fixtureLabelWidth = (): number => {
  const fixture = read("../../../../../apps/playground/src/live/inspector.ts");
  const value = /export const INSPECTOR_LABEL_WIDTH = (\d+);/.exec(
    fixture,
  )?.[1];
  if (value === undefined) throw new Error("the fixture names no label width");
  return Number(value);
};

/** The declarations of the first `selector { … }` block in the style sheet. */
const block = (selector: string): string => {
  const start = css.indexOf(`${selector} {`);
  return start === -1 ? "" : css.slice(start, css.indexOf("}", start));
};

describe("the property panel preview", () => {
  it("draws the four readers of one object", () => {
    expect(markup).toContain('aria-label="Property inspector"');
    expect(markup).toContain("Alpha — 120 x 80");
    expect(markup).toContain('style="width:120px;height:80px"');
    expect(markup).toContain('aria-label="Tag"');
    expect(markup).toContain("9600");
    expect(markup).toContain("px²");
  });

  it("prints the rows the probe reads, in its order", () => {
    const labels = [
      ...markup.matchAll(/class="gx-inspector-label">([^<]+)</g),
    ].flatMap((match) => match[1] ?? "");

    expect(labels.slice(0, 4)).toEqual(["Name", "Tag", "Size", "Area"]);
    expect(markup).toContain(">Alpha<");
    expect(markup).toContain(">120 x 80<");
    expect(markup).toContain(">9600 px<");
  });

  it("prints an unset tag as a value, and offers both size actions", () => {
    expect(markup).toContain(">none<");
    expect(markup).toContain(">Wide<");
    expect(markup).toContain(">Reset size<");
    expect(markup).toContain("width × height");
  });

  it("draws its box at the object's own size, in the theme's fill", () => {
    // The stage is a picture of the object, not a scaled diagram: `Wide` has to
    // be visible as the box growing, and the fill is the library's `primary`.
    expect(block(".gx-inspector-box")).toContain("background: var(--primary)");
    expect(block(".gx-inspector-rows")).toContain(
      `grid-template-columns: ${fixtureLabelWidth()}px 1fr`,
    );
    expect(block(".gx-inspector-input")).toContain(
      "height: var(--control-height-sm)",
    );
  });

  it("shows a sample that composes the three shipped surfaces", () => {
    expect(propertyPanelDemoSource).toContain(
      'import { KeyValue, PropertyPanel, StatCard } from "@gpuixui/data"',
    );
    expect(propertyPanelDemoSource).toContain('kind: "editable"');
    expect(propertyPanelDemoSource).toContain("onChange:");
    expect(propertyPanelDemoSource).toContain(
      "const area = object.width * object.height",
    );
    expect(propertyPanelDemoSource).toContain('unit="px²"');
    expect(propertyPanelDemoSource).toContain(
      'value: object.tag === "" ? "none" : object.tag',
    );
  });

  it("wires both size actions to the model", () => {
    // Guarded report: `Reset size` looked inert after `Wide`. The rule is the
    // model's (the test above), so this pins the two handlers that run it.
    const source = read("./property-panel-demo.tsx");

    expect(source).toContain("setObject(widen(object))");
    expect(source).toContain("setObject(resetSize(object))");
  });
});
