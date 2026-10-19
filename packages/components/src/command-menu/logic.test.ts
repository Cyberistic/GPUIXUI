/**
 * Command-menu recents.
 *
 * The bugs these guard: a command ran twice moves nowhere but still reports a
 * change; an old copy of a command survives below the new one; the list grows
 * without the cap; a recent command is duplicated instead of moved; an id that
 * no longer exists leaves a heading with no row.
 */

import { describe, expect, it } from "vitest";
import { orderWithRecent, recordRecent, type CommandAction } from "./logic.js";

const action = (id: string, label: string, group = "File"): CommandAction => ({
  id,
  label,
  group,
  perform: () => undefined,
});

const actions: ReadonlyArray<CommandAction> = [
  action("open", "Open file", "Navigation"),
  action("recent", "Open recent", "Navigation"),
  action("save", "Save"),
  action("export", "Export as PDF"),
  action("sidebar", "Toggle sidebar", "View"),
];

const ids = (items: ReadonlyArray<CommandAction>): ReadonlyArray<string> =>
  items.map((item) => item.id);

describe("recordRecent", () => {
  it("puts a run command at the front and removes its older copy", () => {
    expect(recordRecent(["open", "save"], "save", 5)).toEqual(["save", "open"]);
  });

  it("caps the list at the limit", () => {
    expect(recordRecent(["open", "save", "export"], "sidebar", 2)).toEqual([
      "sidebar",
      "open",
    ]);
  });

  it("treats a limit below one as one", () => {
    expect(recordRecent([], "open", 0)).toEqual(["open"]);
  });

  it("keeps every entry when the limit is not a number", () => {
    expect(recordRecent(["save", "export"], "open", Number.NaN)).toEqual([
      "open",
      "save",
      "export",
    ]);
  });

  it("does not report a change when the command is already first", () => {
    const recent = ["open", "save"];
    expect(recordRecent(recent, "open", 5)).toBe(recent);
  });
});

describe("orderWithRecent", () => {
  it("puts recent rows first and regroups them", () => {
    const ordered = orderWithRecent(actions, ["save", "sidebar"], "Recent");
    expect(ids(ordered)).toEqual([
      "save",
      "sidebar",
      "open",
      "recent",
      "export",
    ]);
    expect(ordered[0]?.group).toBe("Recent");
    expect(ordered[1]?.group).toBe("Recent");
    expect(ordered[2]?.group).toBe("Navigation");
  });

  it("drops unknown and duplicate ids", () => {
    const ordered = orderWithRecent(
      actions,
      ["ghost", "save", "save"],
      "Recent",
    );
    expect(ids(ordered)).toEqual([
      "save",
      "open",
      "recent",
      "export",
      "sidebar",
    ]);
  });

  it("returns the input unchanged when nothing is recent", () => {
    expect(orderWithRecent(actions, [], "Recent")).toBe(actions);
    expect(orderWithRecent(actions, ["ghost"], "Recent")).toBe(actions);
  });
});
