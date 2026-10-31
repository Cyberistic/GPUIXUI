/**
 * The board's rules. The bugs these guard: a drop resolved to a column the
 * pointer was not over (or to one when it was over none), and a move that lost
 * the card, duplicated it, or changed the board when it went nowhere.
 */
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { board } from "./data.js";
import { columnAt, moveTask } from "./logic.js";

describe("columnAt", () => {
  const bounds = {
    Backlog: { x: 0, width: 100 },
    "In progress": { x: 110, width: 100 },
  };

  it("finds the column under the point, and none in a gap or past the edge", () => {
    expect(columnAt(bounds, 150)).toEqual(Option.some("In progress"));
    expect(columnAt(bounds, 105)).toEqual(Option.none());
    expect(columnAt(bounds, 400)).toEqual(Option.none());
  });
});

describe("moveTask", () => {
  it("moves the card to the end of the target and nowhere else", () => {
    const moved = moveTask(board, "theme", "In progress", "Done");
    expect(moved.Done.map((t) => t.id)).toEqual(["switch", "slider", "theme"]);
    expect(moved["In progress"].map((t) => t.id)).toEqual(["terminal", "film"]);
  });

  it("leaves the board alone for a drop on its own column or an unknown card", () => {
    expect(moveTask(board, "theme", "In progress", "In progress")).toBe(board);
    expect(moveTask(board, "nobody", "Backlog", "Done")).toBe(board);
  });
});
