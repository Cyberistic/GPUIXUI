import {
  ADVANCED_FILTER,
  DATA_TOOLBAR,
  FILTER_GROUP,
  KEY_VALUE_LABEL,
  STAT_CARD,
  STAT_VALUE,
  SURFACE_HEADER,
  SURFACE_PANEL,
} from "@gpuixui/data/surfaces/recipe";
import {
  TABLE_CAPTION,
  TABLE_CELL,
  TABLE_HEADER_CELL,
  TABLE_ROOT,
} from "@gpuixui/data/table/recipe";
import { TREE_ROW, TREE_ROW_ACTIVE } from "@gpuixui/data/tree/recipe";
import { themes } from "@gpuixui/tokens";
import { classesToStyle } from "@gpuixui/tw";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import type { JSX } from "react";
import { describe, expect, it } from "vitest";
import { AdvancedFilterDemo } from "./advanced-filter-demo";
import { ChartDemoBody } from "./charts-demo";
import {
  COLUMN_DEFS,
  ColumnConfigurationDemo,
} from "./column-configuration-demo";
import { DataToolbarDemo } from "./data-toolbar-demo";
import { ExpandableRowsDemo } from "./expandable-rows-demo";
import { FrozenColumnsDemo } from "./frozen-columns-demo";
import { KeyValueDemo } from "./key-value-demo";
import { PropertyPanelDemo } from "./property-panel-demo";
import { StatCardDemo } from "./stat-card-demo";
import { TableFilterDemo } from "./table-filter-demo";
import {
  emptySelection,
  pressMode,
  pressSelection,
} from "@gpuixui/data/selection/logic";
import {
  OPENING_ORDER,
  SelectionFrame,
  SortFrame,
  keysOf,
  sortedRows,
} from "./table-rule-demos";
import { DependencyTreeDemo, VirtualTreeDemo } from "./tree-demo";
import { VirtualizationDemo } from "./virtualization-demo";

/**
 * The data lane's pages, held to the components they draw.
 *
 * Every one of the fifteen `/data-display` previews is a browser
 * reproduction of a GPUix host, so nothing type-checks the paint: a drawing can
 * keep its rules and still drift into hand-rolled markup — which is exactly
 * what these pages did, with a raw `<table>`, a bare `<input>` and unstyled
 * `<button>`s while the rest of the library already had a shape.
 *
 * These cases are the seam. Each style rule the drawings read is compared with
 * the recipe the runtime compiles (`packages/data/src/**\/recipe.ts` through
 * `@gpuixui/tw`), so a component that changes a step fails here until the
 * drawing follows; and each page's rendered markup is held to the class family
 * of the component it says it mirrors, so a drawing cannot fall back to plain
 * HTML.
 */

const css = readFileSync(
  new URL("../../styles/demos.css", import.meta.url),
  "utf8",
);

/** The declarations of the first `selector { … }` block in the sheet. */
const rule = (selector: string): string => {
  const start = css.indexOf(`\n${selector} {`);
  if (start === -1) throw new Error(`no ${selector} block`);
  return css.slice(start, css.indexOf("}", start));
};

/** `successSoftForeground` → `success-soft-foreground`. */
const kebab = (name: string): string =>
  name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

/** The variable a role paints, as the sheet writes it. */
const rolePaint = (role: keyof typeof themes.dark.colors): string =>
  `var(--${kebab(role)})`;

/** The role a compiled colour is, so a block's paint is held to the recipe. */
const roleOf = (
  role: keyof typeof themes.dark.colors,
  value: string | undefined,
): boolean =>
  value !== undefined &&
  themes.dark.colors[role].toLowerCase() === value.toLowerCase();

const style = (recipe: string): ReturnType<typeof classesToStyle>["style"] =>
  classesToStyle(recipe, themes.dark).style;

