import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { laneData } from "../../lib/inventory-data";
import { summarize, supportLabel } from "../../lib/inventory";
import { LaneTable } from "./lane-table";

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
      const markup = render(lane);
      const missing = laneData(lane).rows.filter(
        (row) => !markup.includes(supportLabel(row.support)),
      );

      expect(missing.map((row) => `${row.name}: ${row.support}`)).toEqual([]);
    },
  );
});
