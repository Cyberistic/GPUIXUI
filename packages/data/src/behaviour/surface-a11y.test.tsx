import * as Arr from "effect/Array";
import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_RESIZE_LABEL,
  TableColumnDivider,
} from "../columns/divider.js";
import { ColumnMenu, DEFAULT_COLUMN_MENU_LABEL } from "../columns/menu.js";
import { DEFAULT_FILTER_LABEL, TableFilterField } from "../filter/field.js";
import { decodeA11yTree, onlyRole, withRole } from "../internal/a11y.js";
import {
  renderData,
  settle,
  type DataTestRoot,
} from "../internal/test-root.js";
import {
  DEFAULT_SELECTION_CELL_LABEL,
  DEFAULT_SELECTION_LABEL,
  TableSelectionCell,
  TableSelectionHeader,
} from "../selection/column.js";
import {
  AdvancedFilter,
  DEFAULT_FILTER_TITLE,
} from "../surfaces/advanced-filter.js";
import { KeyValue } from "../surfaces/key-value.js";
import { emptyTree } from "../surfaces/logic.js";
import { PropertyPanel } from "../surfaces/property-panel.js";
import { StatCard } from "../surfaces/stat-card.js";
import { DataToolbar, DEFAULT_SEARCH_LABEL } from "../surfaces/toolbar.js";

let root: DataTestRoot | undefined;

afterEach(() => {
  root?.unmount();
  root = undefined;
});

const treeOf = (node: Parameters<typeof renderData>[0]) => {
  root = renderData(node);
  settle(root);
  return decodeA11yTree(root.renderer.getA11yTree());
};

const labelsUnder = (
  tree: ReturnType<typeof decodeA11yTree>,
  id: string,
): ReadonlyArray<string> =>
  Arr.map(
    withRole(tree, id, "Label"),
    (node) => tree.nodes[node]?.aria.value ?? "",
  );

const nameOf = (tree: ReturnType<typeof decodeA11yTree>, id: string): string =>
  tree.nodes[id]?.aria.label ?? "";

