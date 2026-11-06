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

const treeOf = (node: Parameters<typeof renderData>[0]): A11yTree => {
  root = renderData(node);
  settle(root);
  return decodeA11yTree(root.renderer.getA11yTree());
};

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

    expect(sortName(decodeA11yTree(root.renderer.getA11yTree()))).toBe(
      "status, sortable",
    );
  });
});

describe("a sortable header's label", () => {
  it("sits on the cell's own inset, not the ghost button's padding", () => {
    root = renderData(
      <TableSortHeader
        field="service"
        label="Service"
        sort={Option.none()}
        onSort={() => {}}
        testId="inset-sort"
      />,
    );
    settle(root);
    const button = root.renderer.findByTestId("inset-sort-sort");

    expect(button?.style.paddingLeft).toBe(0);
    expect(button?.style.paddingRight).toBe(0);
  });
});
