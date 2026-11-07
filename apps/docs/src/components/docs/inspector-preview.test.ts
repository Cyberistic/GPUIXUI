import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  areaOf,
  captionOf,
  INSPECTED,
  propertyRows,
  resetSize,
  sizeValue,
  tagValue,
  WIDE_WIDTH,
  widen,
  withTag,
} from "./inspector-preview";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const fixture = read("../../../../../apps/playground/src/live/inspector.ts");

const initialBlock = (): string => {
  const start = fixture.indexOf("export const INITIAL_OBJECT");
  return fixture.slice(start, fixture.indexOf("};", start));
};

const fixtureNumber = (name: string): number => {
  const value = new RegExp(`${name}: (\\d+)`).exec(initialBlock())?.[1];
  if (value === undefined) throw new Error(`the fixture names no ${name}`);
  return Number(value);
};

describe("the property panel preview", () => {
  it("opens on the object the window probe opens on", () => {
    expect({
      name: INSPECTED.name,
      width: INSPECTED.width,
      height: INSPECTED.height,
    }).toEqual({
      name: /name: "([^"]+)"/.exec(initialBlock())?.[1],
      width: fixtureNumber("width"),
      height: fixtureNumber("height"),
    });

    const wide = /export const WIDE_WIDTH = (\d+);/.exec(fixture)?.[1];

    expect(WIDE_WIDTH).toBe(Number(wide));
  });

  it("derives the metric from the object instead of storing it", () => {
    expect(areaOf(INSPECTED)).toBe(9600);
    expect(areaOf(widen(INSPECTED))).toBe(19200);

    const areaRow = propertyRows(widen(INSPECTED)).find(
      (row) => row.key === "area",
    );

    expect(areaRow?.value).toBe("19200 px");
  });

  it("prints no tag as a value, not an empty cell", () => {
    expect(tagValue("")).toBe("none");

    const tagRow = propertyRows(INSPECTED).find((row) => row.key === "tag");

    expect(tagRow?.value).toBe("none");
    expect(captionOf(INSPECTED)).toBe("Alpha — 120 x 80");
    expect(captionOf(withTag(INSPECTED, "hero"))).toBe(
      "Alpha #hero — 120 x 80",
    );
  });

  it("moves only the width on Wide", () => {
    expect(widen(withTag(INSPECTED, "hero"))).toEqual({
      ...INSPECTED,
      tag: "hero",
      width: WIDE_WIDTH,
    });
  });

  it("returns the size on Reset and keeps the caller's edit", () => {
    const edited = widen(withTag(INSPECTED, "hero"));
    const reset = resetSize(edited);

    expect(reset).toEqual(withTag(INSPECTED, "hero"));
    expect(sizeValue(reset)).toBe("120 x 80");
  });

  it("puts the four rows the probe reads by name above the static context", () => {
    expect(
      propertyRows(INSPECTED)
        .slice(0, 4)
        .map((row) => row.key),
    ).toEqual(["name", "tag", "size", "area"]);
    expect(propertyRows(INSPECTED).length).toBeGreaterThan(4);
  });

  it("is mounted by the page it documents", () => {
    const page = read("../../../../../packages/data/docs/property-panel.mdx");

    expect(page).toContain('<ComponentPreview name="property-panel-demo" />');
  });
});
