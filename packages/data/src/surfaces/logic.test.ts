/**
 * The predicate tree an advanced filter composes.
 *
 * The bugs these guard:
 *
 * - a comparison that reads the wrong side (a `contains` that matched the
 *   clause's value instead of the field's);
 * - a numeric comparison that compared text lexicographically, so `9` was
 *   "greater than" `10`;
 * - a `not` that negated the whole tree instead of its own child;
 * - an edit that rebuilt the tree around a nested clause and lost the clauses
 *   the reader did not touch;
 * - a removal that removed the wrong sibling;
 * - an empty builder that matched nothing instead of everything;
 * - an order that read a blank side as zero, so an unfilled clause kept every
 *   positive row;
 * - an append that could only reach the root, so a nested `any` could never
 *   gain a clause from the builder.
 */

import { Match } from "effect";
import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import {
  appendAt,
  appendClause,
  clauseAt,
  clauseCount,
  comparisons,
  describeTree,
  emptyTree,
  filterByTree,
  isAll,
  isAny,
  isNot,
  isPredicate,
  matchesComparison,
  matchesTree,
  removeAt,
  updateAt,
  updatePredicate,
  type FieldPredicate,
  type FilterPath,
  type FilterTree,
} from "./logic.js";

interface Row {
  readonly name: string;
  readonly size: number;
  readonly status: string;
}

const rows: ReadonlyArray<Row> = [
  { name: "readme.md", size: 120, status: "tracked" },
  { name: "main.ts", size: 2048, status: "tracked" },
  { name: "notes.txt", size: 90, status: "ignored" },
];

/** A row's field, read the way the tree's caller reads it. */
const valueOf = (row: Row, field: string): string | number =>
  Match.value(field).pipe(
    Match.when("name", () => row.name),
    Match.when("size", () => row.size),
    Match.when("status", () => row.status),
    Match.orElse(() => ""),
  );

/**
 * The clause a path names, or a sentinel that no assertion can match.
 *
 * The sentinel is a clause that names no field, so a path that finds nothing
 * fails the assertion instead of throwing inside the test.
 */
const clauseOf = (tree: FilterTree, path: FilterPath): FieldPredicate =>
  Option.getOrElse(clauseAt(tree, path), () => ({
    kind: "predicate",
    field: "",
    comparison: "equals",
    value: "",
  }));

const clause = (
  field: string,
  comparison: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan",
  value: string,
): FieldPredicate => ({ kind: "predicate", field, comparison, value });

describe("the comparisons", () => {
  it("compares a field with a clause's value", () => {
    expect(matchesComparison("equals", "tracked", "tracked")).toBe(true);
    expect(matchesComparison("equals", "tracked", "untracked")).toBe(false);
    expect(matchesComparison("notEquals", "tracked", "ignored")).toBe(true);
    expect(matchesComparison("notEquals", "tracked", "tracked")).toBe(false);
  });

  it("reads a contains as the field holding the clause's text", () => {
    expect(matchesComparison("contains", "readme.md", "readme")).toBe(true);
    expect(matchesComparison("contains", "readme.md", "README")).toBe(true);
    expect(matchesComparison("contains", "readme.md", "main")).toBe(false);
  });

  it("reads an order as numbers, not as text", () => {
    expect(matchesComparison("greaterThan", 9, "10")).toBe(false);
    expect(matchesComparison("greaterThan", 10, "9")).toBe(true);
    expect(matchesComparison("lessThan", 90, "120")).toBe(true);
    expect(matchesComparison("greaterThan", 2048, "1024")).toBe(true);
  });

  it("never satisfies an order with a value that is not a number", () => {
    expect(matchesComparison("greaterThan", "wide", "10")).toBe(false);
    expect(matchesComparison("lessThan", "wide", "10")).toBe(false);
  });

  it("reads a blank side as no number, so an unfilled clause keeps nothing", () => {
    // The builder appends a clause with `value: ""`; a reader can switch its
    // comparison before typing, and `Number("")` is 0 — so the order used to
    // keep every row with a value above (or below) zero.
    expect(matchesComparison("greaterThan", 5, "")).toBe(false);
    expect(matchesComparison("lessThan", -5, "")).toBe(false);
    // A row with no value is not zero either.
    expect(matchesComparison("greaterThan", "", "-1")).toBe(false);
    expect(matchesComparison("lessThan", "", "10")).toBe(false);
    expect(matchesComparison("greaterThan", " ", "0")).toBe(false);
    // A number that is not a number satisfies no order either.
    expect(matchesComparison("greaterThan", Number.NaN, "0")).toBe(false);
  });

  it("lists the comparisons a builder offers", () => {
    expect(comparisons).toEqual([
      "equals",
      "notEquals",
      "contains",
      "greaterThan",
      "lessThan",
    ]);
  });
});

