import { describe, expect, it } from "vitest";
import {
  flowGraph,
  hierarchyLeaves,
  hierarchyRoots,
  hierarchyRows,
  nameOf,
} from "./hierarchy.js";

describe("the rows a hierarchy makes", () => {
  it("reads a path's name from its last segment", () => {
    expect(nameOf("root/engineering/frontend")).toBe("frontend");
    expect(nameOf("root")).toBe("root");
  });

  it("keeps a list that names one root", () => {
    const rows = hierarchyRows([
      { path: "root/a", value: 60 },
      { path: "root/b", value: 40 },
    ]);

    expect(rows.map((row) => row.path)).toEqual(["root/a", "root/b"]);
  });

  it("gives a list that names no root one of its own", () => {
    const rows = hierarchyRows([
      { path: "a", value: 60 },
      { path: "b", value: 40 },
    ]);

    expect(hierarchyRoots(rows).length).toBe(1);
    expect(rows.length).toBe(3);

    expect(hierarchyRoots(rows)[0]?.value).toBe(100);
  });

  it("gives a list that names two roots one that holds them both", () => {
    const rows = hierarchyRows([
      { path: "a", value: 60 },
      { path: "b", value: 40 },
    ]);

    expect(hierarchyRoots(rows).length).toBe(1);
    expect(hierarchyRoots(rows)[0]?.value).toBe(100);
  });

  it("aggregates a parent's value from its children", () => {
    const rows = hierarchyRows([
      { path: "root/a", value: 60 },
      { path: "root/a/aa", value: 30 },
      { path: "root/a/ab", value: 30 },
    ]);

    const parent = rows.find((row) => row.path === "root/a");
    expect(parent?.value).toBe(60);
  });

  it("counts a value that is not a number as nothing", () => {
    const rows = hierarchyRows([
      { path: "root/a", value: Number.NaN },
      { path: "root/b", value: 40 },
    ]);

    expect(rows.find((row) => row.path === "root/a")?.value).toBe(0);
    expect(rows.find((row) => row.path === "root/b")?.value).toBe(40);
  });

  it("paints the leaves, and not the parents", () => {
    // The root is the whole, and the whole is the plot's background.
    const rows = hierarchyRows([
      { path: "root/a", value: 60 },
      { path: "root/a/aa", value: 30 },
      { path: "root/b", value: 40 },
    ]);

    expect(hierarchyLeaves(rows).map((row) => row.path)).toEqual([
      "root/a/aa",
      "root/b",
    ]);
  });
});

describe("the graph a flow holds", () => {
  it("keeps the links that name a node the graph holds", () => {
    const graph = flowGraph(
      [{ id: "s" }, { id: "t" }],
      [
        { source: "s", target: "t", value: 10 },
        { source: "s", target: "nowhere", value: 5 },
      ],
    );

    expect(graph.links.length).toBe(1);
    expect(graph.links[0]?.value).toBe(10);
  });

  it("drops a link whose value is not a positive number", () => {
    // A flow of nothing has no thickness, and the compiler's own rule is
    // that a graph must hold at least one positive link.
    const graph = flowGraph(
      [{ id: "s" }, { id: "t" }],
      [
        { source: "s", target: "t", value: 0 },
        { source: "s", target: "t", value: -5 },
        { source: "s", target: "t", value: Number.NaN },
      ],
    );

    expect(graph.links).toEqual([]);
  });
});
