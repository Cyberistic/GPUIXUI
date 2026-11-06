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

const mount = (): DataTestRoot => {
  root = renderData(<ExpandableRowsExample />);
  settle(root);
  return root;
};

const testIdOf = (root: DataTestRoot, testId: string): number => {
  const element = root.renderer.findByTestId(testId);
  if (element === undefined) throw new Error(`behaviour: no ${testId}`);
  return element.id;
};

const focusedTestId = (root: DataTestRoot): Option.Option<string> =>
  Option.flatMap(
    Option.fromNullishOr(root.renderer.getFocusedElementId()),
    (id) => Option.fromNullishOr(root.renderer.getElement(id)?.testId),
  );

afterEach(() => {
  root?.unmount();
  root = undefined;
});

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

    expect(after.y - before.y).toBe(panel.height);
  });

  it("keeps the row open when the press lands on the panel", () => {
    const root = mount();

    clickCentreOf(root, "expandable-row-index");
    root.renderer.flush();

    clickCentreOf(root, "expandable-kv-index-label-path");
    root.renderer.flush();

    expect(root.renderer.findByTestId("expandable-detail-index")).toBeDefined();
    expect(paintedText(root)).toContain("src/index.ts");
  });

  it("opens the row from a press on its chevron, which paints", () => {
    const root = mount();
    const row = requireBounds(root, "expandable-row-theme");

    root.renderer.nativeSimulateClick(row.x + 16, row.y + row.height / 2);
    root.renderer.flush();

    expect(paintedText(root)).toContain("src/theme.ts");
  });

  it("opens the row the Tab order lands on, from the keyboard", () => {
    const root = mount();

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

    pressKey(root, "focus-field", "space");
    root.renderer.flush();
    expect(paintedText(root)).not.toContain("detail panel");

    pressKey(root, "focus-row", "enter");
    root.renderer.flush();
    expect(paintedText(root)).toContain("detail panel");

    pressKey(root, "focus-disabled-row", "space");
    root.renderer.flush();
    expect(paintedText(root)).not.toContain("disabled panel");
  });
});
