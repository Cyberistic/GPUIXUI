/**
 * The data surfaces in the real GPUix renderer, mounted through the shipped
 * example.
 *
 * The bugs these guard are the ones a pure reducer cannot see:
 *
 * - a key-value list whose label column drifts, so the values do not line up
 *   and the reader scans row by row instead of down two columns;
 * - a statistic card that stores its reading, so a width action leaves the
 *   card showing the value it had;
 * - a property panel that keeps a second copy of the object, so an edit
 *   reaches the field but not the readout;
 * - an advanced filter whose tree is painted but never applied, so the rows do
 *   not narrow;
 * - a toolbar search that re-filters on every keystroke, which the debounce
 *   exists to prevent.
 */

import { afterEach, describe, expect, it } from "vitest";
import { SurfacesExample } from "../../examples/surfaces.example.js";
import {
  after,
  clickCentreOf,
  paintedText,
  requireBounds,
  typeInto,
  waitFor,
} from "../internal/interaction.js";
import {
  renderData,
  settle,
  type DataTestRoot,
} from "../internal/test-root.js";
import { AdvancedFilter } from "../surfaces/advanced-filter.js";
import type { FilterTree } from "../surfaces/logic.js";

let root: DataTestRoot | undefined;

/** Mount the example; `afterEach` tears it down even when an assertion fails. */
const mount = (): DataTestRoot => {
  root = renderData(<SurfacesExample />);
  settle(root);
  return root;
};

afterEach(() => {
  root?.unmount();
  root = undefined;
});

describe("the data surfaces", () => {
  it("holds the label column, so every value begins at the same x", () => {
    const root = mount();

    const nameLabel = requireBounds(root, "shape-label-name");
    const widthLabel = requireBounds(root, "shape-label-width");
    const widthValue = requireBounds(root, "shape-value-width");
    const heightValue = requireBounds(root, "shape-value-height");

    // One label column: every label is the same width, at the same x.
    expect(widthLabel.x).toBe(nameLabel.x);
    expect(widthLabel.width).toBe(nameLabel.width);
    // One value column: every value begins where the label column ends, so
    // the list scans down two columns instead of drifting row by row.
    expect(heightValue.x).toBe(widthValue.x);
    expect(widthValue.x).toBeGreaterThan(widthLabel.x + widthLabel.width);
  });

  it("reads the statistic card from the object, so a width action moves it", () => {
    const root = mount();

    expect(paintedText(root)).toContain("9600");

    clickCentreOf(root, "toolbar-wide");
    root.renderer.flush();

    // The same frame: the card holds no reading of its own.
    expect(paintedText(root)).toContain("19200");
    expect(paintedText(root)).not.toContain("9600");
  });

  it("carries a property panel's edit to the readout in the frame it lands", () => {
    const root = mount();

    expect(paintedText(root)).toContain("readme.md");

    typeInto(root, "property-name", "Z");
    root.renderer.flush();

    expect(paintedText(root)).toContain("Z");
  });

  it("narrows the rows to the tree the builder edits", () => {
    const root = mount();

    expect(paintedText(root)).toContain("4 of 4 shapes");

    clickCentreOf(root, "filter-add");
    root.renderer.flush();
    expect(paintedText(root)).toContain("all of (name equals");

    typeInto(root, "filter-0-value", "main.ts");
    root.renderer.flush();

    expect(paintedText(root)).toContain("1 of 4 shapes");
  });

  it("gives a nested group's clauses their own locators", () => {
    const tree: FilterTree = {
      kind: "all",
      children: [
        {
          kind: "predicate",
          field: "status",
          comparison: "equals",
          value: "tracked",
        },
        {
          kind: "any",
          children: [
            {
              kind: "predicate",
              field: "name",
              comparison: "contains",
              value: "alpha",
            },
            {
              kind: "predicate",
              field: "size",
              comparison: "greaterThan",
              value: "1024",
            },
          ],
        },
      ],
    };
    root = renderData(
      <AdvancedFilter
        fields={[
          { field: "status", label: "Status" },
          { field: "name", label: "Name" },
          { field: "size", label: "Size" },
        ]}
        tree={tree}
        onChange={() => {}}
        testId="nested"
      />,
    );
    settle(root);

    // A clause's locator is its path, so two clauses at index 0 in different
    // groups cannot share an id.
    expect(root.renderer.findByTestId("nested-0-value")).toBeDefined();
    expect(root.renderer.findByTestId("nested-1-0-value")).toBeDefined();
    expect(root.renderer.findByTestId("nested-1-1-value")).toBeDefined();
    expect(root.renderer.findByTestId("nested-1-group-remove")).toBeDefined();
    // …and each one addresses its own painted row.
    expect(requireBounds(root, "nested-1-0-value").y).toBeLessThan(
      requireBounds(root, "nested-1-1-value").y,
    );
    expect(requireBounds(root, "nested-0-value").y).toBeLessThan(
      requireBounds(root, "nested-1-0-value").y,
    );
  });

  it("offers no Remove where removing the clause would leave the tree alone", () => {
    const negated: FilterTree = {
      kind: "not",
      child: {
        kind: "predicate",
        field: "status",
        comparison: "equals",
        value: "tracked",
      },
    };
    const tree: FilterTree = {
      kind: "all",
      children: [
        negated,
        {
          kind: "predicate",
          field: "name",
          comparison: "contains",
          value: "alpha",
        },
      ],
    };
    root = renderData(
      <AdvancedFilter
        fields={[
          { field: "status", label: "Status" },
          { field: "name", label: "Name" },
        ]}
        tree={tree}
        onChange={() => {}}
        testId="negated"
      />,
    );
    settle(root);

    // A `not` holds one child and cannot be left empty, so the clause inside it
    // carries no Remove control: a button whose press leaves the tree unchanged
    // is a control claiming an action it cannot take. The group is removed
    // whole instead.
    expect(root.renderer.findByTestId("negated-0-0-remove")).toBeUndefined();
    expect(root.renderer.findByTestId("negated-0-group-remove")).toBeDefined();
    // A clause in a normal group still removes itself.
    expect(root.renderer.findByTestId("negated-1-remove")).toBeDefined();

    // The root names no parent group to drop it, so a root `not` keeps its
    // clause and the builder's Clear is the way out.
    root.unmount();
    root = renderData(
      <AdvancedFilter
        fields={[{ field: "status", label: "Status" }]}
        tree={negated}
        onChange={() => {}}
        testId="rootnot"
      />,
    );
    settle(root);
    expect(root.renderer.findByTestId("rootnot-0-remove")).toBeUndefined();
    expect(
      root.renderer.findByTestId("rootnot-0-group-remove"),
    ).toBeUndefined();
    expect(root.renderer.findByTestId("rootnot-clear")).toBeDefined();
  });

  it("reports a toolbar search only after the debounce", async () => {
    const root = mount();

    typeInto(root, "toolbar-search", "logo");
    root.renderer.flush();

    // The wait has not run: the set is still whole.
    expect(paintedText(root)).toContain("4 of 4 shapes");

    await after(30);
    root.renderer.flush();
    expect(paintedText(root)).toContain("4 of 4 shapes");

    await waitFor(() => {
      root.renderer.flush();
      expect(paintedText(root)).toContain("1 of 4 shapes");
    });
  });
});
