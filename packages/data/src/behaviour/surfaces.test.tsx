import { useState } from "react";
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
import type { AdvancedFilterField } from "../surfaces/advanced-filter.js";
import { DEFAULT_LABEL_WIDTH, KeyValue } from "../surfaces/key-value.js";
import {
  emptyTree,
  UNREADABLE_TREE,
  type FilterTree,
} from "../surfaces/logic.js";
import {
  DataToolbar,
  DEFAULT_SEARCH_PLACEHOLDER,
} from "../surfaces/toolbar.js";

let root: DataTestRoot | undefined;

const SAVED_QUERY = {
  kind: "all",
  children: [
    {
      kind: "predicate",
      field: "name",
      comparison: "startsWith",
      value: "re",
    },
  ],
} as unknown as FilterTree;

const NestedBuilder = ({ tree: initial }: { readonly tree: FilterTree }) => {
  const [tree, setTree] = useState<FilterTree>(initial);
  return (
    <AdvancedFilter
      fields={[
        { field: "status", label: "Status" },
        { field: "name", label: "Name" },
        { field: "size", label: "Size" },
      ]}
      tree={tree}
      onChange={setTree}
      testId="nested"
    />
  );
};

const GatedBuilder = ({
  fields,
  tree: initial = emptyTree,
}: {
  readonly fields: ReadonlyArray<AdvancedFilterField>;
  readonly tree?: FilterTree;
}) => {
  const [tree, setTree] = useState<FilterTree>(initial);
  return (
    <AdvancedFilter
      fields={fields}
      tree={tree}
      onChange={setTree}
      testId="gated"
    />
  );
};

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

    expect(widthLabel.x).toBe(nameLabel.x);
    expect(widthLabel.width).toBe(nameLabel.width);

    expect(heightValue.x).toBe(widthValue.x);
    expect(widthValue.x).toBeGreaterThan(widthLabel.x + widthLabel.width);
  });

  it("holds the label column when a computed width cannot paint", () => {
    root = renderData(
      <KeyValue
        testId="measured"
        labelWidth={Number.NaN}
        valueWidth={Number.POSITIVE_INFINITY}
        entries={[
          { key: "short", label: "A", value: "one" },
          { key: "long", label: "A longer label", value: "two" },
        ]}
      />,
    );
    settle(root);

    const shortLabel = requireBounds(root, "measured-label-short");
    const longLabel = requireBounds(root, "measured-label-long");
    const shortValue = requireBounds(root, "measured-value-short");
    const longValue = requireBounds(root, "measured-value-long");

    expect(longLabel.x).toBe(shortLabel.x);
    expect(longLabel.width).toBe(DEFAULT_LABEL_WIDTH);
    expect(shortValue.x).toBeGreaterThan(shortLabel.x + DEFAULT_LABEL_WIDTH);
    expect(longValue.x).toBe(shortValue.x);
  });

  it("reads the statistic card from the object, so a width action moves it", () => {
    const root = mount();

    expect(paintedText(root)).toContain("9600");

    clickCentreOf(root, "toolbar-wide");
    root.renderer.flush();

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

    expect(root.renderer.findByTestId("nested-0-value")).toBeDefined();
    expect(root.renderer.findByTestId("nested-1-0-value")).toBeDefined();
    expect(root.renderer.findByTestId("nested-1-1-value")).toBeDefined();
    expect(root.renderer.findByTestId("nested-1-group-remove")).toBeDefined();

    expect(requireBounds(root, "nested-1-0-value").y).toBeLessThan(
      requireBounds(root, "nested-1-1-value").y,
    );
    expect(requireBounds(root, "nested-0-value").y).toBeLessThan(
      requireBounds(root, "nested-1-0-value").y,
    );
  });

  it("refuses a saved tree it cannot read, and Clear starts a new one", () => {
    root = renderData(<NestedBuilder tree={SAVED_QUERY} />);
    settle(root);

    expect(paintedText(root)).toContain(UNREADABLE_TREE);
    expect(root.renderer.findByTestId("nested-0-value")).toBeUndefined();
    expect(root.renderer.findByTestId("nested-add")).toBeUndefined();
    expect(root.renderer.findByTestId("nested-add-group")).toBeUndefined();

    clickCentreOf(root, "nested-clear");
    root.renderer.flush();

    expect(paintedText(root)).toContain("everything");
    expect(paintedText(root)).not.toContain(UNREADABLE_TREE);
    expect(root.renderer.findByTestId("nested-add")).toBeDefined();
  });

  it("adds a clause to the nested group the reader asked", () => {
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
          ],
        },
      ],
    };
    root = renderData(<NestedBuilder tree={tree} />);
    settle(root);

    clickCentreOf(root, "nested-1-add");
    root.renderer.flush();

    expect(root.renderer.findByTestId("nested-1-1-value")).toBeDefined();
    expect(root.renderer.findByTestId("nested-2-value")).toBeUndefined();

    expect(paintedText(root)).toContain(
      "any of (name contains alpha, status equals",
    );
  });

  it("offers no Add while the builder has no field to name", () => {
    root = renderData(<GatedBuilder fields={[]} />);
    settle(root);
    expect(root.renderer.findByTestId("gated-add")).toBeUndefined();
    expect(root.renderer.findByTestId("gated-add-group")).toBeUndefined();

    expect(root.renderer.findByTestId("gated-clear")).toBeDefined();

    root.rerender(
      // @ts-expect-error — a hole a store wrote in a saved field list.
      <GatedBuilder fields={[{ field: null, label: "Name" }]} />,
    );
    settle(root);
    expect(root.renderer.findByTestId("gated-add")).toBeUndefined();
    expect(root.renderer.findByTestId("gated-add-group")).toBeUndefined();

    root.rerender(<GatedBuilder fields={[{ field: "", label: "Nameless" }]} />);
    settle(root);
    expect(root.renderer.findByTestId("gated-add")).toBeUndefined();
    expect(root.renderer.findByTestId("gated-add-group")).toBeUndefined();

    root.rerender(
      <GatedBuilder
        key="nested"
        fields={[]}
        tree={{
          kind: "all",
          children: [
            {
              kind: "any",
              children: [
                {
                  kind: "predicate",
                  field: "",
                  comparison: "equals",
                  value: "",
                },
              ],
            },
          ],
        }}
      />,
    );
    settle(root);
    expect(root.renderer.findByTestId("gated-0-0-value")).toBeDefined();
    expect(root.renderer.findByTestId("gated-0-add")).toBeUndefined();
    expect(root.renderer.findByTestId("gated-0-add-group")).toBeUndefined();

    root.rerender(
      <GatedBuilder fields={[{ field: "status", label: "Status" }]} />,
    );
    settle(root);
    expect(root.renderer.findByTestId("gated-add")).toBeDefined();
    expect(root.renderer.findByTestId("gated-add-group")).toBeDefined();
  });

  it("names the field a blank entry cannot be", () => {
    root = renderData(
      <GatedBuilder
        fields={[
          { field: "", label: "Nameless" },
          { field: "status", label: "Status" },
        ]}
      />,
    );
    settle(root);

    clickCentreOf(root, "gated-add");
    root.renderer.flush();

    expect(root.renderer.findByTestId("gated-0-field")).toBeDefined();
    expect(paintedText(root)).toContain("Status");
    expect(paintedText(root)).not.toContain("Nameless");
  });

  it("composes a group's combinator and its negation from the builder", () => {
    const tree: FilterTree = {
      kind: "all",
      children: [
        {
          kind: "predicate",
          field: "status",
          comparison: "equals",
          value: "tracked",
        },
      ],
    };
    root = renderData(<NestedBuilder tree={tree} />);
    settle(root);

    clickCentreOf(root, "nested-add-group");
    root.renderer.flush();

    expect(paintedText(root)).toContain(
      "all of (status equals tracked, all of (",
    );
    expect(root.renderer.findByTestId("nested-1-0-value")).toBeDefined();

    clickCentreOf(root, "nested-1-kind");
    root.renderer.flush();
    clickCentreOf(root, "nested-1-kind-any");
    root.renderer.flush();
    expect(paintedText(root)).toContain(
      "all of (status equals tracked, any of (",
    );

    clickCentreOf(root, "nested-1-kind");
    root.renderer.flush();
    clickCentreOf(root, "nested-1-kind-negate");
    root.renderer.flush();
    expect(paintedText(root)).toContain("not (any of (");

    clickCentreOf(root, "nested-1-kind");
    root.renderer.flush();
    clickCentreOf(root, "nested-1-kind-negate");
    root.renderer.flush();
    expect(paintedText(root)).not.toContain("not (");
    expect(paintedText(root)).toContain("any of (");
  });

  it("edits a group a not negates, where the builder paints its controls", () => {
    const tree: FilterTree = {
      kind: "all",
      children: [
        {
          kind: "not",
          child: {
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
        },
      ],
    };
    root = renderData(<NestedBuilder tree={tree} />);
    settle(root);

    expect(paintedText(root)).toContain(
      "not (any of (name contains alpha, size greaterThan 1024))",
    );

    clickCentreOf(root, "nested-0-0-1-remove");
    root.renderer.flush();

    expect(root.renderer.findByTestId("nested-0-0-1-value")).toBeUndefined();
    expect(paintedText(root)).toContain("not (any of (name contains alpha))");

    clickCentreOf(root, "nested-0-0-add");
    root.renderer.flush();

    expect(root.renderer.findByTestId("nested-0-0-1-value")).toBeDefined();
    expect(root.renderer.findByTestId("nested-1-value")).toBeUndefined();
    expect(paintedText(root)).toContain(
      "not (any of (name contains alpha, status equals",
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

    expect(root.renderer.findByTestId("negated-0-0-remove")).toBeUndefined();
    expect(root.renderer.findByTestId("negated-0-group-remove")).toBeDefined();

    expect(root.renderer.findByTestId("negated-1-remove")).toBeDefined();

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

describe("the toolbar's wait", () => {
  const Harness = ({ debounceMs }: { readonly debounceMs: number }) => {
    const [reported, setReported] = useState("none");
    return (
      <div>
        <DataToolbar
          testId="wait"
          search={{ value: "", debounceMs, onValueChange: setReported }}
        />
        <text testId="wait-readout">{`reported:${reported}`}</text>
      </div>
    );
  };

  const reported = (root: DataTestRoot): string =>
    paintedText(root)
      .replace(/[\s\S]*?reported:/, "")
      .split(" ")[0] ?? "";

  it("takes the documented wait when the delay cannot be read", async () => {
    const mounted = renderData(<Harness debounceMs={Number.NaN} />);
    root = mounted;
    settle(mounted);
    typeInto(mounted, "wait-search", "logo");
    mounted.renderer.flush();
    expect(reported(mounted)).toBe("none");

    await after(40);
    mounted.renderer.flush();

    expect(reported(mounted)).toBe("none");

    await waitFor(() => {
      mounted.renderer.flush();
      expect(reported(mounted)).toBe("logo");
    });
  });

  it("reports every edit at once when the wait is zero", () => {
    const mounted = renderData(<Harness debounceMs={0} />);
    root = mounted;
    settle(mounted);
    typeInto(mounted, "wait-search", "logo");
    mounted.renderer.flush();
    expect(reported(mounted)).toBe("logo");
  });
});

describe("a toolbar whose saved hint is blank", () => {
  it("paints the hint the page documents", () => {
    const mounted = renderData(
      <div>
        <DataToolbar
          testId="blank-hint"
          search={{ value: "", placeholder: "", onValueChange: () => {} }}
        />
        <DataToolbar
          testId="spaces-hint"
          search={{ value: "", placeholder: "   ", onValueChange: () => {} }}
        />
        <DataToolbar
          testId="own-hint"
          search={{ value: "", placeholder: "Find", onValueChange: () => {} }}
        />
      </div>,
    );
    root = mounted;
    settle(mounted);

    const painted = paintedText(mounted);
    expect(painted).toContain(DEFAULT_SEARCH_PLACEHOLDER);

    expect(painted).toContain("Find");
  });
});