describe("the tree", () => {
  it("keeps the rows every clause matches", () => {
    const tree: FilterTree = {
      kind: "all",
      children: [
        clause("status", "equals", "tracked"),
        clause("size", "greaterThan", "1024"),
      ],
    };

    expect(filterByTree(rows, tree, valueOf).map((row) => row.name)).toEqual([
      "main.ts",
    ]);
  });

  it("keeps no row while a clause's value is not typed yet", () => {
    const tree = appendClause(emptyTree, clause("size", "greaterThan", ""));

    expect(filterByTree(rows, tree, valueOf)).toEqual([]);
    // A field the row does not carry reads as blank, not as zero.
    expect(
      filterByTree(rows, clause("missing", "lessThan", "10"), valueOf),
    ).toEqual([]);
  });

  it("keeps a row any one clause matches", () => {
    const tree: FilterTree = {
      kind: "any",
      children: [
        clause("status", "equals", "ignored"),
        clause("size", "greaterThan", "1024"),
      ],
    };

    expect(filterByTree(rows, tree, valueOf).map((row) => row.name)).toEqual([
      "main.ts",
      "notes.txt",
    ]);
  });

  it("negates its own child, not the whole tree", () => {
    const tree: FilterTree = {
      kind: "all",
      children: [
        clause("status", "equals", "tracked"),
        { kind: "not", child: clause("size", "greaterThan", "1024") },
      ],
    };

    expect(filterByTree(rows, tree, valueOf).map((row) => row.name)).toEqual([
      "readme.md",
    ]);
    // The negated clause alone keeps the row the whole tree drops.
    expect(
      matchesTree(
        { kind: "not", child: clause("size", "greaterThan", "1024") },
        rows[0] ?? { name: "", size: 0, status: "" },
        valueOf,
      ),
    ).toBe(true);
  });

  it("matches everything when it is empty", () => {
    expect(filterByTree(rows, emptyTree, valueOf)).toHaveLength(3);
    expect(clauseCount(emptyTree)).toBe(0);
  });

  it("counts the clauses a tree holds", () => {
    const tree: FilterTree = {
      kind: "all",
      children: [
        clause("status", "equals", "tracked"),
        {
          kind: "any",
          children: [
            clause("size", "greaterThan", "1024"),
            { kind: "not", child: clause("name", "contains", "main") },
          ],
        },
      ],
    };

    expect(clauseCount(tree)).toBe(3);
  });

  it("reads the sentence a tree means", () => {
    expect(describeTree(emptyTree)).toBe("everything");
    expect(describeTree(clause("status", "equals", "tracked"))).toBe(
      "status equals tracked",
    );
    expect(
      describeTree({
        kind: "all",
        children: [clause("status", "equals", "tracked")],
      }),
    ).toBe("all of (status equals tracked)");
    expect(
      describeTree({ kind: "not", child: clause("name", "contains", "main") }),
    ).toBe("not (name contains main)");
  });

  it("reads an empty any group as nothing, because that is what it keeps", () => {
    const emptyAny: FilterTree = { kind: "any", children: [] };

    // An `all` of no clause has nothing to fail, so it keeps every row; an
    // `any` of no alternative has nothing to satisfy, so it keeps none. The
    // sentence a builder shows has to agree with the rows it paints.
    expect(filterByTree(rows, emptyAny, valueOf)).toHaveLength(0);
    expect(filterByTree(rows, emptyTree, valueOf)).toHaveLength(3);
    expect(describeTree(emptyAny)).toBe("nothing");
    expect(describeTree(emptyTree)).toBe("everything");
  });

  it("names its own shape", () => {
    expect(isPredicate(clause("status", "equals", "tracked"))).toBe(true);
    expect(isAll({ kind: "all", children: [] })).toBe(true);
    expect(isAny({ kind: "any", children: [] })).toBe(true);
    expect(
      isNot({ kind: "not", child: clause("status", "equals", "tracked") }),
    ).toBe(true);
    expect(isAll(emptyTree)).toBe(true);
    expect(isPredicate(emptyTree)).toBe(false);
  });
});

