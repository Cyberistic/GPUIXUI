import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Order from "effect/Order";
import {
  VIRTUAL_TABLE,
  VIRTUAL_TABLE_FILTER,
  VIRTUAL_TABLE_FILTERED_ROWS,
  VIRTUAL_TABLE_INITIAL,
  VIRTUAL_TABLE_NAME_SORT,
  VIRTUAL_TABLE_READOUT,
  VIRTUAL_TABLE_REVEAL,
  virtualTableReadout,
  virtualTableRow,
} from "./virtual-table.js";

const example = readFileSync(
  new URL(
    "../../../../packages/data/examples/virtual-table.example.tsx",
    import.meta.url,
  ),
  "utf8",
);
const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);
const probe = readFileSync(new URL("./scenarios.tsx", import.meta.url), "utf8");

const STATUSES = ["tracked", "modified", "untracked"] as const;
const rows = Arr.map(Arr.range(1, 1_000), (n) => ({
  name: `file-${String(n).padStart(4, "0")}.ts`,
  status: STATUSES[n % 3] ?? "tracked",
  size: n * 5,
}));

const textOf = (row: (typeof rows)[number]): string =>
  `${row.name} ${row.status} ${row.size}`;

describe("the virtual-table fixture", () => {
  it("reads the example's count, height and reveal index", () => {
    const count = /VIRTUAL_TABLE_ROWS = ([\d_]+)/.exec(example);
    const height = /VIRTUAL_TABLE_ROW_HEIGHT = (\d+)/.exec(example);
    const reveal = /REVEAL_VIRTUAL_ROW = (\d+)/.exec(example);
    expect(Number(count?.[1]?.replaceAll("_", ""))).toBe(1_000);
    expect(Number(height?.[1])).toBe(36);
    expect(Number(reveal?.[1])).toBe(900);

    expect(Math.floor(320 / 36)).toBe(8);
  });

  it("derives the filtered count from the example's own row text", () => {
    expect(example).toContain("valueOf: (row: VirtualRow) => row.name");
    expect(example).toContain("valueOf: (row: VirtualRow) => row.status");
    expect(example).toContain("valueOf: (row: VirtualRow) => row.size");
    const kept = Arr.filter(rows, (row) =>
      textOf(row).toLowerCase().includes("01"),
    );
    expect(kept.length).toBe(VIRTUAL_TABLE_FILTERED_ROWS);
    expect(Arr.filter(rows, (row) => row.name.includes("01")).length).toBe(119);

    const sorted = Arr.sort(
      Arr.map(kept, (row) => row.name),
      Order.String,
    );
    const at = Arr.findFirstIndex(sorted, (name) => name === "file-0601.ts");
    expect(Option.isSome(at)).toBe(true);
    expect(
      Arr.take(
        Arr.drop(
          sorted,
          Option.getOrElse(at, () => 0),
        ),
        3,
      ),
    ).toEqual(["file-0601.ts", "file-0602.ts", "file-0603.ts"]);
  });

  it("prints the readout the example interpolates", () => {
    expect(example).toContain(
      "`${table.rows.length} rows · ${table.selectedCount} selected · ${Option.match(",
    );
    expect(example).toContain("first=${window.first} last=${window.last}");
    expect(VIRTUAL_TABLE_INITIAL).toBe(
      "1000 rows · 0 selected · first=- last=-",
    );
    expect(
      virtualTableReadout({
        rows: 1_000,
        selected: 1,
        first: Option.some(8),
        last: Option.some(16),
      }),
    ).toBe("1000 rows · 1 selected · first=8 last=16");

    expect(
      virtualTableReadout({
        rows: VIRTUAL_TABLE_FILTERED_ROWS,
        selected: 0,
        first: Option.none(),
        last: Option.none(),
      }),
    ).toBe("127 rows · 0 selected · first=- last=-");
  });

  it("names the parts the example declares", () => {
    Arr.forEach(
      [VIRTUAL_TABLE_READOUT, VIRTUAL_TABLE_REVEAL, VIRTUAL_TABLE_FILTER],
      (id) => {
        expect(`${id}: ${example.includes(`"${id}"`)}`).toBe(`${id}: true`);
      },
    );

    expect(example).toContain('testId="virtual-table"');
    expect(example).toContain('testId="virtual-table-name"');
    expect(VIRTUAL_TABLE_NAME_SORT).toBe("virtual-table-name-sort");
    expect(VIRTUAL_TABLE).toBe("virtual-table");
    expect(example).toContain("testId={`virtual-row-${row.id}`}");
    expect(virtualTableRow(905)).toBe("virtual-row-row-905");
  });

  it("holds the probe to the fixture", () => {
    expect(probe).toContain("virtualTableReadout");
    expect(probe).toContain("virtualTableRow");
    expect(probe).toContain("VIRTUAL_TABLE_FILTERED_ROWS");

    expect(probe).toContain('dataExamples["virtual-table"]');
  });

  it("prints every measured readout in its section", () => {
    const start = readme.indexOf("### `virtual-table-lifecycle`");
    const end = readme.indexOf("\n### ", start + 1);
    const text =
      start === -1
        ? ""
        : readme
            .slice(start, end === -1 ? undefined : end)
            .replace(/\s+/g, " ");
    expect(text).not.toBe("");
    expect(text).toContain(VIRTUAL_TABLE_INITIAL);
    expect(text).toContain("first=0 last=8");
    expect(text).toContain("first=8 last=16");
    expect(text).toContain(`${VIRTUAL_TABLE_FILTERED_ROWS} rows`);
    expect(text).toContain("file-0901.ts");
    expect(text).toContain("row-700");

    expect(text).toContain("nine-row viewport");
    expect(text).toContain("count × rowHeight − viewport");
  });
});
