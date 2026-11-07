import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import {
  PANEL_GROUP_DIVIDER,
  PANEL_GROUP_PANELS,
  PANEL_GROUP_STEP,
  PANEL_GROUP_WIDTH,
  availableWidth,
  panelGroupReadout,
  panelWidths,
  stepSizes,
} from "./panel-group-fixture.js";

const layout = (collapsed: ReadonlyArray<string>) => ({
  panels: Arr.map(PANEL_GROUP_PANELS, (panel) => ({
    id: panel.id,
    size: panel.size,
    collapsed: Arr.contains(collapsed, panel.id),
  })),
});

describe("the panel group fixture", () => {
  it("splits the space between the dividers by each pane's fraction", () => {
    const widths = panelWidths(PANEL_GROUP_WIDTH);
    const expected = [125.6, 345.4, 157];
    Arr.forEach(widths, (width, at) =>
      expect(width).toBeCloseTo(expected[at] ?? Number.NaN, 6),
    );
    expect(Arr.reduce(widths, 0, (sum, width) => sum + width)).toBeCloseTo(
      availableWidth(PANEL_GROUP_WIDTH, PANEL_GROUP_PANELS.length),
      6,
    );

    expect(
      Arr.reduce(widths, 0, (sum, width) => sum + width) +
        (PANEL_GROUP_PANELS.length - 1) * PANEL_GROUP_DIVIDER,
    ).toBe(PANEL_GROUP_WIDTH);
  });

  it("prints whole percentages and no collapsed pane at rest", () => {
    expect(panelGroupReadout(layout([]))).toBe(
      "panes=sidebar:20,editor:55,inspector:25 collapsed=none",
    );
    expect(panelGroupReadout(layout(["sidebar"]))).toBe(
      "panes=sidebar:20,editor:55,inspector:25 collapsed=sidebar",
    );

    expect(panelGroupReadout(layout(["inspector", "sidebar"]))).toBe(
      "panes=sidebar:20,editor:55,inspector:25 collapsed=sidebar,inspector",
    );
  });

  it("steps one divider's neighbours by the package's pixel step", () => {
    const move =
      PANEL_GROUP_STEP /
      availableWidth(PANEL_GROUP_WIDTH, PANEL_GROUP_PANELS.length);
    const stepped = stepSizes();
    expect(stepped[0]).toBeCloseTo(0.2 + move, 10);
    expect(stepped[1]).toBeCloseTo(0.55 - move, 10);

    expect(stepped[2]).toBe(0.25);
    expect(
      panelGroupReadout({
        panels: layout([]).panels.map((panel, at) => ({
          ...panel,
          size: stepped[at] ?? -1,
        })),
      }),
    ).toBe("panes=sidebar:23,editor:52,inspector:25 collapsed=none");
  });

  it("makes the sides collapsible and leaves the middle pane whole", () => {
    expect(Arr.map(PANEL_GROUP_PANELS, (panel) => panel.collapsible)).toEqual([
      true,
      false,
      true,
    ]);
    expect(
      Arr.reduce(PANEL_GROUP_PANELS, 0, (sum, panel) => sum + panel.size),
    ).toBeCloseTo(1, 10);
  });
});
