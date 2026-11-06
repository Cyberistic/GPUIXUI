import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  emptySelection,
  pressMode,
  pressSelection,
} from "@gpuixui/data/selection/logic";
import {
  pressSortOrder,
  sortOrderGlyph,
  sortOrderLabel,
  type SortOrder,
} from "@gpuixui/data/sort/logic";
import {
  OPENING_ORDER,
  SelectionFrame,
  SortFrame,
  chosenKeys,
  glyphOf,
  keysOf,
  selectionReadout,
  sortReadout,
  sortedRows,
} from "./table-rule-demos";

const root = new URL("../../../../../", import.meta.url);

const source = readFileSync(
  new URL("apps/docs/src/components/docs/table-rule-demos.tsx", root),
  "utf8",
);

const painted = (html: string): ReadonlyArray<string> =>
  [...html.matchAll(/data-row="([^"]+)"/g)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]],
  );

const sortingMarkup = (order: SortOrder): string =>
  renderToStaticMarkup(
    <SortFrame
      onSort={() => undefined}
      order={order}
      rows={sortedRows(order)}
    />,
  );

describe("the Table sorting preview", () => {
  it("paints the rows the package's row model orders, not the source order", () => {
    const order = pressSortOrder([], "duration", "desc");
    const rows = sortedRows(order);

    expect(rows.map((row) => row.id)).toEqual([
      "reports",
      "search",
      "media",
      "billing",
      "auth",
      "gateway",
    ]);

    expect(rows[0]?.duration).toBe(211);
    expect(rows[5]?.duration).toBe(36);
  });

  it("walks every entry of a two-field order, not only the primary", () => {
    const order = pressSortOrder(
      pressSortOrder([], "environment", "asc"),
      "service",
      "desc",
      true,
    );

    expect(sortedRows(order).map((row) => row.id)).toEqual([
      "media",
      "gateway",
      "billing",
      "auth",
      "search",
      "reports",
    ]);
  });

  it("names each header and paints the place its field holds in the order", () => {
    const order: SortOrder = [
      { field: "duration", direction: "desc" },
      { field: "service", direction: "asc" },
    ];
    const html = sortingMarkup(order);

    expect(html).toContain(
      `aria-label="${sortOrderLabel("Duration", order, "duration")}"`,
    );
    expect(html).toContain(
      `aria-label="${sortOrderLabel("Service", order, "service")}"`,
    );
    expect(glyphOf(order, "duration")).toBe(sortOrderGlyph(order, "duration"));
    expect(glyphOf(order, "duration")).toBe("↓1");
    expect(glyphOf(order, "service")).toBe("↑2");

    expect(glyphOf([], "status")).toBe("↕");
    expect(html).toContain(sortOrderLabel("Environment", order, "environment"));

    expect(painted(html)).toEqual(sortedRows(order).map((row) => row.id));
  });

  it("reads the order out in the headers' own glyphs", () => {
    expect(sortReadout([])).toBe("source order — press a header");
    expect(
      sortReadout([
        { field: "environment", direction: "asc" },
        { field: "service", direction: "desc" },
      ]),
    ).toBe("Environment ↑1 · Service ↓2");
  });
});

describe("the sorting drawing's shape", () => {
  it("paints the table's header cell and its ghost sort button", () => {
    const html = sortingMarkup([]);

    expect(html).toContain('class="gx-dt-hcell"');
    expect(html).toContain('class="gx-btn gx-btn-ghost gx-btn-sm gx-dt-sort"');
    expect(html).toContain('class="gx-dt"');
    expect(html).not.toContain("<table");

    const css = readFileSync(
      new URL("../../styles/demos.css", import.meta.url),
      "utf8",
    );
    const cell = css.slice(css.indexOf("\n.gx-dt-cell {"));

    expect(cell.slice(0, cell.indexOf("}"))).toContain("padding: 8px 12px;");
    expect(cell.slice(0, cell.indexOf("}"))).toContain("font-size: 14px;");
  });
});

describe("the Table selection preview", () => {
  const rows = sortedRows(OPENING_ORDER);
  const keys = keysOf(rows);

  it("orders the range by the painted order, not the fixture's", () => {
    expect(keys).toEqual([
      "auth",
      "billing",
      "gateway",
      "media",
      "reports",
      "search",
    ]);
  });

  it("keeps a range from the anchor and a chord on the one record", () => {
    const plain = pressSelection(
      emptySelection,
      "gateway",
      pressMode({}),
      keys,
    );
    const ranged = pressSelection(
      plain,
      "search",
      pressMode({ shift: true }),
      keys,
    );
    const chorded = pressSelection(
      ranged,
      "auth",
      pressMode({ cmd: true }),
      keys,
    );

    expect(chosenKeys(plain)).toEqual(["gateway"]);
    expect(chosenKeys(ranged)).toEqual([
      "gateway",
      "media",
      "reports",
      "search",
    ]);
    expect(chosenKeys(chorded)).toEqual([
      "auth",
      "gateway",
      "media",
      "reports",
      "search",
    ]);
    expect(selectionReadout(chorded, rows.length)).toBe(
      "5 of 6 chosen: auth, gateway, media, reports, search",
    );
  });

  it("paints the chosen records and the readout they feed", () => {
    const chosen = pressSelection(
      pressSelection(emptySelection, "gateway", pressMode({}), keys),
      "search",
      pressMode({ shift: true }),
      keys,
    );
    const html = renderToStaticMarkup(
      <SelectionFrame
        onPress={() => undefined}
        onToggle={() => undefined}
        onToggleAll={() => undefined}
        rows={rows}
        selection={chosen}
      />,
    );

    expect(html).toContain(selectionReadout(chosen, rows.length));
    expect(html).toContain('data-row="gateway" data-selected="true"');
    expect(html).toContain('data-row="billing" data-selected="false"');
    expect(html.match(/aria-selected="true"/g)).toHaveLength(4);
    expect(html).toContain('aria-label="Choose edge-gateway"');
    expect(html).toContain('aria-label="Choose every deploy"');
    expect(html).toContain('aria-checked="mixed"');
  });

  it("reads the package's rules instead of keeping a second copy", () => {
    expect(source).toContain('from "@gpuixui/data/grid-core"');
    expect(source).toContain('from "@gpuixui/data/sort/logic"');
    expect(source).toContain('from "@gpuixui/data/selection/logic"');

    expect(source).not.toContain("export const pressSortOrder");
    expect(source).not.toContain("export const pressSelection");
  });
});
