import { readFileSync } from "node:fs";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  COLUMN_ORDER,
  COLUMN_VIEWPORT_WIDTH,
  columnOffset,
  columnsReadout,
  contentWidth,
  maxOffsetX,
  moveColumn,
  visibleColumns,
  type ColumnId,
} from "./table-columns.js";

const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);

const scenarios = readFileSync(
  new URL("./scenarios.tsx", import.meta.url),
  "utf8",
);

const endOfDeclaration = (start: number): number =>
  Math.min(
    ...["\nconst ", "\nexport const ", "\n/**"]
      .map((marker) => scenarios.indexOf(marker, start + 1))
      .filter((at) => at !== -1),
  );

const tableColumnsSteps = (() => {
  const start = scenarios.indexOf("const tableColumnsSteps");
  return start === -1 ? "" : scenarios.slice(start, endOfDeclaration(start));
})();

const printedCheckCount = (): number =>
  Number(
    /(\d+) checks, `--only table-columns-lifecycle`/.exec(readme)?.[1] ??
      Number.NaN,
  );

describe("the columns a grid configures", () => {
  const offsetOf = (visible: ReadonlyArray<ColumnId>, id: ColumnId): number =>
    Option.getOrElse(columnOffset(visible, id), () => Number.NaN);

  it("sums the visible columns, and a hidden one takes its width with it", () => {
    expect(contentWidth(COLUMN_ORDER)).toBe(690);
    const withoutStatus = visibleColumns(COLUMN_ORDER, ["status"]);
    expect(withoutStatus).not.toContain("status");
    expect(contentWidth(withoutStatus)).toBe(610);
  });

  it("shifts every later column left by the hidden one's width", () => {
    const full = COLUMN_ORDER;
    const hidden = visibleColumns(full, ["status"]);
    const before = offsetOf(full, "owner");
    const after = offsetOf(hidden, "owner");
    expect(before - after).toBe(80);

    expect(columnOffset(hidden, "name")).toEqual(Option.some(0));

    expect(columnOffset(hidden, "status")).toEqual(Option.none());
  });

  it("names the end a shrinking content pulls the pan back to", () => {
    expect(maxOffsetX(690)).toBe(-330);
    expect(maxOffsetX(610)).toBe(-250);
    expect(maxOffsetX(450)).toBe(-90);
    expect(maxOffsetX(COLUMN_VIEWPORT_WIDTH)).toBe(0);
    expect(maxOffsetX(200)).toBe(0);
  });

  it("moves a column through the order without changing the width", () => {
    const moved = moveColumn(COLUMN_ORDER, "owner", 1);
    expect(moved).toEqual([
      "name",
      "status",
      "updated",
      "owner",
      "size",
      "kind",
    ]);
    expect(contentWidth(moved)).toBe(contentWidth(COLUMN_ORDER));
    expect(columnOffset(moved, "owner")).toEqual(Option.some(300));
    expect(columnOffset(moved, "updated")).toEqual(Option.some(200));
  });

  it("clamps a move at either end rather than dropping the column", () => {
    expect(moveColumn(COLUMN_ORDER, "name", -1)).toEqual(COLUMN_ORDER);
    expect(moveColumn(COLUMN_ORDER, "kind", 1)).toEqual(COLUMN_ORDER);
  });

  it("prints the visible order, the width, the pair and the selection", () => {
    expect(
      columnsReadout(COLUMN_ORDER, { x: 0, y: -200 }, Option.some(3)),
    ).toBe(
      "cols=name,status,owner,updated,size,kind width=690 offset=0,-200 selected=r3",
    );
    expect(
      columnsReadout(
        visibleColumns(COLUMN_ORDER, ["status"]),
        { x: -90, y: -200 },
        Option.none(),
      ),
    ).toContain("cols=name,owner,updated,size,kind width=610 offset=-90,-200");
  });

  it("prints the check count the probe actually asserts", () => {
    const asserted =
      (tableColumnsSteps.match(/ctx\.expect[A-Za-z]+\(/g)?.length ?? 0) +
      (tableColumnsSteps.match(/paintedBox\(/g)?.length ?? 0);
    expect(asserted).toBeGreaterThan(1);
    expect(printedCheckCount()).toBe(asserted);
  });
});
