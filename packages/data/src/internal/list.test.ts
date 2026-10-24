/**
 * The readers a stored list crosses before a surface paints it.
 *
 * The bug these guard: a list a store hands back is data at **two** levels —
 * the slot can be absent (`null` where JSON never wrote a value), and an entry
 * inside it can be the hole a store wrote or a value of another kind. `listOf`
 * reads the slot; `recordsOf` and `textsOf` read the entries. A part that only
 * guarded the slot still dereferenced `null` (`Cannot read properties of null
 * (reading 'values')`), and a text list that filtered a hole away moved every
 * later entry under the wrong label.
 */

import { describe, expect, it } from "vitest";
import { listOf, recordsOf, textsOf } from "./list.js";

describe("a stored list", () => {
  it("is a list only when it is one", () => {
    expect(listOf([3])).toEqual([3]);
    expect(listOf<number>(undefined)).toEqual([]);
    // A slot JSON wrote as `null` is the absence the port names, not a cast.
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
    // The slot is load-bearing: a chart draws one value per label, so
    // filtering the hole would move the second value under the first label.
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
