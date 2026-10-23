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
import { DEFAULT_LABEL_WIDTH, KeyValue } from "../surfaces/key-value.js";
import type { FilterTree } from "../surfaces/logic.js";
import { DataToolbar } from "../surfaces/toolbar.js";

let root: DataTestRoot | undefined;

/** A builder over a tree its caller holds, so an Add control repaints it. */
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

  it("holds the label column when a computed width cannot paint", () => {
    // The width is a measurement of the words the column holds, and a
    // measurement taken before the first layout is often `NaN`. A `width: NaN`
    // is dropped by the runtime, so the label track fell back to each label's
    // own text width and every value began somewhere else — the one rule the
    // list exists for, broken by the size a caller computed.
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

  it("adds a clause to the nested group the reader asked", () => {
    // The root add could never reach an `any` group: a caller could read a
    // nested group but not extend it, so a query that needed "A or B" had to be
    // built outside the builder. Every group in a group paints its own Add.
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

    // The clause joined the `any` (slot `1-1`), and the root kept its two
    // children: the add landed where the reader pressed, not at the root.
    expect(root.renderer.findByTestId("nested-1-1-value")).toBeDefined();
    expect(root.renderer.findByTestId("nested-2-value")).toBeUndefined();
    // The new clause starts on the first field, so the group reads that way.
    expect(paintedText(root)).toContain(
      "any of (name contains alpha, status equals",
    );
  });

  it("composes a group's combinator and its negation from the builder", () => {
    // The tree held `all`, `any` and `not` from the first release, but the
    // builder could only write a flat `all`: a reader who needed "A or B"
    // built it outside the component. Add group and the group's own
    // combinator menu are that missing half.
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

    // The group landed where the reader asked and starts as an `all` holding
    // one blank clause, so it never lands as an empty `any` (which keeps
    // nothing).
    expect(paintedText(root)).toContain(
      "all of (status equals tracked, all of (",
    );
    expect(root.renderer.findByTestId("nested-1-0-value")).toBeDefined();

    // Its combinator is a control: switching it keeps the clause the reader
    // will type into.
    clickCentreOf(root, "nested-1-kind");
    root.renderer.flush();
    clickCentreOf(root, "nested-1-kind-any");
    root.renderer.flush();
    expect(paintedText(root)).toContain(
      "all of (status equals tracked, any of (",
    );

    // Negating wraps the group, and the sentence says so.
    clickCentreOf(root, "nested-1-kind");
    root.renderer.flush();
    clickCentreOf(root, "nested-1-kind-negate");
    root.renderer.flush();
    expect(paintedText(root)).toContain("not (any of (");

    // The same control gives the group back rather than stacking a second
    // negation.
    clickCentreOf(root, "nested-1-kind");
    root.renderer.flush();
    clickCentreOf(root, "nested-1-kind-negate");
    root.renderer.flush();
    expect(paintedText(root)).not.toContain("not (");
    expect(paintedText(root)).toContain("any of (");
  });

  it("edits a group a not negates, where the builder paints its controls", () => {
    // A `not` holds one child, so it paints no Add or Remove of its own — but a
    // group inside it is a group like any other: its Add appends there and a
    // clause's Remove takes that clause out. Both controls were painted while
    // `appendAt`/`removeAt` refused every path through a `not`, so pressing
    // either changed nothing while the button claimed it would.
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

    // The clause the reader pressed is gone; its sibling stays.
    expect(root.renderer.findByTestId("nested-0-0-1-value")).toBeUndefined();
    expect(paintedText(root)).toContain("not (any of (name contains alpha))");

    clickCentreOf(root, "nested-0-0-add");
    root.renderer.flush();

    // The Add appended a clause to the negated `any`, not to the root.
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

describe("the toolbar's wait", () => {
  /** A toolbar whose field keeps no value, and a readout of the reported query. */
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

  /**
   * The query the toolbar reported.
   *
   * The window's painted text holds the field's own run too, so the readout
   * carries a marker: a typed `logo` is not a report of `logo`.
   */
  const reported = (root: DataTestRoot): string =>
    paintedText(root)
      .replace(/[\s\S]*?reported:/, "")
      .split(" ")[0] ?? "";

  it("takes the documented wait when the delay cannot be read", async () => {
    // `debounceMs` is often computed — a setting read from storage, a
    // per-surface policy — and `@tanstack/pacer` hands its wait to `setTimeout`,
    // which reads `NaN` and an infinity as an immediate timer. A computed `NaN`
    // therefore reported the query in the next tick and the debounce existed
    // only on paper: the regression the field is here to prevent. The documented
    // 150 ms is the wait when the delay is not a finite, non-negative number.
    const mounted = renderData(<Harness debounceMs={Number.NaN} />);
    root = mounted;
    settle(mounted);
    typeInto(mounted, "wait-search", "logo");
    mounted.renderer.flush();
    expect(reported(mounted)).toBe("none");

    await after(40);
    mounted.renderer.flush();
    // Still waiting: a `NaN` wait fired within the first tick.
    expect(reported(mounted)).toBe("none");

    await waitFor(() => {
      mounted.renderer.flush();
      expect(reported(mounted)).toBe("logo");
    });
  });

  it("reports every edit at once when the wait is zero", () => {
    // Zero is the one value that means "no wait", so the guard must not
    // replace it with the default: a caller asking for an un-debounced field
    // gets one.
    const mounted = renderData(<Harness debounceMs={0} />);
    root = mounted;
    settle(mounted);
    typeInto(mounted, "wait-search", "logo");
    mounted.renderer.flush();
    expect(reported(mounted)).toBe("logo");
  });
});