describe("editing a tree", () => {
  it("changes one clause and keeps the others", () => {
    const tree: FilterTree = {
      kind: "all",
      children: [
        clause("status", "equals", "tracked"),
        clause("size", "greaterThan", "1024"),
      ],
    };

    const next = updateAt(tree, [1], clause("size", "lessThan", "1024"));

    expect(next).not.toBe(tree);
    expect(clauseCount(next)).toBe(2);
    expect(clauseOf(next, [0])).toMatchObject({
      field: "status",
      value: "tracked",
    });
    expect(clauseOf(next, [1])).toMatchObject({
      comparison: "lessThan",
      value: "1024",
    });
  });

  it("changes a nested clause without rebuilding the tree around it", () => {
    const tree: FilterTree = {
      kind: "all",
      children: [
        clause("status", "equals", "tracked"),
        {
          kind: "not",
          child: clause("name", "contains", "main"),
        },
      ],
    };

    const next = updateAt(tree, [1, 0], clause("name", "contains", "notes"));

    expect(clauseOf(next, [1, 0])).toMatchObject({
      value: "notes",
    });
    expect(clauseOf(next, [0])).toMatchObject({
      value: "tracked",
    });
  });

  it("finds the clause a path names, and no clause for a group", () => {
    const tree: FilterTree = {
      kind: "all",
      children: [
        clause("status", "equals", "tracked"),
        { kind: "not", child: clause("name", "contains", "main") },
      ],
    };

    expect(clauseOf(tree, [0])).toMatchObject({
      field: "status",
    });
    expect(clauseOf(tree, [1, 0])).toMatchObject({
      field: "name",
    });
    expect(Option.isNone(clauseAt(tree, [1]))).toBe(true);
    expect(Option.isNone(clauseAt(tree, [9]))).toBe(true);
  });

  it("removes the clause a path names and keeps the rest", () => {
    const tree: FilterTree = {
      kind: "all",
      children: [
        clause("status", "equals", "tracked"),
        clause("size", "greaterThan", "1024"),
      ],
    };

    const next = removeAt(tree, [0]);

    expect(clauseCount(next)).toBe(1);
    expect(clauseOf(next, [0])).toMatchObject({
      field: "size",
    });
  });

  it("keeps a group that loses its last child, so an empty builder matches everything", () => {
    const tree: FilterTree = {
      kind: "all",
      children: [clause("status", "equals", "tracked")],
    };

    const next = removeAt(tree, [0]);

    expect(isAll(next)).toBe(true);
    expect(clauseCount(next)).toBe(0);
    expect(filterByTree(rows, next, valueOf)).toHaveLength(3);
  });

  it("leaves a not's own child alone, because a not cannot be empty", () => {
    const tree: FilterTree = {
      kind: "all",
      children: [
        clause("status", "equals", "tracked"),
        { kind: "not", child: clause("name", "contains", "main") },
      ],
    };

    const next = removeAt(tree, [1, 0]);

    expect(next).toEqual(tree);
    expect(clauseCount(next)).toBe(2);
  });

  it("edits a group a not negates, because it is a group like any other", () => {
    // The builder paints Remove and Add on a group's clauses wherever that
    // group sits — including inside a `not` — so both paths must descend
    // through the `not` to its child at index `0`. Refusing at the `not` left
    // every press on those controls changing nothing.
    const tree: FilterTree = {
      kind: "all",
      children: [
        {
          kind: "not",
          child: {
            kind: "any",
            children: [
              clause("name", "contains", "alpha"),
              clause("size", "greaterThan", "1024"),
            ],
          },
        },
      ],
    };

    const removed = removeAt(tree, [0, 0, 0]);

    expect(clauseCount(removed)).toBe(1);
    expect(clauseOf(removed, [0, 0, 0])).toMatchObject({ field: "size" });

    const added = appendAt(tree, [0, 0], clause("status", "equals", "tracked"));

    expect(clauseCount(added)).toBe(3);
    expect(clauseOf(added, [0, 0, 2])).toMatchObject({ field: "status" });
    // The `not` itself still takes no clause: its one child is not a group.
    expect(appendAt(tree, [0], clause("status", "equals", "tracked"))).toEqual(
      tree,
    );
  });

  it("adds a clause to the group that holds them", () => {
    const tree: FilterTree = {
      kind: "all",
      children: [clause("status", "equals", "tracked")],
    };

    const next = appendClause(tree, clause("size", "greaterThan", "1024"));

    expect(clauseCount(next)).toBe(2);
    expect(clauseOf(next, [1])).toMatchObject({
      field: "size",
    });
  });

  it("turns a lone clause into a group when a second one arrives", () => {
    const tree = clause("status", "equals", "tracked");

    const next = appendClause(tree, clause("size", "greaterThan", "1024"));

    expect(isAll(next)).toBe(true);
    expect(clauseCount(next)).toBe(2);
  });

  it("adds a clause to the nested group a path names, not to the root", () => {
    const tree: FilterTree = {
      kind: "all",
      children: [
        clause("status", "equals", "tracked"),
        {
          kind: "any",
          children: [clause("name", "contains", "readme")],
        },
      ],
    };

    const next = appendAt(tree, [1], clause("size", "greaterThan", "1024"));

    // The root still holds its two children; the clause joined the `any`.
    expect(isAll(next)).toBe(true);
    expect(clauseCount(next)).toBe(3);
    expect(clauseOf(next, [0])).toMatchObject({ field: "status" });
    expect(clauseOf(next, [1, 1])).toMatchObject({
      field: "size",
      comparison: "greaterThan",
    });
    expect(Option.isNone(clauseAt(next, [2]))).toBe(true);
  });

  it("adds to the root when the path is empty, the rule the root Add follows", () => {
    const tree: FilterTree = {
      kind: "all",
      children: [clause("status", "equals", "tracked")],
    };

    const next = appendAt(tree, [], clause("size", "lessThan", "1024"));

    expect(clauseCount(next)).toBe(2);
    expect(clauseOf(next, [1])).toMatchObject({ field: "size" });
  });

  it("leaves the tree alone when the path names no group a clause can join", () => {
    const nested: FilterTree = {
      kind: "all",
      children: [
        clause("status", "equals", "tracked"),
        {
          kind: "any",
          children: [clause("name", "contains", "readme")],
        },
        { kind: "not", child: clause("size", "greaterThan", "0") },
      ],
    };

    // A clause is not a group, a `not` holds one child, and an index past the
    // children names nothing: Add is only painted where the append lands.
    expect(appendAt(nested, [0], clause("size", "lessThan", "1"))).toEqual(
      nested,
    );
    expect(appendAt(nested, [2], clause("size", "lessThan", "1"))).toEqual(
      nested,
    );
    expect(appendAt(nested, [9], clause("size", "lessThan", "1"))).toEqual(
      nested,
    );
  });

  it("changes a predicate's field, comparison or value in place", () => {
    const tree = clause("status", "equals", "tracked");

    expect(updatePredicate(tree, { value: "ignored" })).toMatchObject({
      value: "ignored",
      field: "status",
      comparison: "equals",
    });
    expect(updatePredicate(tree, { comparison: "contains" })).toMatchObject({
      comparison: "contains",
    });
    expect(updatePredicate(tree, { field: "size" })).toMatchObject({
      field: "size",
    });
  });

  it("changes every clause of a group when it is asked to", () => {
    const tree: FilterTree = {
      kind: "all",
      children: [
        clause("status", "equals", "tracked"),
        clause("status", "equals", "ignored"),
      ],
    };

    const next = updatePredicate(tree, { comparison: "contains" });

    expect(clauseOf(next, [0]).comparison).toBe("contains");
    expect(clauseOf(next, [1]).comparison).toBe("contains");
    // The two clauses now contradict each other, so the group keeps nothing:
    // a row cannot both contain "tracked" and contain "ignored".
    expect(filterByTree(rows, next, valueOf)).toEqual([]);
  });
});
