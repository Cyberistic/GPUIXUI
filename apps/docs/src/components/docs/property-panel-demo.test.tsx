import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  PropertyPanelDemo,
  propertyPanelDemoSource,
} from "./property-panel-demo";

const markup = renderToStaticMarkup(<PropertyPanelDemo />);

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const css = read("../../styles/demos.css");

const fixtureLabelWidth = (): number => {
  const fixture = read("../../../../../apps/playground/src/live/inspector.ts");
  const value = /export const INSPECTOR_LABEL_WIDTH = (\d+);/.exec(
    fixture,
  )?.[1];
  if (value === undefined) throw new Error("the fixture names no label width");
  return Number(value);
};

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
      ...markup.matchAll(/class="gx-dkv-label" style="width:96px">([^<]+)</g),
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
    expect(block(".gx-inspector-box")).toContain("background: var(--primary)");

    const widths = [
      ...markup.matchAll(/class="gx-dkv-label" style="width:(\d+)px"/g),
    ].map((match) => Number(match[1]));
    expect(widths.length).toBeGreaterThan(0);
    expect(new Set(widths)).toEqual(new Set([fixtureLabelWidth()]));

    expect(block(".gx-dfield-sm")).toContain(
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
    const source = read("./property-panel-demo.tsx");

    expect(source).toContain("setObject(widen(object))");
    expect(source).toContain("setObject(resetSize(object))");
  });
});
