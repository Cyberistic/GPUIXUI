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
 */

import * as Arr from "effect/Array";
import { afterEach, describe, expect, it } from "vitest";
import { decodeA11yTree, onlyRole, withRole } from "../internal/a11y.js";
import {
  renderData,
  settle,
  type DataTestRoot,
} from "../internal/test-root.js";
import { AdvancedFilter } from "../surfaces/advanced-filter.js";
import { KeyValue } from "../surfaces/key-value.js";
import { PropertyPanel } from "../surfaces/property-panel.js";
import { StatCard } from "../surfaces/stat-card.js";

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
    const labels = Arr.map(
      Object.values(tree.nodes),
      (node) => node.aria.value ?? "",
    );
    expect(labels).toContain("any of (status equals tracked)");
    expect(labels).toContain("any of");
  });
});