describe("the table skin mirrors the table's recipes", () => {
  it("paints a header cell at the recipe's inset, type and colour", () => {
    const header = style(TABLE_HEADER_CELL);
    const block = rule(".gx-dt-hcell");

    expect(header.paddingTop).toBe(8);
    expect(block).toContain(
      `padding: ${header.paddingTop}px ${header.paddingLeft}px;`,
    );
    expect(block).toContain(`font-size: ${header.fontSize}px;`);
    expect(block).toContain(`font-weight: ${header.fontWeight};`);
    expect(roleOf("mutedForeground", header.color)).toBe(true);
    expect(block).toContain(`color: ${rolePaint("mutedForeground")};`);
  });

  it("paints a cell at the recipe's inset and type", () => {
    const cell = style(TABLE_CELL);
    const block = rule(".gx-dt-cell");

    expect(block).toContain(
      `padding: ${cell.paddingTop}px ${cell.paddingLeft}px;`,
    );
    expect(block).toContain(`font-size: ${cell.fontSize}px;`);
    expect(block).toContain(`line-height: ${cell.lineHeight}px;`);
  });

  it("paints the frame's edge, fill, corner and caption", () => {
    const root = style(TABLE_ROOT);
    const frame = rule(".gx-dt");

    // `rounded-lg border border-input bg-card`: the registry answers
    // `border-input` with the `border` role (the tokens' `input` is a field
    // fill), and the block reads that role rather than a literal.
    expect(roleOf("border", root.borderColor)).toBe(true);
    expect(roleOf("card", root.backgroundColor)).toBe(true);
    expect(frame).toContain(`border: 1px solid ${rolePaint("border")};`);
    // `rounded-lg` compiles to the theme's `lg` corner, which the bridge
    // writes as `--radius-lg`; both sides have to agree for this to hold.
    expect(themes.dark.radius.lg).toBe(root.borderRadius);
    expect(frame).toContain("border-radius: var(--radius-lg);");
    expect(frame).toContain(`background: ${rolePaint("card")};`);

    const caption = style(TABLE_CAPTION);
    expect(rule(".gx-dt-caption")).toContain(
      `font-size: ${caption.fontSize}px;`,
    );
  });

  it("paints the detail row on the muted strip the recipe names", () => {
    // `TABLE_DETAIL_ROW` is `bg-muted text-muted-foreground`; the compiled
    // backdrop is the muted role and the label the muted foreground.
    const detail = style("bg-muted text-muted-foreground");
    expect(rule(".gx-dt-detail")).toContain(
      `background: ${rolePaint("muted")};`,
    );
    expect(roleOf("muted", detail.backgroundColor ?? "")).toBe(true);
    expect(rule(".gx-dt-detail")).toContain(
      `color: ${rolePaint("mutedForeground")};`,
    );
  });
});

describe("the surface skin mirrors the data surfaces' recipes", () => {
  it("paints a panel and its header the way SURFACE_PANEL/HEADER do", () => {
    const panel = style(SURFACE_PANEL);
    const body = rule(".gx-dpanel");
    expect(roleOf("border", panel.borderColor)).toBe(true);
    expect(roleOf("card", panel.backgroundColor)).toBe(true);
    expect(body).toContain(`border: 1px solid ${rolePaint("border")};`);
    expect(themes.dark.radius.lg).toBe(panel.borderRadius);
    expect(body).toContain("border-radius: var(--radius-lg);");
    expect(body).toContain(`background: ${rolePaint("card")};`);

    const header = rule(".gx-dpanel-head");
    expect(header).toContain(
      `padding: ${style(SURFACE_HEADER).paddingTop}px ${style(SURFACE_HEADER).paddingLeft}px;`,
    );
  });

  it("paints a key-value row and its fixed label column", () => {
    const label = style(KEY_VALUE_LABEL);
    expect(rule(".gx-dkv-label")).toContain(`font-size: ${label.fontSize}px;`);
    expect(roleOf("mutedForeground", label.color)).toBe(true);
    expect(rule(".gx-dkv-label")).toContain(
      `color: ${rolePaint("mutedForeground")};`,
    );
    expect(rule(".gx-dkv-label")).toContain("flex: none;");
  });

  it("paints a statistic's label and its 24px reading", () => {
    const card = style(STAT_CARD);
    expect(rule(".gx-dstat")).toContain(`gap: ${card.gap}px;`);
    expect(rule(".gx-dstat")).toContain(
      `padding: ${card.paddingTop}px ${card.paddingLeft}px;`,
    );

    const value = style(STAT_VALUE);
    expect(rule(".gx-dstat-value")).toContain(
      `font-size: ${value.fontSize}px;`,
    );
    expect(rule(".gx-dstat-value")).toContain(
      `font-weight: ${value.fontWeight};`,
    );
  });

  it("paints the toolbar on its muted strip", () => {
    const strip = style(DATA_TOOLBAR);
    expect(roleOf("muted", strip.backgroundColor)).toBe(true);
    expect(rule(".gx-dtoolbar")).toContain(
      `background: ${rolePaint("muted")};`,
    );
    expect(rule(".gx-dtoolbar")).toContain(
      `padding: ${strip.paddingTop}px ${strip.paddingLeft}px;`,
    );
    expect(rule(".gx-dtoolbar")).toContain(`gap: ${strip.gap}px;`);
  });

  it("paints the builder's panel and its ruled group", () => {
    const builder = style(ADVANCED_FILTER);
    expect(rule(".gx-dfilter")).toContain(
      `padding: ${builder.paddingTop}px ${builder.paddingLeft}px;`,
    );
    expect(rule(".gx-dfilter")).toContain(`gap: ${builder.gap}px;`);
    expect(rule(".gx-dfilter-group")).toContain("border-left: 1px solid");
    expect(rule(".gx-dfilter-group")).toContain(
      `padding-left: ${style(FILTER_GROUP).paddingLeft}px;`,
    );
  });
});

