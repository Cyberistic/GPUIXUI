/**
 * The notification model's rules. Each test can fail: a stored unread count, a
 * reversed order, an empty group header or a constant-height re-anchor all
 * break a named expectation.
 */
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import {
  initialNotifications,
  newNotification,
  rowsOf,
  unreadCount,
} from "./notification-model.js";

const keys = (items: typeof initialNotifications): ReadonlyArray<string> =>
  Arr.map(rowsOf(items), (row) => row.key);

describe("notification model", () => {
  it("seeds six notifications with three unread", () => {
    expect(initialNotifications).toHaveLength(6);
    expect(unreadCount(initialNotifications)).toBe(3);
  });

  it("flattens Today then Earlier, newest first, with one header each", () => {
    expect(keys(initialNotifications)).toEqual([
      "h:today",
      "n:6",
      "n:5",
      "n:4",
      "h:earlier",
      "n:3",
      "n:2",
      "n:1",
    ]);
  });

  it("drops a group header when the group is empty", () => {
    const todayOnly = Arr.filter(
      initialNotifications,
      (item) => item.group === "today",
    );
    expect(keys(todayOnly)).toEqual(["h:today", "n:6", "n:5", "n:4"]);
  });

  it("derives the unread count from the read flags", () => {
    const readAll = Arr.map(initialNotifications, (item) => ({
      ...item,
      read: true,
    }));
    expect(unreadCount(readAll)).toBe(0);
    expect(
      unreadCount(Arr.map(initialNotifications, (item) => ({ ...item, read: false }))),
    ).toBe(6);
  });

  it("prepends an arrival inside Today, above the older items", () => {
    const withArrival = Arr.prepend(
      initialNotifications,
      newNotification(7),
    );
    expect(keys(withArrival).slice(0, 4)).toEqual(["h:today", "n:7", "n:6", "n:5"]);
    expect(unreadCount(withArrival)).toBe(4);
  });

});