describe("the data surfaces announce what they paint", () => {
  it("paints a key-value list as a named list of labelled items", () => {
    const tree = treeOf(
      <KeyValue
        aria-label="Properties"
        entries={[
          { key: "width", label: "Width", value: "120" },
          { key: "height", label: "Height", value: "80" },
        ]}
      />,
    );

    const list = onlyRole(tree, "List");
    expect(nameOf(tree, list)).toBe("Properties");
    const rows = withRole(tree, list, "ListItem");
    expect(rows).toHaveLength(2);
    expect(Arr.map(rows, (row) => labelsUnder(tree, row))).toEqual([
      ["Width", "120"],
      ["Height", "80"],
    ]);
  });

  it("paints a statistic card under a named group, reading included", () => {
    const tree = treeOf(
      <StatCard
        aria-label="Area"
        label="Area"
        value={9600}
        unit="px²"
        trend={{ direction: "up", text: "+12%" }}
      />,
    );

    const group = onlyRole(tree, "Group");
    expect(nameOf(tree, group)).toBe("Area");
    expect(labelsUnder(tree, group)).toEqual(["Area", "9600", "px²", "+12%"]);
  });

  it("paints no line for the copy a card was handed blank", () => {
    const tree = treeOf(
      <StatCard
        aria-label="Area"
        label="   "
        value={9600}
        unit="  "
        hint=" "
        trend={{ direction: "up", text: "   " }}
      />,
    );

    const group = onlyRole(tree, "Group");

    expect(labelsUnder(tree, group)).toEqual(["9600"]);
  });

  it("announces a property panel's title and its read-only rows", () => {
    const tree = treeOf(
      <PropertyPanel
        aria-label="Properties"
        title="Properties"
        rows={[
          { kind: "readonly", key: "tag", label: "Tag", value: "hero" },
          {
            kind: "editable",
            key: "name",
            label: "Name",
            value: "Ada",
            onChange: () => {},
          },
        ]}
      />,
    );

    const group = onlyRole(tree, "Group");
    expect(nameOf(tree, group)).toBe("Properties");
    const heading = onlyRole(tree, "Heading");
    expect(tree.nodes[heading]?.aria.value).toBe("Properties");
    const list = onlyRole(tree, "List");
    const rows = withRole(tree, list, "ListItem");
    expect(rows).toHaveLength(2);
    expect(labelsUnder(tree, rows[0] ?? "")).toEqual(["Tag", "hero"]);
  });

  it("announces an advanced filter's sentence and its combinator", () => {
    const tree = treeOf(
      <AdvancedFilter
        fields={[{ field: "status", label: "Status" }]}
        tree={{
          kind: "any",
          children: [
            {
              kind: "predicate",
              field: "status",
              comparison: "equals",
              value: "tracked",
            },
          ],
        }}
        onChange={() => {}}
      />,
    );

    const heading = onlyRole(tree, "Heading");
    expect(tree.nodes[heading]?.aria.value).toBe("Filters");
    const nodes = Object.values(tree.nodes);
    const labels = Arr.map(nodes, (node) => node.aria.value ?? "");
    expect(labels).toContain("any of (status equals tracked)");

    const combinator = Arr.filter(
      nodes,
      (node) => node.aria.label === "any of",
    );
    expect(Arr.map(combinator, (node) => node.aria.role)).toEqual(["Button"]);
    expect(Arr.map(combinator, (node) => node.aria.description)).toEqual([
      "Change how this group combines its clauses",
    ]);
  });

  it("reads a blank field name as the documented default", () => {
    const tree = treeOf(
      <TableFilterField
        value=""
        onValueChange={() => {}}
        label=""
        testId="blank-filter"
      />,
    );

    expect(nameOf(tree, onlyRole(tree, "TextInput"))).toBe(
      DEFAULT_FILTER_LABEL,
    );
  });

  it("reads a blank toolbar search name as the documented default", () => {
    const tree = treeOf(
      <DataToolbar
        testId="blank-toolbar"
        search={{ value: "", onValueChange: () => {}, label: "" }}
      />,
    );

    expect(nameOf(tree, onlyRole(tree, "TextInput"))).toBe(
      DEFAULT_SEARCH_LABEL,
    );
  });

  it("reads a blank builder title as the default and a blank panel title as absent", () => {
    const tree = treeOf(
      <div>
        <AdvancedFilter
          fields={[]}
          tree={emptyTree}
          onChange={() => {}}
          title=""
        />
        <PropertyPanel rows={[]} title="" />
      </div>,
    );

    expect(
      Arr.map(
        withRole(tree, tree.root, "Heading"),
        (id) => tree.nodes[id]?.aria.value,
      ),
    ).toEqual([DEFAULT_FILTER_TITLE]);
  });

  it("reads a blank select-all name as the documented default", () => {
    const tree = treeOf(
      <TableSelectionHeader
        checked={false}
        onCheckedChange={() => {}}
        label=""
        testId="blank-select"
      />,
    );

    expect(nameOf(tree, onlyRole(tree, "CheckBox"))).toBe(
      DEFAULT_SELECTION_LABEL,
    );
  });

  it("reads a blank row box name as the documented default", () => {
    const blank = treeOf(
      <TableSelectionCell
        checked={false}
        onCheckedChange={() => {}}
        label=""
        testId="blank-row-select"
      />,
    );
    expect(nameOf(blank, onlyRole(blank, "CheckBox"))).toBe(
      DEFAULT_SELECTION_CELL_LABEL,
    );

    root?.unmount();
    const whitespace = treeOf(
      <TableSelectionCell
        checked={false}
        onCheckedChange={() => {}}
        label="   "
        testId="whitespace-row-select"
      />,
    );
    expect(nameOf(whitespace, onlyRole(whitespace, "CheckBox"))).toBe(
      DEFAULT_SELECTION_CELL_LABEL,
    );
  });

  it("reads a blank field name as the field it reads", () => {
    root = renderData(
      <AdvancedFilter
        fields={[{ field: "status", label: "" }]}
        tree={{
          kind: "predicate",
          field: "status",
          comparison: "equals",
          value: "tracked",
        }}
        onChange={() => {}}
        testId="blank-fields"
      />,
    );
    settle(root);
    const before = decodeA11yTree(root.renderer.getA11yTree());

    expect(
      Arr.map(withRole(before, before.root, "Button"), (id) =>
        nameOf(before, id),
      ),
    ).toContain("status");
    expect(
      Arr.map(withRole(before, before.root, "TextInput"), (id) =>
        nameOf(before, id),
      ),
    ).toEqual(["status value"]);

    const trigger = root.renderer.findByTestId("blank-fields-0-field");
    if (trigger === undefined) {
      throw new Error("the field picker painted no trigger");
    }
    const bounds = root.renderer.getElementBounds(trigger.id);
    if (bounds === null) {
      throw new Error("the field picker's trigger painted no box");
    }
    root.renderer.nativeSimulateClick(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
      0,
    );
    root.renderer.flush();

    const open = decodeA11yTree(root.renderer.getA11yTree());

    expect(
      Arr.map(withRole(open, open.root, "MenuItem"), (id) => nameOf(open, id)),
    ).toContain("status");
  });

  it("names a clause that names no field, instead of opening on its comparison", () => {
    const tree = treeOf(
      <AdvancedFilter
        fields={[]}
        tree={{
          kind: "all",
          children: [
            {
              kind: "predicate",
              field: "   ",
              comparison: "equals",
              value: "",
            },
          ],
        }}
        onChange={() => {}}
        testId="blank-field"
      />,
    );

    expect(
      Arr.map(withRole(tree, tree.root, "Button"), (id) => nameOf(tree, id)),
    ).toEqual(["all of", "Field", "equals", "Remove clause", "Clear"]);
    expect(
      Arr.map(withRole(tree, tree.root, "TextInput"), (id) => nameOf(tree, id)),
    ).toEqual(["Field value"]);
    expect(
      Arr.map(
        withRole(tree, tree.root, "Label"),
        (id) => tree.nodes[id]?.aria.value,
      ),
    ).toEqual(["all of (Field equals)"]);
  });

  it("reads a blank property row's label as the key it is stored by", () => {
    const tree = treeOf(
      <PropertyPanel
        aria-label="Properties"
        rows={[
          { kind: "readonly", key: "tag", label: "", value: "hero" },
          {
            kind: "editable",
            key: "name",
            label: "   ",
            value: "Ada",
            onChange: () => {},
          },
        ]}
      />,
    );

    const field = onlyRole(tree, "TextInput");
    expect(nameOf(tree, field)).toBe("name");

    expect(labelsUnder(tree, onlyRole(tree, "List"))).toEqual(
      expect.arrayContaining(["tag", "name"]),
    );
  });

  it("reads a blank key-value label as the key it is stored by", () => {
    const tree = treeOf(
      <KeyValue
        aria-label="Properties"
        entries={[
          { key: "width", label: "", value: "120" },
          { key: "height", label: "   ", value: "80" },
        ]}
      />,
    );

    expect(labelsUnder(tree, onlyRole(tree, "List"))).toEqual([
      "width",
      "120",
      "height",
      "80",
    ]);
  });

  it("reads blank column-menu names as the documented default", () => {
    root = renderData(
      <ColumnMenu
        state={{
          columns: [{ id: "name", label: "Name", visible: true, width: 160 }],
        }}
        onChange={() => {}}
        label=""
        contentLabel="  "
        testId="blank-columns"
      />,
    );
    settle(root);
    const trigger = root.renderer.findByTestId("blank-columns");
    if (trigger === undefined) {
      throw new Error("the column menu painted no trigger");
    }
    const bounds = root.renderer.getElementBounds(trigger.id);
    if (bounds === null) {
      throw new Error("the column menu's trigger painted no box");
    }
    root.renderer.nativeSimulateClick(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
      0,
    );
    root.renderer.flush();

    const tree = decodeA11yTree(root.renderer.getA11yTree());

    expect(nameOf(tree, onlyRole(tree, "Button"))).toBe(
      DEFAULT_COLUMN_MENU_LABEL,
    );
    expect(nameOf(tree, onlyRole(tree, "Menu"))).toBe(
      DEFAULT_COLUMN_MENU_LABEL,
    );
  });

  it("reads a blank column label as the id the column is stored by", () => {
    root = renderData(
      <ColumnMenu
        state={{
          columns: [
            { id: "name", label: "", visible: true, width: 160 },
            { id: "size", label: "  ", visible: true, width: 90 },
          ],
        }}
        onChange={() => {}}
        testId="blank-labels"
      />,
    );
    settle(root);
    const trigger = root.renderer.findByTestId("blank-labels");
    if (trigger === undefined) {
      throw new Error("the column menu painted no trigger");
    }
    const bounds = root.renderer.getElementBounds(trigger.id);
    if (bounds === null) {
      throw new Error("the column menu's trigger painted no box");
    }
    root.renderer.nativeSimulateClick(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
      0,
    );
    root.renderer.flush();

    const tree = decodeA11yTree(root.renderer.getA11yTree());
    const checkboxes = Arr.map(
      withRole(tree, tree.root, "MenuItemCheckBox"),
      (id) => nameOf(tree, id),
    );
    const moves = Arr.map(withRole(tree, tree.root, "MenuItem"), (id) =>
      nameOf(tree, id),
    );
    expect(checkboxes).toEqual(["name", "size"]);
    expect(moves).toEqual(["Move name", "Move size"]);
  });

  it("reads a blank divider name as the documented default", () => {
    const tree = treeOf(
      <div style={{ display: "flex", flexDirection: "row" }}>
        <TableColumnDivider
          width={160}
          onResize={() => {}}
          label=""
          testId="blank-divider"
        />
        <TableColumnDivider
          width={160}
          onResize={() => {}}
          label="   "
          testId="whitespace-divider"
        />
      </div>,
    );

    const separators = withRole(tree, tree.root, "Splitter");
    expect(Arr.map(separators, (id) => nameOf(tree, id))).toEqual([
      DEFAULT_RESIZE_LABEL,
      DEFAULT_RESIZE_LABEL,
    ]);
  });
});
