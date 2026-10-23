import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { laneData } from "../../lib/inventory-data";
import { summarize, supportLabel } from "../../lib/inventory";
import { LaneTable } from "./lane-table";

/**
 * The lane table is the only place a composition page gets its rows, so the
 * guard is that the rendered table carries every row the inventory has — a
 * dropped row would leave a component undocumented with no other symptom — and
 * that its headline counts come from the same rows.
 */

const render = (lane: "layout" | "data-display" | "workspace"): string =>
  renderToStaticMarkup(<LaneTable lane={lane} />);

describe("the lane table", () => {
  it.each(["layout", "data-display", "workspace"] as const)(
    "renders every %s row the inventory has",
    (lane) => {
      const markup = render(lane);
      const { rows } = laneData(lane);

      expect(rows.length).toBeGreaterThan(0);
      expect(rows.filter((row) => !markup.includes(row.name))).toEqual([]);
      // Every status is printed, so a `todo` row cannot look shipped.
      expect(rows.filter((row) => !markup.includes(row.status))).toEqual([]);
    },
  );

  it("prints the shipped and unbuilt counts for the lane", () => {
    const markup = render("layout");
    const { total, shipped, pending } = summarize(laneData("layout").rows);

    expect(markup).toContain(`${total} rows`);
    expect(markup).toContain(`${shipped} shipped`);
    expect(markup).toContain(`${pending} to build`);
  });

  it.each(["layout", "data-display", "workspace"] as const)(
    "prints every %s row's GPUix cell through the label rule",
    (lane) => {
      // The cell is not a verbatim copy: `?` is "never measured", and a row
      // that lost its label would print a question mark a reader takes for a
      // verdict. Derived from the lane's own rows, so a reworded label in
      // `inventory.ts` fails here instead of leaving the table behind.
      const markup = render(lane);
      const missing = laneData(lane).rows.filter(
        (row) => !markup.includes(supportLabel(row.support)),
      );

      expect(missing.map((row) => `${row.name}: ${row.support}`)).toEqual([]);
    },
  );
});
