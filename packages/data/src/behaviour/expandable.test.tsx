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

import { Input } from "@gpuixui/primitives";
import * as Option from "effect/Option";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { ExpandableRowsExample } from "../../examples/expandable-rows.example.js";
import {
  clickCentreOf,
  paintedText,
  pressKey,
  requireBounds,
} from "../internal/interaction.js";
import {
  renderData,
  settle,
  type DataTestRoot,
} from "../internal/test-root.js";
import { TableExpandableRow } from "../table/expandable.js";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableViewport,
} from "../table/table.js";

let root: DataTestRoot | undefined;

/** Mount the example; `afterEach` tears it down even when an assertion fails. */
const mount = (): DataTestRoot => {
  root = renderData(<ExpandableRowsExample />);
  settle(root);
  return root;
};

/** The renderer's id for `testId`, failing with the id it looked for. */
const testIdOf = (root: DataTestRoot, testId: string): number => {
  const element = root.renderer.findByTestId(testId);
  if (element === undefined) throw new Error(`behaviour: no ${testId}`);
  return element.id;
};

/** The test id of whatever holds the platform focus. */
const focusedTestId = (root: DataTestRoot): Option.Option<string> =>
  Option.flatMap(
    Option.fromNullishOr(root.renderer.getFocusedElementId()),
    (id) => Option.fromNullishOr(root.renderer.getElement(id)?.testId),
  );

afterEach(() => {
  root?.unmount();
  root = undefined;
});

/**
 * A row whose cells hold a field, beside a disabled row.
 *
 * The key half of the runtime's routing is the focus path: a key typed in a
 * field inside a row **reaches the row's handler**, so a disclosure row that
 * toggles on every Enter turns the panel open while the reader confirms a value
 * (`press-routing-lifecycle`'s `field-cell` route). A row that cannot act must
 * refuse its keys for the same reason it refuses its press.
 */
const RowFocusFixture = () => {
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);
  const [disabledOpen, setDisabledOpen] = useState(false);
  return (
    <Table height={240} aria-label="Rows with a field" testId="focus-table">
      <TableViewport>
        <TableHeader>
          <TableRow>
            <TableHeaderCell width={120}>Name</TableHeaderCell>
            <TableHeaderCell width={220}>Note</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableExpandableRow
            testId="focus-row"
            detailTestId="focus-detail"
            expanded={open}
            onToggle={() => setOpen((current) => !current)}
            cells={
              <>
                <TableCell width={120}>row</TableCell>
                <TableCell width={220}>
                  <Input
                    label="Note"
                    value={note}
                    onValueChange={setNote}
                    size="sm"
                    testId="focus-field"
                  />
                </TableCell>
              </>
            }
            detail={<text>detail panel</text>}
          />
          <TableExpandableRow
            testId="focus-disabled-row"
            detailTestId="focus-disabled-detail"
            disabled
            expanded={disabledOpen}
            onToggle={() => setDisabledOpen((current) => !current)}
            cells={<TableCell width={340}>disabled row</TableCell>}
            detail={<text>disabled panel</text>}
          />
        </TableBody>
      </TableViewport>
    </Table>
  );
};

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

  it("opens the row the Tab order lands on, from the keyboard", () => {
    const root = mount();

    // A disclosure row is a control: it is a stop in the Tab order, so Tab from
    // the toolbar reaches it, and Enter/Space toggle the panel. A focusable
    // `div` has no activation of its own — only the pointer path runs `onClick`
    // — so a row that answered the pointer alone left a keyboard reader no way
    // to open a panel at all.
    root.renderer.focusElement(testIdOf(root, "expandable-expand-all"));
    root.renderer.flush();
    root.renderer.focusNext();
    root.renderer.flush();
    expect(focusedTestId(root)).toEqual(Option.some("expandable-row-readme"));

    const row = testIdOf(root, "expandable-row-readme");
    root.renderer.nativeSimulateKeyDown(row, "space");
    root.renderer.flush();
    expect(paintedText(root)).toContain("src/readme.md");

    root.renderer.nativeSimulateKeyDown(row, "enter");
    root.renderer.flush();
    expect(paintedText(root)).not.toContain("src/readme.md");
  });

  it("keeps a key typed in a cell to that cell, and a disabled row to itself", () => {
    root = renderData(<RowFocusFixture />);
    settle(root);

    // Space inside the field decides the field's value; it must not also open
    // the disclosure row the field sits in (`press-routing-lifecycle` measured
    // the key reaching the row's handler through the focus path).
    pressKey(root, "focus-field", "space");
    root.renderer.flush();
    expect(paintedText(root)).not.toContain("detail panel");

    // The row itself is still the disclosure's control.
    pressKey(root, "focus-row", "enter");
    root.renderer.flush();
    expect(paintedText(root)).toContain("detail panel");

    // A disabled row refuses the pointer and the keyboard: a negative tab index
    // is ordered before the zero stops rather than removed from the chain, so
    // programmatic focus can reach it.
    pressKey(root, "focus-disabled-row", "space");
    root.renderer.flush();
    expect(paintedText(root)).not.toContain("disabled panel");
  });
});
