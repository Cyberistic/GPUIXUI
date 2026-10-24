/**
 * The data surfaces a store handed back with a slot it wrote `null` for.
 *
 * The bug these guard: JSON keeps `null` for a field a record never set, so a
 * panel, toolbar, card or builder restored from storage arrives with a nullish
 * optional slot. The components read those slots as present because the prop
 * types say they are, and one dereference (`trend.direction`, `search.value`,
 * `rows.map`) threw out of the render and took every other part of the surface
 * down — the title, the toolbar's own actions, the card's reading. A surface
 * with no slot paints without it; a stored absence is not a broken surface.
 */

import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { paintedText } from "../internal/interaction.js";
import {
  renderData,
  settle,
  type DataTestRoot,
} from "../internal/test-root.js";
import { AdvancedFilter } from "../surfaces/advanced-filter.js";
import { KeyValue } from "../surfaces/key-value.js";
import type { FilterTree } from "../surfaces/logic.js";
import { PropertyPanel } from "../surfaces/property-panel.js";
import { StatCard } from "../surfaces/stat-card.js";
import { DataToolbar } from "../surfaces/toolbar.js";

let root: DataTestRoot | undefined;

const mount = (node: ReactNode): DataTestRoot => {
  root = renderData(node);
  settle(root);
  return root;
};

afterEach(() => {
  root?.unmount();
  root = undefined;
});

/** A tree with one clause, so the builder paints a row and reads its fields. */
const SAVED: FilterTree = {
  kind: "all",
  children: [
    { kind: "predicate", field: "name", comparison: "contains", value: "re" },
  ],
};

describe("a data surface whose stored slot is null", () => {
  it("paints a statistic card with no trend", () => {
    const mounted = mount(
      <StatCard
        label="Area"
        value="9600"
        // @ts-expect-error — a slot a store wrote as absent.
        trend={null}
      />,
    );
    expect(paintedText(mounted)).toContain("9600");
  });

  it("paints a toolbar's own controls with no search field", () => {
    const mounted = mount(
      <DataToolbar
        testId="toolbar"
        // @ts-expect-error — a slot a store wrote as absent.
        search={null}
      >
        <text>Wide</text>
      </DataToolbar>,
    );
    expect(paintedText(mounted)).toContain("Wide");
  });

  it("paints a property panel with no rows", () => {
    const mounted = mount(
      <PropertyPanel
        title="Properties"
        // @ts-expect-error — a slot a store wrote as absent.
        rows={null}
      />,
    );
    expect(paintedText(mounted)).toContain("Properties");
  });

  it("paints a key-value list with no entries", () => {
    const mounted = mount(
      <div>
        {/* @ts-expect-error — a slot a store wrote as absent. */}
        <KeyValue entries={null} />
        <text>after</text>
      </div>,
    );
    expect(paintedText(mounted)).toContain("after");
  });

  it("paints the advanced filter's saved clause with no field list", () => {
    const mounted = mount(
      <AdvancedFilter
        // @ts-expect-error — a slot a store wrote as absent.
        fields={null}
        tree={SAVED}
        onChange={() => {}}
        testId="filter"
      />,
    );
    expect(paintedText(mounted)).toContain("contains");
  });

  it("paints no key-value row for a stored entry that names nothing", () => {
    const mounted = mount(
      <KeyValue
        testId="kv"
        entries={[
          { key: "width", label: "Width", value: "120" },
          // @ts-expect-error — a saved entry an older shape wrote with no key.
          { label: "Orphan", value: "ghost" },
        ]}
      />,
    );
    expect(paintedText(mounted)).not.toContain("Orphan");
    expect(mounted.renderer.findByTestId("kv-label-width")).toBeDefined();
    expect(mounted.renderer.findByTestId("kv-label-undefined")).toBeUndefined();
  });

  it("paints no property row for a stored row that names nothing", () => {
    const mounted = mount(
      <PropertyPanel
        title="Properties"
        rows={[
          { kind: "readonly", key: "tag", label: "Tag", value: "v1" },
          // @ts-expect-error — a saved row an older shape wrote with no key.
          { kind: "editable", value: "ghost", onChange: () => {} },
        ]}
      />,
    );
    expect(paintedText(mounted)).not.toContain("ghost");
    expect(mounted.renderer.findByTestId("property-tag")).toBeUndefined();
    expect(mounted.renderer.findByTestId("property-undefined")).toBeUndefined();
  });
});
