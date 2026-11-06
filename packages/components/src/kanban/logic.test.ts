import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  columnAt,
  columnCards,
  directionOf,
  dropIndexFromCentres,
  keyboardMove,
  moveCardInOrder,
  placementIndex,
  resolveOrder,
  type KanbanCard,
  type KanbanColumn,
} from "./logic.js";

const columns: ReadonlyArray<KanbanColumn> = [
  { id: "todo", title: "To do" },
  { id: "doing", title: "Doing" },
  { id: "done", title: "Done" },
];

const cards: ReadonlyArray<KanbanCard> = [
  { id: "a", column: "todo", title: "A" },
  { id: "b", column: "todo", title: "B" },
  { id: "c", column: "doing", title: "C" },
  { id: "d", column: "done", title: "D" },
];

const order = [
  { id: "a", column: "todo" },
  { id: "b", column: "todo" },
  { id: "c", column: "doing" },
  { id: "d", column: "done" },
] as const;

describe("resolveOrder", () => {
  it("derives the arrangement from the cards when nothing is stored", () => {
    expect(resolveOrder(cards, columns)).toEqual(order);
  });

  it("keeps a stored arrangement and its own column", () => {
    expect(
      resolveOrder(cards, columns, [
        { id: "d", column: "todo" },
        { id: "a", column: "todo" },
        { id: "b", column: "doing" },
        { id: "c", column: "done" },
      ]),
    ).toEqual([
      { id: "d", column: "todo" },
      { id: "a", column: "todo" },
      { id: "b", column: "doing" },
      { id: "c", column: "done" },
    ]);
  });

  it("appends a card the stored order has never seen", () => {
    const added = [...cards, { id: "e", column: "doing", title: "E" }];
    expect(
      resolveOrder(added, columns, [
        { id: "a", column: "todo" },
        { id: "b", column: "todo" },
        { id: "c", column: "doing" },
        { id: "d", column: "done" },
      ]),
    ).toEqual([...order, { id: "e", column: "doing" }]);
  });

  it("drops an entry naming a card or column this render does not carry", () => {
    expect(
      resolveOrder(cards, columns, [
        { id: "gone", column: "todo" },
        { id: "a", column: "archived" },
        { id: "b", column: "todo" },
        { id: "c", column: "doing" },
        { id: "d", column: "done" },
      ]),
    ).toEqual([
      { id: "b", column: "todo" },
      { id: "c", column: "doing" },
      { id: "d", column: "done" },
      { id: "a", column: "todo" },
    ]);
  });

  it("places a card whose column is unknown in the first column", () => {
    expect(
      resolveOrder([{ id: "x", column: "lost", title: "X" }], columns),
    ).toEqual([{ id: "x", column: "todo" }]);
  });
});

describe("moveCardInOrder", () => {
  it("inserts before the card at the named index", () => {
    expect(moveCardInOrder(order, "a", "doing", 0)).toEqual([
      { id: "b", column: "todo" },
      { id: "a", column: "doing" },
      { id: "c", column: "doing" },
      { id: "d", column: "done" },
    ]);
  });

  it("counts the index without the moving card", () => {
    expect(moveCardInOrder(order, "a", "todo", 1)).toEqual([
      { id: "b", column: "todo" },
      { id: "a", column: "todo" },
      { id: "c", column: "doing" },
      { id: "d", column: "done" },
    ]);
  });

  it("appends past the end of the destination column", () => {
    expect(moveCardInOrder(order, "a", "done", 99)).toEqual([
      { id: "b", column: "todo" },
      { id: "c", column: "doing" },
      { id: "d", column: "done" },
      { id: "a", column: "done" },
    ]);
  });

  it("leaves the order alone for a card it does not hold", () => {
    expect(moveCardInOrder(order, "gone", "done", 0)).toBe(order);
  });

  it("leaves the column count whole when a card moves", () => {
    const moved = moveCardInOrder(order, "c", "todo", 0);
    expect(columnCards(moved, "doing")).toEqual([]);
    expect(columnCards(moved, "todo")).toEqual(["c", "a", "b"]);
  });
});

describe("keyboardMove", () => {
  it("reorders up and down inside a column", () => {
    expect(keyboardMove(order, columns, "b", "up")).toEqual(
      Option.some({ id: "b", from: "todo", to: "todo", index: 0 }),
    );
    expect(keyboardMove(order, columns, "a", "down")).toEqual(
      Option.some({ id: "a", from: "todo", to: "todo", index: 1 }),
    );
  });

  it("stops at the ends of a column instead of wrapping", () => {
    expect(keyboardMove(order, columns, "a", "up")).toEqual(Option.none());
    expect(keyboardMove(order, columns, "b", "down")).toEqual(Option.none());
  });

  it("moves into the neighbouring column at the same index", () => {
    expect(keyboardMove(order, columns, "a", "right")).toEqual(
      Option.some({ id: "a", from: "todo", to: "doing", index: 0 }),
    );
    expect(keyboardMove(order, columns, "c", "left")).toEqual(
      Option.some({ id: "c", from: "doing", to: "todo", index: 0 }),
    );
  });

  it("stops at the first and last column", () => {
    expect(keyboardMove(order, columns, "a", "left")).toEqual(Option.none());
    expect(keyboardMove(order, columns, "d", "right")).toEqual(Option.none());
  });

  it("clamps the index to the cards the destination holds", () => {
    expect(keyboardMove(order, columns, "b", "right")).toEqual(
      Option.some({ id: "b", from: "todo", to: "doing", index: 1 }),
    );
    expect(keyboardMove(order, columns, "d", "left")).toEqual(
      Option.some({ id: "d", from: "done", to: "doing", index: 0 }),
    );
  });
});

describe("the pointer's geometry", () => {
  it("names the slot above the first centre and below the last", () => {
    expect(dropIndexFromCentres([10, 40, 70], 0)).toBe(0);
    expect(dropIndexFromCentres([10, 40, 70], 40)).toBe(1);
    expect(dropIndexFromCentres([10, 40, 70], 99)).toBe(3);
    expect(dropIndexFromCentres([], 20)).toBe(0);
  });

  it("names the column the pointer is over", () => {
    const boxes = [
      { id: "todo", left: 0, right: 100 },
      { id: "doing", left: 120, right: 220 },
    ];
    expect(columnAt(30, boxes)).toEqual(Option.some("todo"));
    expect(columnAt(130, boxes)).toEqual(Option.some("doing"));
  });

  it("names the nearest column in the gap and none without boxes", () => {
    const boxes = [
      { id: "todo", left: 0, right: 100 },
      { id: "doing", left: 200, right: 300 },
    ];
    expect(columnAt(120, boxes)).toEqual(Option.some("todo"));
    expect(columnAt(190, boxes)).toEqual(Option.some("doing"));
    expect(columnAt(400, boxes)).toEqual(Option.some("doing"));
    expect(columnAt(0, [])).toEqual(Option.none());
  });
});

describe("directionOf", () => {
  it("reads the four arrows and nothing else", () => {
    expect(directionOf("up")).toEqual(Option.some("up"));
    expect(directionOf("right")).toEqual(Option.some("right"));
    expect(directionOf("enter")).toEqual(Option.none());
    expect(directionOf(undefined)).toEqual(Option.none());
  });
});

describe("placementIndex", () => {
  it("reads a card's place in the flat order", () => {
    expect(placementIndex(order, "c")).toEqual(Option.some(2));
    expect(placementIndex(order, "gone")).toEqual(Option.none());
  });
});
