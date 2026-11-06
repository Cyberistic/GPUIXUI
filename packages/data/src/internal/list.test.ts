import { describe, expect, it } from "vitest";
import { listOf, recordsOf, rowsOf, textsOf } from "./list.js";

describe("a stored list", () => {
  it("is a list only when it is one", () => {
    expect(listOf([3])).toEqual([3]);
    expect(listOf<number>(undefined)).toEqual([]);

    expect(listOf<number>(null)).toEqual([]);
    // @ts-expect-error — a slot a store wrote as something else.
    expect(listOf<number>(42)).toEqual([]);
  });

  it("keeps only the entries that are records naming themselves", () => {
    const rows: ReadonlyArray<{ readonly key: string }> = [
      { key: "a" },
      // @ts-expect-error — a hole a store wrote inside the list.
      null,
      // @ts-expect-error — an entry a store wrote as something else.
      42,
      // @ts-expect-error — an entry that names no key.
      { label: "no key" },
    ];
    expect(recordsOf(rows)).toEqual([{ key: "a" }]);
    expect(recordsOf<{ readonly key: string }>(undefined)).toEqual([]);
  });

  it("keeps a text entry's slot when the store wrote a hole", () => {
    const labels: ReadonlyArray<string> = [
      "Q1",
      // @ts-expect-error — a label a store wrote as a hole.
      null,
      // @ts-expect-error — a label a store wrote as something else.
      7,
    ];
    expect(textsOf(labels)).toEqual(["Q1", "", ""]);
    expect(textsOf(undefined)).toEqual([]);
  });
});

describe("a saved row list", () => {
  const rowKey = (row: { readonly id: string }): string => row.id;

  it("keeps only the rows its identity reader can name", () => {
    const rows: ReadonlyArray<{ readonly id: string }> = [
      { id: "alpha" },
      // @ts-expect-error — a hole a store wrote inside the list.
      null,
      // @ts-expect-error — an entry a store wrote as something else.
      42,
      // @ts-expect-error — a record the reader cannot name.
      { name: "no id" },
      { id: "" },
      { id: "   " },
      { id: "beta" },
    ];
    expect(rowsOf(rows, rowKey)).toEqual([{ id: "alpha" }, { id: "beta" }]);
  });

  it("reads an absent list as no rows", () => {
    expect(rowsOf<{ readonly id: string }>(undefined, rowKey)).toEqual([]);

    expect(rowsOf<{ readonly id: string }>(null, rowKey)).toEqual([]);
    // @ts-expect-error — a slot a store wrote as something else.
    expect(rowsOf<{ readonly id: string }>(42, rowKey)).toEqual([]);
  });

  it("hands the caller's own rows on unchanged", () => {
    const alpha = { id: "alpha" };
    const beta = { id: "beta" };
    expect(rowsOf([alpha, beta], rowKey)).toEqual([alpha, beta]);
  });
});
