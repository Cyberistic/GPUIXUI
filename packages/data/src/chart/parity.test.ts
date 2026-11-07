import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import { parity, type ParityEntry } from "./parity.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const source = [
  read("./chart.tsx"),
  read("./legend.tsx"),
  read("./structure.tsx"),
].join("\n");
const page = read("../../docs/charts/charts.mdx");
const demo = read("../../../../apps/docs/src/components/docs/charts-demo.tsx");

const exported = new Set(
  Arr.flatMap([...source.matchAll(/^export const (\w+)/gm)], (match) =>
    match[1] === undefined ? [] : [match[1]],
  ),
);

const rows = (status: ParityEntry["status"]): ReadonlyArray<ParityEntry> =>
  Arr.filter(parity, (row) => row.status === status);

describe("the reference parity map", () => {
  it("names every example the reference set plays, one row each", () => {
    expect(parity.length).toBeGreaterThanOrEqual(60);
    expect(new Set(Arr.map(parity, (row) => row.example)).size).toBe(
      parity.length,
    );
  });

  it("answers each example with a chart the package exports", () => {
    expect(Arr.filter(parity, (row) => !exported.has(row.native))).toEqual([]);
  });

  it("names only options the page documents", () => {
    expect(
      Arr.map(
        Arr.filter(parity, (row) => !page.includes(`\`${row.option}\``)),
        (row) => `${row.example}: ${row.option}`,
      ),
    ).toEqual([]);
  });

  it("names only preview modes the site serves", () => {
    expect(
      Arr.filter(parity, (row) => !demo.includes(`"${row.mode}"`)),
    ).toEqual([]);
  });

  it("answers every example with a native chart", () => {
    expect(Arr.filter(parity, (row) => row.status !== "native")).toEqual([]);
  });

  it("gives every unsupported row its reason", () => {
    expect(
      Arr.filter(
        rows("unsupported"),
        (row) => row.note === undefined || row.note.trim().length === 0,
      ),
    ).toEqual([]);
  });

  it("covers every reference chart part the package ships", () => {
    const parts = [
      "AreaChart",
      "BarChart",
      "ComposedChart",
      "DonutChart",
      "LineChart",
      "PieChart",
      "RadarChart",
      "RadialChart",
      "StackedBar",
      "ChartLegend",
    ];
    const answered = new Set(Arr.map(parity, (row) => row.native));
    expect(Arr.filter(parts, (part) => !answered.has(part))).toEqual([]);
  });
});
