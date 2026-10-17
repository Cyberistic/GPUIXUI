/**
 * Collection index arithmetic.
 *
 * The bugs these guard: arrow keys over a list with a disabled row stopped dead
 * instead of skipping to the next enabled row; moving up from the first row did
 * not wrap to the last; and a row removed from the middle left the registry in
 * declaration order only by luck, so Tab could land on a stale index.
 */

import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import {
  createCollection,
  enabledIndexes,
  firstEnabled,
  indexOfId,
  insert,
  lastEnabled,
  nextEnabled,
  remove,
  upsertValue,
  type CollectionItem,
} from "./collection.js";

const row = (id: number, disabled = false): CollectionItem => ({
  id,
  disabled,
});
const rows = (
  ids: ReadonlyArray<number>,
  disabled: ReadonlyArray<number> = [],
) => ids.map((id) => row(id, disabled.includes(id)));

describe("enabledIndexes", () => {
  it("keeps declaration order and drops disabled rows", () => {
    expect(enabledIndexes(rows([10, 20, 30, 40], [20, 30]))).toEqual([0, 3]);
  });

  it("is empty when every row is disabled", () => {
    expect(enabledIndexes(rows([1, 2], [1, 2]))).toEqual([]);
  });
});

describe("firstEnabled / lastEnabled", () => {
  it("skips disabled rows at both edges", () => {
    const items = rows([1, 2, 3, 4], [1, 4]);
    expect(firstEnabled(items)).toEqual(Option.some(1));
    expect(lastEnabled(items)).toEqual(Option.some(2));
  });

  it("is None when nothing accepts input", () => {
    expect(firstEnabled(rows([1], [1]))).toEqual(Option.none());
    expect(lastEnabled([])).toEqual(Option.none());
  });
});

describe("nextEnabled", () => {
  const four = rows([1, 2, 3, 4]);

  it("starts at the first enabled row going down and the last going up", () => {
    expect(nextEnabled(four, Option.none(), 1)).toEqual(Option.some(0));
    expect(nextEnabled(four, Option.none(), -1)).toEqual(Option.some(3));
  });

  it("wraps at both ends", () => {
    expect(nextEnabled(four, Option.some(3), 1)).toEqual(Option.some(0));
    expect(nextEnabled(four, Option.some(0), -1)).toEqual(Option.some(3));
  });

  it("skips a disabled row in the direction of travel", () => {
    const items = rows([1, 2, 3], [2]);
    expect(nextEnabled(items, Option.some(0), 1)).toEqual(Option.some(2));
    expect(nextEnabled(items, Option.some(2), -1)).toEqual(Option.some(0));
  });

  it("wraps past a disabled row at the end", () => {
    const items = rows([1, 2, 3], [3]);
    expect(nextEnabled(items, Option.some(1), 1)).toEqual(Option.some(0));
  });

  it("continues in the direction of travel from a disabled row", () => {
    const items = rows([1, 2, 3, 4], [3]);
    expect(nextEnabled(items, Option.some(2), 1)).toEqual(Option.some(3));
    expect(nextEnabled(items, Option.some(2), -1)).toEqual(Option.some(1));
  });

  it("is None when every row is disabled", () => {
    expect(nextEnabled(rows([1, 2], [1, 2]), Option.some(0), 1)).toEqual(
      Option.none(),
    );
  });

  it("stays on the only enabled row", () => {
    const items = rows([1, 2, 3], [2, 3]);
    expect(nextEnabled(items, Option.some(0), 1)).toEqual(Option.some(0));
    expect(nextEnabled(items, Option.some(0), -1)).toEqual(Option.some(0));
  });
});

describe("indexOfId", () => {
  it("finds a row by id and reports absence", () => {
    expect(indexOfId(rows([7, 8]), 8)).toEqual(Option.some(1));
    expect(indexOfId(rows([7, 8]), 9)).toEqual(Option.none());
  });
});

describe("insert / remove", () => {
  it("appends in order", () => {
    expect(insert(insert([], row(1)), row(2)).map((item) => item.id)).toEqual([
      1, 2,
    ]);
  });

  it("replaces an existing id without moving it", () => {
    const withThree = insert(insert(insert([], row(1)), row(2)), row(3));
    const replaced = insert(withThree, row(2, true));
    expect(replaced.map((item) => [item.id, item.disabled])).toEqual([
      [1, false],
      [2, true],
      [3, false],
    ]);
  });

  it("removes only the named id", () => {
    const items = insert(insert(insert([], row(1)), row(2)), row(3));
    expect(remove(items, 2).map((item) => item.id)).toEqual([1, 3]);
  });
});

describe("createCollection", () => {
  it("keeps declaration order across registrations", () => {
    const collection = createCollection();
    collection.register(row(10));
    collection.register(row(20));
    collection.register(row(30));
    expect(collection.items().map((item) => item.id)).toEqual([10, 20, 30]);
  });

  it("forgets a row when its unregister runs", () => {
    const collection = createCollection();
    const unregister = collection.register(row(10));
    collection.register(row(20));
    unregister();
    expect(collection.items().map((item) => item.id)).toEqual([20]);
  });

  it("feeds nextEnabled from the registry", () => {
    const collection = createCollection();
    collection.register(row(10));
    collection.register(row(20, true));
    collection.register(row(30));
    expect(nextEnabled(collection.items(), Option.some(0), 1)).toEqual(
      Option.some(2),
    );
  });
});

describe("upsertValue", () => {
  const valued = (value: string, id: number, disabled = false) => ({
    value,
    id,
    disabled,
  });

  it("appends a new value at the end", () => {
    const items = upsertValue(
      upsertValue([], valued("first", 10)),
      valued("second", 20),
    );

    expect(items.map((item) => item.value)).toEqual(["first", "second"]);
  });

  it("replaces an existing value in place", () => {
    const items = upsertValue(
      upsertValue(upsertValue([], valued("first", 10)), valued("second", 20)),
      valued("first", 11),
    );

    expect(items).toEqual([
      { value: "first", id: 11, disabled: false },
      { value: "second", id: 20, disabled: false },
    ]);
  });

  it("keeps the length and the order on a re-register", () => {
    const items = upsertValue(
      upsertValue([], valued("only", 10)),
      valued("only", 10),
    );

    expect(items.map((item) => item.value)).toEqual(["only"]);
  });
});
