/**
 * The menu bar's three directions: a press opens, the same press closes, and a
 * different press switches. Held here so the desktop's only state cannot regress
 * to "opens but never closes".
 */
import { describe, expect, it } from "vitest";
import { menus } from "./data.js";
import { focusedApp, nextMenu, openMenu } from "./logic.js";

describe("the menu bar", () => {
  it("opens a menu, closes it on the same press, and switches on another", () => {
    const opened = nextMenu(undefined, "File");
    expect(openMenu(opened, menus)?.title).toBe("File");
    expect(openMenu(nextMenu(opened, "File"), menus)).toBeUndefined();
    expect(openMenu(nextMenu(opened, "View"), menus)?.title).toBe("View");
  });

  it("names the pressed app, and an unknown opener keeps the current one", () => {
    expect(focusedApp("Finder", "Music")).toBe("Music");
    expect(focusedApp("Music", "Music")).toBe("Music");
    expect(menus.map((menu) => menu.title)).toContain("Window");
  });
});
