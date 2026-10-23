/**
 * Holds the `panel-group-core` fixture to its own arithmetic.
 *
 * The scenario asserts the **painted** widths against `panelWidths` and the
 * printed readout against the layout, so the numbers it compares with are the
 * ones this file derives. If the fixture and the step drifted together — a
 * fraction edited in one place, a step counted as a whole share instead of a
 * share of the divider-free space — the probe would stay green on a group that
 * lays out nothing the package documents. These cases make the derivation
 * fail on its own.
 */
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
    // The panes plus the dividers are the group's whole width, to a point.
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
    // The collapsed ids are printed in the layout's own pane order.
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
    // The third pane is not a neighbour of the first divider and keeps its share.
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
    // The steps assume the first stop inside the group is the sidebar's
    // toggle: a toggle on the editor would move it.
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
