/**
 * The expandable row in the real GPUix renderer, mounted through the shipped
 * example.
 *
 * The bugs these guard are the ones a table without row spans can ship:
 *
 * - a detail panel painted **inside** the row, so it is one cell wide instead
 *   of as wide as the table's content;
 * - a panel that does not push the rows below it, so the table's rows overlap
 *   the panel the reader just opened;
 * - a press on the panel that closes the row it belongs to, because the panel
 *   sits under the row's own handler;
 * - a chevron that paints and takes the press, so pressing the chevron does not
 *   open the row (`press-routing-lifecycle`).
 */

import { afterEach, describe, expect, it } from "vitest";
import { ExpandableRowsExample } from "../../examples/expandable-rows.example.js";
import {
  clickCentreOf,
  paintedText,
  requireBounds,
} from "../internal/interaction.js";
import {
  renderData,
  settle,
  type DataTestRoot,
} from "../internal/test-root.js";

let root: DataTestRoot | undefined;

/** Mount the example; `afterEach` tears it down even when an assertion fails. */
const mount = (): DataTestRoot => {
  root = renderData(<ExpandableRowsExample />);
  settle(root);
  return root;
};

afterEach(() => {
  root?.unmount();
  root = undefined;
});

describe("the expandable table row", () => {
  it("opens the panel under the row the press lands on", () => {
    const root = mount();

    expect(paintedText(root)).not.toContain("src/readme.md");

    clickCentreOf(root, "expandable-row-readme");
    root.renderer.flush();

    expect(paintedText(root)).toContain("src/readme.md");
    expect(
      root.renderer.findByTestId("expandable-detail-readme"),
    ).toBeDefined();

    // A second press closes it again, so the row is a toggle rather than an
    // open-only action.
    clickCentreOf(root, "expandable-row-readme");
    root.renderer.flush();
    expect(paintedText(root)).not.toContain("src/readme.md");
  });

  it("paints the panel as wide as the row it belongs to", () => {
    const root = mount();

    clickCentreOf(root, "expandable-row-index");
    root.renderer.flush();

    const row = requireBounds(root, "expandable-row-index");
    const panel = requireBounds(root, "expandable-detail-index");
    const cell = requireBounds(root, "expandable-detail-index-cell");

    // A detail row is a sibling, so it starts where the row starts and fills the
    // same content width — no column spans on 0.11.0. Its one cell fills the
    // row, so a panel's content is not a narrow column at the left edge.
    expect(panel.x).toBe(row.x);
    expect(panel.width).toBe(row.width);
    expect(cell.x).toBe(panel.x);
    expect(cell.width).toBe(panel.width);
  });

  it("pushes the rows below the panel down by its height", () => {
    const root = mount();

    const before = requireBounds(root, "expandable-row-table");

    clickCentreOf(root, "expandable-row-index");
    root.renderer.flush();

    const panel = requireBounds(root, "expandable-detail-index");
    const after = requireBounds(root, "expandable-row-table");

    // The panel takes its own room in the column: the row it opened over is
    // exactly one panel height higher than it was.
    expect(after.y - before.y).toBe(panel.height);
  });

  it("keeps the row open when the press lands on the panel", () => {
    const root = mount();

    clickCentreOf(root, "expandable-row-index");
    root.renderer.flush();

    // The panel's own content is not inside the row, so its press is not the
    // row's press.
    clickCentreOf(root, "expandable-kv-index-label-path");
    root.renderer.flush();

    expect(root.renderer.findByTestId("expandable-detail-index")).toBeDefined();
    expect(paintedText(root)).toContain("src/index.ts");
  });

  it("opens the row from a press on its chevron, which paints", () => {
    const root = mount();
    const row = requireBounds(root, "expandable-row-theme");

    // The chevron's own `<svg>` sits at the row's leading edge. It must not
    // take the press: a painted child is the hit-test boundary, so an icon that
    // paints without `pointerEvents: "none"` would be a dead zone.
    root.renderer.nativeSimulateClick(row.x + 16, row.y + row.height / 2);
    root.renderer.flush();

    expect(paintedText(root)).toContain("src/theme.ts");
  });
});
