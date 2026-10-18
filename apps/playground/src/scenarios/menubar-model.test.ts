/**
 * The menu-bar model's rules (plan `519`).
 *
 * The pair that matters: `stepTitle` must cross the disabled View menu, and
 * `stepItem` must wrap over the disabled Save As row. A fixture with only
 * enabled entries lets both mutations pass.
 */
import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import type { Menu } from "./menubar-model.js";
import {
  acceleratorCommand,
  chordOf,
  closeMenu,
  enterMenu,
  hoverTitle,
  initial,
  pressTitle,
  stepItem,
  stepTitle,
} from "./menubar-model.js";

const item = (
  id: string,
  accelerator: Option.Option<string>,
  disabled = false,
) => ({ id, label: id, accelerator, disabled });

const MENUS: ReadonlyArray<Menu> = [
  {
    id: "file",
    label: "File",
    disabled: false,
    items: [
      item("new", Option.some("cmd-n")),
      item("open", Option.some("cmd-o")),
      item("save", Option.some("cmd-s")),
      item("save-as", Option.some("cmd-shift-s"), true),
    ],
  },
  {
    id: "edit",
    label: "Edit",
    disabled: false,
    items: [
      item("undo", Option.some("cmd-z")),
      item("redo", Option.some("cmd-shift-z"), true),
    ],
  },
  {
    id: "view",
    label: "View",
    disabled: true,
    items: [item("zoom", Option.some("cmd-0"))],
  },
  {
    id: "help",
    label: "Help",
    disabled: false,
    items: [item("about", Option.none())],
  },
];

const opened = (index: number, itemIndex = 0) => ({
  active: index,
  open: Option.some(index),
  item: itemIndex,
});

describe("pressTitle", () => {
  it("opens a menu on its first enabled row", () => {
    expect(pressTitle(initial, MENUS, 0)).toEqual(opened(0));
  });

  it("closes the open menu on a second press and keeps the return target", () => {
    expect(pressTitle(opened(1, 1), MENUS, 1)).toEqual({
      active: 1,
      open: Option.none(),
      item: 1,
    });
  });

  it("is inert on a disabled menu", () => {
    expect(pressTitle(initial, MENUS, 2)).toEqual(initial);
  });
});

describe("hoverTitle", () => {
  it("does nothing on a closed bar", () => {
    expect(hoverTitle(initial, MENUS, 1)).toEqual(initial);
  });

  it("switches the open menu and highlights its first row", () => {
    expect(hoverTitle(opened(0), MENUS, 1)).toEqual(opened(1));
  });

  it("ignores a disabled menu and the already-open title", () => {
    expect(hoverTitle(opened(1), MENUS, 2)).toEqual(opened(1));
    expect(hoverTitle(opened(1), MENUS, 1)).toEqual(opened(1));
  });
});

describe("stepTitle", () => {
  it("skips a disabled menu and wraps", () => {
    expect(stepTitle(opened(1), MENUS, 1)).toEqual(opened(3));
    expect(stepTitle(opened(3), MENUS, 1)).toEqual(opened(0));
    expect(stepTitle(opened(0), MENUS, -1)).toEqual(opened(3));
  });

  it("opens the neighbour's first row while open", () => {
    expect(stepTitle(opened(0, 2), MENUS, 1)).toEqual(opened(1));
  });

  it("moves only the focused title while closed", () => {
    expect(stepTitle(initial, MENUS, 1)).toEqual({ ...initial, active: 1 });
  });
});

describe("enterMenu", () => {
  it("highlights the first enabled row of the active menu", () => {
    expect(enterMenu({ ...initial, active: 1 }, MENUS)).toEqual(opened(1));
  });

  it("skips a disabled first row", () => {
    const menus: ReadonlyArray<Menu> = [
      {
        id: "file",
        label: "File",
        disabled: false,
        items: [item("a", Option.none(), true), item("b", Option.none())],
      },
    ];
    expect(enterMenu(initial, menus)).toEqual(opened(0, 1));
  });
});

describe("stepItem", () => {
  it("wraps over the disabled Save As row", () => {
    expect(stepItem(opened(0, 2), MENUS, 1)).toEqual(opened(0, 0));
    expect(stepItem(opened(0, 0), MENUS, -1)).toEqual(opened(0, 2));
  });

  it("does nothing while closed", () => {
    expect(stepItem(initial, MENUS, 1)).toEqual(initial);
  });
});

describe("closeMenu", () => {
  it("keeps the title focus returns to", () => {
    expect(closeMenu(opened(3, 0))).toEqual({
      active: 3,
      open: Option.none(),
      item: 0,
    });
  });
});

describe("acceleratorCommand", () => {
  it("finds an enabled row's command", () => {
    expect(acceleratorCommand(MENUS, "cmd-s")).toEqual(Option.some("save"));
  });

  it("does not run a disabled row's chord", () => {
    expect(acceleratorCommand(MENUS, "cmd-shift-s")).toEqual(Option.none());
    expect(acceleratorCommand(MENUS, "cmd-shift-z")).toEqual(Option.none());
  });

  it("does not bind a chord on a disabled menu", () => {
    expect(acceleratorCommand(MENUS, "cmd-0")).toEqual(Option.none());
  });
});

describe("chordOf", () => {
  const none = { cmd: false, ctrl: false, alt: false, shift: false };

  it("normalises modifier order", () => {
    expect(chordOf("s", { ...none, shift: true, cmd: true })).toEqual(
      Option.some("cmd-shift-s"),
    );
  });

  it("is the bare key with no modifiers, and None with no key", () => {
    expect(chordOf("escape", none)).toEqual(Option.some("escape"));
    expect(chordOf("", none)).toEqual(Option.none());
  });
});