describe("the tree skin mirrors the tree's rows", () => {
  it("paints a row at the row role's type and the density's height", () => {
    const row = style(TREE_ROW);
    const active = style(TREE_ROW_ACTIVE);

    expect(rule(".gx-dtree-row")).toContain(`font-size: ${row.fontSize}px;`);
    expect(rule(".gx-dtree-row")).toContain(
      `padding-right: ${row.paddingRight}px;`,
    );
    expect(rule(".gx-dtree-row")).toContain("height: var(--row-height);");
    expect(roleOf("selected", active.backgroundColor)).toBe(true);
    expect(rule('.gx-dtree-row[data-current="true"]')).toContain(
      `background: ${rolePaint("selected")};`,
    );
    // The height is the component's own reader, not a number the sheet chose.
    expect(
      readFileSync(
        new URL(
          "../../../../../packages/data/src/tree/row.tsx",
          import.meta.url,
        ),
        "utf8",
      ),
    ).toContain("height: treeRowHeight(height, theme)");
  });
});

/**
 * One page's drawing: the component it mirrors, and the classes that prove it.
 *
 * `absent` names the hand-rolled markup the page used before the skin, so a
 * fallback is a failing case rather than a style nobody notices.
 */
interface Scene {
  readonly page: string;
  readonly mirrors: string;
  readonly body: JSX.Element;
  readonly present: ReadonlyArray<string>;
  readonly absent: ReadonlyArray<string>;
}

