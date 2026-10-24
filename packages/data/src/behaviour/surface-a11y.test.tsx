/**
 * The data surfaces' words reach the accessibility tree.
 *
 * The bug this guards: `KeyValue`, `StatCard`, `PropertyPanel`'s title and the
 * advanced filter's own words were painted as `div`s holding a string, and
 * GPUix reaches its tree only through an element that carries a role — a
 * `<text>` is the runtime's `Label` node, a roleless `div` paints nothing a
 * reader hears. Measured before the fix, a window holding a key-value list and
 * a statistic card reported **one** node, the `Window`: the inspector's labels,
 * every value and the metric's reading were silent.
 *
 * The guards below read the rendered tree back through the schema decoder, so
 * they hold the announced shape rather than a screenshot: a key-value list is a
 * named `List` of `ListItem`s, a statistic card is a named `Group` whose reading
 * is a `Label`, and a property panel announces its title and rows.
 *
 * A documented default is not a name until it covers the blank string a locale
 * table or a saved record hands over: a default only applies to an *absent*
 * prop, so these surfaces also read an empty label as the words they document —
 * and a panel's blank title as no heading, not an unnamed one. The grid's own
 * controls follow the same rule: a column menu's trigger and surface and the
 * select-all box were left unnamed by a blank default, because their fallback
 * was written in the destructuring where only `undefined` reaches it.
 */

import * as Arr from "effect/Array";
import { afterEach, describe, expect, it } from "vitest";
import { ColumnMenu, DEFAULT_COLUMN_MENU_LABEL } from "../columns/menu.js";
import { DEFAULT_FILTER_LABEL, TableFilterField } from "../filter/field.js";
import { decodeA11yTree, onlyRole, withRole } from "../internal/a11y.js";
import {
  renderData,
  settle,
  type DataTestRoot,
} from "../internal/test-root.js";
import {
  DEFAULT_SELECTION_LABEL,
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

/** Render one surface in a real window and hand back its accessibility tree. */
const treeOf = (node: Parameters<typeof renderData>[0]) => {
  root = renderData(node);
  settle(root);
  return decodeA11yTree(root.renderer.getA11yTree());
};

/** The words a node's `Label` descendants announce, in paint order. */
const labelsUnder = (
  tree: ReturnType<typeof decodeA11yTree>,
  id: string,
): ReadonlyArray<string> =>
  Arr.map(
    withRole(tree, id, "Label"),
    (node) => tree.nodes[node]?.aria.value ?? "",
  );

/** A node's own accessible name. */
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

    // The combinator is the group's own control, not a word beside the tree:
    // a reader changes it in place, so it has to be a named button, described
    // with what a press does to the group.
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

    // A locale table with a missing row answers `""`; the default only covers
    // an absent prop, so the field used to publish no name at all.
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

    // The builder's blank title reads as its documented words…
    expect(
      Arr.map(
        withRole(tree, tree.root, "Heading"),
        (id) => tree.nodes[id]?.aria.value,
      ),
    ).toEqual([DEFAULT_FILTER_TITLE]);
    // …while the panel's blank title is absence: no second, unnamed heading.
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

    // A blank i18n row used to leave the header box with no name at all, while
    // the prop's documented default sat unused.
    expect(nameOf(tree, onlyRole(tree, "CheckBox"))).toBe(
      DEFAULT_SELECTION_LABEL,
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
    // The picker's trigger and the value field are controls, so each needs the
    // field's words; a blank label used to leave the trigger unnamed and the
    // value field named `" value"`.
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
    // The choice inside the menu is named by the same words, not left blank.
    expect(
      Arr.map(withRole(open, open.root, "MenuItem"), (id) => nameOf(open, id)),
    ).toContain("status");
  });

  it("reads a blank property row's label as the key it is stored by", () => {
    // Bug guarded: a property row's label is content — a saved object answers
    // `""` for a row whose name key is missing — and the panel paints it in the
    // label column and hands it to the editable row's `Input` as its name. A
    // blank one left that field unnamed while the row was still editable, and
    // the label column empty. The row's key is the identity the panel addresses
    // it by, so a blank label reads as the key.
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
    // The label column paints the same word the field is named by.
    expect(labelsUnder(tree, onlyRole(tree, "List"))).toEqual(
      expect.arrayContaining(["tag", "name"]),
    );
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
    // Both the trigger and the surface it opens are names a reader hears; a
    // blank label used to leave them empty while `Columns` sat in the default.
    expect(nameOf(tree, onlyRole(tree, "Button"))).toBe(
      DEFAULT_COLUMN_MENU_LABEL,
    );
    expect(nameOf(tree, onlyRole(tree, "Menu"))).toBe(
      DEFAULT_COLUMN_MENU_LABEL,
    );
  });
});
