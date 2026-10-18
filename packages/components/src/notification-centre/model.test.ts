/**
 * The notification centre's pure rules.
 *
 * These guard the read contract (a count derived from flags, one toggle never
 * doubled), the contiguous grouping rule (a repeated label in a later run gets
 * its own heading, and an ungrouped item gets none), and the fact that the
 * caller's order is the paint order.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  flattenRows,
  readAll,
  readItem,
  unreadCount,
  type NotificationItem,
  type NotificationRow,
} from "./model.js";

const items: ReadonlyArray<NotificationItem> = [
  { id: "a", title: "Deploy finished", group: "Today" },
  { id: "b", title: "Review requested", group: "Today", read: true },
  { id: "c", title: "Nightly failed", group: "Today" },
  { id: "d", title: "Invite accepted", group: "Earlier", read: true },
  { id: "e", title: "Token expires soon", group: "Earlier" },
  { id: "f", title: "Build queued", group: "Earlier", read: true },
];

/** A row as one readable token, so a grouping mistake names itself. */
const token = (row: NotificationRow): string =>
  row.kind === "header" ? `H:${row.label}` : `I:${row.item.id}`;

describe("notification model", () => {
  it("derives the unread count from the read flags", () => {
    expect(unreadCount(items)).toBe(3);
    expect(unreadCount(readItem(items, "a"))).toBe(2);
    expect(unreadCount(readAll(items))).toBe(0);
  });

  it("puts one heading before each contiguous group and keeps the caller's order", () => {
    expect(Arr.map(flattenRows(items), token)).toEqual([
      "H:Today",
      "I:a",
      "I:b",
      "I:c",
      "H:Earlier",
      "I:d",
      "I:e",
      "I:f",
    ]);
  });

  it("emits no heading for an ungrouped run or an empty list", () => {
    const ungrouped: ReadonlyArray<NotificationItem> = [
      { id: "x", title: "One", read: true },
      { id: "y", title: "Two" },
    ];

    expect(Arr.map(flattenRows(ungrouped), token)).toEqual(["I:x", "I:y"]);
    expect(flattenRows([])).toEqual([]);
  });

  it("marks one item read and leaves a repeated read unchanged", () => {
    const once = readItem(items, "a");
    expect(
      Option.exists(
        Arr.findFirst(once, (item) => item.id === "a"),
        (item) => item.read === true,
      ),
    ).toBe(true);
    expect(unreadCount(once)).toBe(2);

    expect(readItem(once, "a")).toEqual(once);
  });

  it("marks every item read without changing the order", () => {
    const read = readAll(items);

    expect(Arr.map(read, (item) => item.id)).toEqual([
      "a",
      "b",
      "c",
      "d",
      "e",
      "f",
    ]);
    expect(Arr.every(read, (item) => item.read === true)).toBe(true);
  });
});
