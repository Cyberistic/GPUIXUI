/**
 * A sortable column that arrived unnamed announced only its state.
 *
 * The bug this guards: `TableSortHeader` painted the caller's `label` and built
 * the control's name from it, so a blank label published the name
 * `", sortable"` — a reader heard the state and not which column it belonged
 * to. A label is content before it is a literal: an i18n table missing its row
 * answers `""`, and a saved column configuration can restore a header with no
 * words. Every other name in this package already reads a blank as the words it
 * documents (the filter field's, the advanced filter's field picker, the column
 * menu's), and the column's `field` is the stable identity the header sorts by,
 * so a blank label reads as that field in the paint and in the name.
 */

import * as Option from "effect/Option";
import { afterEach, describe, expect, it } from "vitest";
import { decodeA11yTree, onlyRole, type A11yTree } from "../internal/a11y.js";
import {
  renderData,
  settle,
  type DataTestRoot,
} from "../internal/test-root.js";
import { TableSortHeader } from "../sort/header.js";

let root: DataTestRoot | undefined;

afterEach(() => {
  root?.unmount();
  root = undefined;
});

/** Render one header in a real window and hand back its accessibility tree. */
const treeOf = (node: Parameters<typeof renderData>[0]): A11yTree => {
  root = renderData(node);
  settle(root);
  return decodeA11yTree(root.renderer.getA11yTree());
};

/** The sort control's announced name. */
const sortName = (tree: A11yTree): string =>
  tree.nodes[onlyRole(tree, "Button")]?.aria.label ?? "";

describe("a sortable header's announced name", () => {
  it("reads a blank label as the field the column sorts by", () => {
    const tree = treeOf(
      <TableSortHeader
        field="name"
        label=""
        sort={Option.none()}
        onSort={() => {}}
        testId="blank-sort"
      />,
    );

    expect(sortName(tree)).toBe("name, sortable");
    // The visible label is the same reading: a header a reader can press has
    // to show which column it sorts.
    expect(root?.renderer.getAllText()).toContain("name");
  });

  it("reads a whitespace label as the field, and trims a real one", () => {
    const blank = treeOf(
      <TableSortHeader
        field="size"
        label="   "
        sort={Option.none()}
        onSort={() => {}}
      />,
    );
    expect(sortName(blank)).toBe("size, sortable");

    root?.unmount();
    const named = treeOf(
      <TableSortHeader
        field="size"
        label="  Size  "
        sort={Option.some({ field: "size", direction: "asc" })}
        onSort={() => {}}
      />,
    );
    expect(sortName(named)).toBe("Size, sorted ascending");
  });

  it("keeps the column named once a press sorts it", () => {
    root = renderData(
      <TableSortHeader
        field="status"
        label=""
        sort={Option.none()}
        onSort={() => {}}
        testId="blank-press"
      />,
    );
    settle(root);
    const press = root.renderer.findByTestId("blank-press-sort");
    if (press === undefined) {
      throw new Error("the header painted no sort control");
    }
    const bounds = root.renderer.getElementBounds(press.id);
    if (bounds === null) {
      throw new Error("the sort control painted no box");
    }
    root.renderer.nativeSimulateClick(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
      0,
    );
    root.renderer.flush();

    // The press reports through `onSort`; the controller hands the new state
    // back on the next render, which is what a caller does.
    expect(sortName(decodeA11yTree(root.renderer.getA11yTree()))).toBe(
      "status, sortable",
    );
  });
});
