import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import { viewer, work } from "./data.js";
import { inScope, itemsIn, stageCounts } from "./logic.js";

const view = { stage: "Build", scope: "all", query: "", sort: "due" } as const;

describe("the pipeline's rules", () => {
  it("shows one stage, soonest due first", () => {
    const rows = itemsIn(work, view, viewer);
    expect(Arr.every(rows, (row) => row.stage === "Build")).toBe(true);
    expect(Arr.map(rows, (row) => row.due)).toEqual([
      "2026-11-08",
      "2026-11-10",
      "2026-11-12",
      "2026-11-15",
      "2026-11-18",
    ]);
    expect(rows[0]?.title).toBe("Card binder search");
  });

  it("keeps only the viewer's work in the Mine scope", () => {
    const mine = itemsIn(work, { ...view, scope: "mine" }, viewer);
    expect(Arr.map(mine, (row) => row.id)).toEqual(["w1", "w10"]);
  });

  it("narrows to one project", () => {
    expect(
      Arr.every(
        inScope(work, { scope: "Greed Island", query: "" }, viewer),
        (row) => row.project === "Greed Island",
      ),
    ).toBe(true);
    expect(
      inScope(work, { scope: "Greed Island", query: "" }, viewer),
    ).toHaveLength(6);
  });

  it("matches a query against titles, ignoring case", () => {
    expect(
      Arr.map(
        inScope(work, { scope: "all", query: "  SYNC " }, viewer),
        (row) => row.id,
      ),
    ).toEqual(["w1", "w13"]);
  });

  it("counts each stage of the scope, in stage order", () => {
    expect(stageCounts(work)).toEqual([
      ["Idea", 3],
      ["Spec", 3],
      ["Build", 5],
      ["Review", 3],
      ["Shipped", 4],
    ]);
    expect(
      stageCounts(inScope(work, { scope: "mine", query: "" }, viewer)),
    ).toEqual([
      ["Idea", 0],
      ["Spec", 0],
      ["Build", 2],
      ["Review", 0],
      ["Shipped", 2],
    ]);
  });
});