const scenes: ReadonlyArray<Scene> = [
  {
    page: "table-sorting",
    mirrors: "TableSortHeader inside TableHeaderCell",
    body: (
      <SortFrame
        onSort={() => undefined}
        order={OPENING_ORDER}
        rows={sortedRows(OPENING_ORDER)}
      />
    ),
    present: [
      "gx-dt",
      "gx-dt-hcell",
      "gx-dt-sort",
      "gx-dt-glyph",
      "gx-dt-caption",
    ],
    absent: ["<table", "gx-table-el", "gx-table-sort"],
  },
  {
    page: "table-selection",
    mirrors: "TableRow selected + TableCell",
    body: (
      <SelectionFrame
        onPress={() => undefined}
        onToggle={() => undefined}
        onToggleAll={() => undefined}
        rows={sortedRows(OPENING_ORDER)}
        selection={pressSelection(
          emptySelection,
          "auth",
          pressMode({}),
          keysOf(sortedRows(OPENING_ORDER)),
        )}
      />
    ),
    present: [
      "gx-dt",
      "gx-dcheck",
      "gx-dt-check",
      'data-selected="true"',
      "gx-dt-caption",
    ],
    absent: ["<table", 'type="checkbox" aria-label="Choose every deploy"'],
  },
  {
    page: "table-filtering",
    mirrors: "TableFilterField above a Table",
    body: <TableFilterDemo />,
    present: ["gx-dfield gx-dfield-sm", "gx-dt", "gx-badge"],
    absent: ["<table", "gx-field", "gx-toolbar-row"],
  },
  {
    page: "tree-view",
    mirrors: "TreeView row",
    body: <DependencyTreeDemo />,
    present: ["gx-dtree", "gx-dtree-row", "gx-dtree-slot", "gx-badge"],
    absent: ["gx-tree-row", "gx-tree-chevron", "gx-tree-version"],
  },
  {
    page: "virtual-tree",
    mirrors: "VirtualTree window",
    body: <VirtualTreeDemo />,
    present: ["gx-dtree-window", "gx-dnumber", "gx-dtree-row", "gx-dtree-slot"],
    absent: ["gx-virt-range", 'type="range"'],
  },
  {
    page: "stat-card",
    mirrors: "StatCard",
    body: <StatCardDemo />,
    present: [
      "gx-dstat",
      "gx-dstat-label",
      "gx-dstat-value",
      "gx-dstat-hint",
      "gx-dstat-trend",
    ],
    absent: ["gx-stat-card", "gx-stat-choice"],
  },
  {
    page: "key-value",
    mirrors: "KeyValue",
    body: <KeyValueDemo />,
    present: [
      "gx-dkv",
      "gx-dkv-row",
      "gx-dkv-label",
      "gx-dkv-value",
      "gx-toggle",
    ],
    absent: ["gx-kv-row", "gx-demo-choice"],
  },
  {
    page: "data-toolbar",
    mirrors: "DataToolbar with an Input and a Button",
    body: <DataToolbarDemo />,
    present: ["gx-dtoolbar", "gx-dfield", "gx-dt-row", "gx-badge"],
    absent: ["gx-toolbar", "gx-toolbar-row"],
  },
  {
    page: "expandable-rows",
    mirrors: "TableExpandableRow + TableDetailRow",
    body: <ExpandableRowsDemo />,
    present: ["gx-dt-detail", "gx-dt-expander", "gx-dkv", "gx-dt-caption"],
    absent: ["gx-er-row", "gx-er-detail", "gx-kv-row"],
  },
  {
    page: "frozen-columns",
    mirrors: "FrozenTable's two panes",
    body: <FrozenColumnsDemo />,
    present: [
      "gx-dt-frozen",
      "gx-dt-frozen-pane",
      "gx-dt-frozen-body",
      "gx-badge",
    ],
    absent: ["gx-fc-row", "gx-fc-body", "gx-demo-choice"],
  },
  {
    page: "virtualization",
    mirrors: "VirtualTable's window",
    body: <VirtualizationDemo />,
    present: [
      "gx-dt",
      "gx-virt-row",
      "gx-dnumber",
      "gx-badge",
      "gx-dt-caption",
    ],
    absent: ["gx-virt-frame", 'type="range"', "gx-table-number"],
  },
  {
    page: "column-configuration",
    mirrors: "ColumnMenu + TableSortHeader divider",
    body: <ColumnConfigurationDemo />,
    present: ["gx-dt", "gx-dt-divider", "gx-dt-fixed", "gx-dmenu"],
    absent: ["<table", "gx-table-head", "gx-cols-divider"],
  },
  {
    page: "charts",
    mirrors: "BarChart/LineChart frame",
    body: <ChartDemoBody mode="bars" theme={themes.dark} />,
    present: [
      "gx-dchart",
      "gx-dchart-axis",
      "gx-dchart-categories",
      "gx-dchart-legend",
    ],
    absent: ["gx-chart-plot", "gx-chart-grid"],
  },
  {
    page: "property-panel",
    mirrors: "PropertyPanel + KeyValue + StatCard",
    body: <PropertyPanelDemo />,
    present: ["gx-dpanel", "gx-dpanel-head", "gx-dkv", "gx-dstat"],
    absent: ["gx-inspector-label", "gx-inspector-metric", "gx-inspector-input"],
  },
  {
    page: "advanced-filter",
    mirrors: "AdvancedFilter",
    body: <AdvancedFilterDemo />,
    present: [
      "gx-dfilter",
      "gx-dfilter-clause",
      "gx-dfilter-group",
      "gx-dfield",
      "gx-toggle",
      "gx-dt",
    ],
    absent: ["<table", "gx-filter-toggle", "gx-filter-stored"],
  },
];

describe("every data page draws its component's own surfaces", () => {
  it.each(scenes)("$page mirrors $mirrors", ({ body, present, absent }) => {
    const html = renderToStaticMarkup(body);

    expect(present.filter((name) => !html.includes(name))).toEqual([]);
    expect(absent.filter((name) => html.includes(name))).toEqual([]);
  });

  it.each(scenes)("$page keeps no hand-rolled table markup", ({ body }) => {
    // The pages this pass rebuilt all carried one of these families. A drawing
    // that falls back to one of them is the regression this case exists for,
    // so the sweep is wider than any single page's `absent` list.
    const html = renderToStaticMarkup(body);
    const legacy = [
      "<table",
      "gx-table-el",
      "gx-table-head",
      "gx-table-cell",
      "gx-table-row",
      "gx-table-sort",
      "gx-er-",
      "gx-fc-",
      "gx-kv-",
      "gx-trule",
      "gx-demo-choice",
      "gx-inspector-label",
      "gx-inspector-value",
      "gx-inspector-metric",
      "gx-inspector-input",
      "gx-inspector-rows",
      "gx-chart-",
      "gx-stat-",
    ].filter((name) => html.includes(name));

    expect(legacy).toEqual([]);
  });

  it("keeps the column menu's rows and the divider's bounds", () => {
    const html = renderToStaticMarkup(<ColumnConfigurationDemo />);

    // One divider per visible column, and the row cap the menu refuses.
    expect(html.match(/data-resize="/g) ?? []).toHaveLength(COLUMN_DEFS.length);
    COLUMN_DEFS.forEach((column) => {
      expect(html).toContain(`aria-valuenow="${column.width}"`);
    });
    expect(html.match(/role="separator"/g) ?? []).toHaveLength(
      COLUMN_DEFS.length,
    );
  });
});
