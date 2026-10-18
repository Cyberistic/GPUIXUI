/**
 * ContextMenu behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a left click opening the menu; a right click that the
 * runtime reported but the component ignored; the surface appearing at the
 * parent's origin instead of the pointer; a selected action not running, or
 * running twice; and a second right click leaving the old point in place. A
 * caller `ref` on the trigger was also discarded in favour of the internal one.
 *
 * Type-ahead regression: typing in the pointer-positioned menu selected nothing,
 * although it shares the Dropdown menu's rows.
 *
 * Submenu regression: the Context menu had no submenu parts, and in both menus a
 * pointer press on a submenu row was treated as an outside press, closing both
 * levels before the click ran the row. Submenus also always opened right, so at
 * the window edge the runtime clamped one back over its row.
 *
 * Radio-group regression: a right-click menu could not express one exclusive
 * choice, and a radio press closed the menu instead of leaving the setting
 * visible.
 */

import { describe, expect, it, vi } from "vitest";
import type { PublicInstance } from "@gpuix/react";
import { createRef } from "react";
import * as Option from "effect/Option";
import {
  boundsOf,
  clickCentreOf,
  focusedTestId,
  requireBounds,
} from "../internal/interaction.js";
import {
  renderComponent,
  type ComponentTestRoot,
} from "../internal/test-root.js";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "../context-menu.js";

/** Right-click at a point in window coordinates. */
const rightClickAt = (root: ComponentTestRoot, x: number, y: number): void => {
  root.renderer.nativeSimulateClick(x, y, 2);
};

/** The project row whose right click offers three actions. */
const ProjectRow = ({
  onSelect,
  disabled,
}: {
  readonly onSelect: (action: string) => void;
  readonly disabled?: boolean;
}) => (
  <ContextMenu>
    <ContextMenuTrigger
      testId="row"
      disabled={disabled}
      style={{ width: 320, height: 120 }}
    >
      <text>Project</text>
    </ContextMenuTrigger>
    <ContextMenuContent testId="menu" label="Project actions">
      <ContextMenuItem testId="open" onSelect={() => onSelect("open")}>
        Open
      </ContextMenuItem>
      <ContextMenuItem testId="copy" onSelect={() => onSelect("copy")}>
        Copy path
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        testId="delete"
        tone="destructive"
        onSelect={() => onSelect("delete")}
      >
        Delete
      </ContextMenuItem>
    </ContextMenuContent>
  </ContextMenu>
);

/** The row's top-left bounds in window coordinates. */
const rowOrigin = (
  root: ComponentTestRoot,
): { readonly x: number; readonly y: number } => {
  const bounds = Option.getOrElse(boundsOf(root, "row"), () => {
    throw new Error("behaviour: the row is not laid out");
  });
  return { x: bounds.x, y: bounds.y };
};

/** The menu's top-left bounds, or a broken-fixture failure. */
const menuOrigin = (
  root: ComponentTestRoot,
): { readonly x: number; readonly y: number } => {
  const bounds = Option.getOrElse(boundsOf(root, "menu"), () => {
    throw new Error("behaviour: the menu is not laid out");
  });
  return { x: bounds.x, y: bounds.y };
};

/** Focus the trigger, as Tab would. */
const focusRow = (root: ComponentTestRoot): void => {
  root.renderer.focusElement(root.renderer.findByTestId("row")?.id ?? -1);
};

/** A project row whose menu offers a Share submenu. */
const WithSubmenu = ({
  onSelect,
}: {
  readonly onSelect: (action: string) => void;
}) => (
  <ContextMenu defaultOpen>
    <ContextMenuTrigger testId="row" style={{ width: 320, height: 120 }}>
      <text>Project</text>
    </ContextMenuTrigger>
    <ContextMenuContent testId="menu" label="Project actions">
      <ContextMenuItem testId="open" onSelect={() => onSelect("open")}>
        Open
      </ContextMenuItem>
      <ContextMenuSub>
        <ContextMenuSubTrigger testId="share">Share</ContextMenuSubTrigger>
        <ContextMenuSubContent testId="submenu" label="Share">
          <ContextMenuItem
            testId="copy-link"
            onSelect={() => onSelect("copy-link")}
          >
            Copy link
          </ContextMenuItem>
          <ContextMenuItem testId="email" onSelect={() => onSelect("email")}>
            Email
          </ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>
    </ContextMenuContent>
  </ContextMenu>
);

/** A project row whose Share submenu contains a More submenu. */
const NestedSubmenu = ({
  onSelect,
}: {
  readonly onSelect: (action: string) => void;
}) => (
  <ContextMenu defaultOpen>
    <ContextMenuTrigger testId="row" style={{ width: 320, height: 120 }}>
      <text>Project</text>
    </ContextMenuTrigger>
    <ContextMenuContent testId="menu" label="Project actions">
      <ContextMenuItem testId="open" onSelect={() => onSelect("open")}>
        Open
      </ContextMenuItem>
      <ContextMenuSub>
        <ContextMenuSubTrigger testId="share">Share</ContextMenuSubTrigger>
        <ContextMenuSubContent testId="submenu" label="Share">
          <ContextMenuSub>
            <ContextMenuSubTrigger testId="more">More</ContextMenuSubTrigger>
            <ContextMenuSubContent testId="nested" label="More">
              <ContextMenuItem testId="deep" onSelect={() => onSelect("deep")}>
                Copy as Markdown
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuItem
            testId="copy-link"
            onSelect={() => onSelect("copy-link")}
          >
            Copy link
          </ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>
    </ContextMenuContent>
  </ContextMenu>
);

/** A project row at the right edge, whose submenu cannot open further right. */
const RightEdgeSubmenu = ({
  onSelect,
}: {
  readonly onSelect: (action: string) => void;
}) => (
  <div style={{ paddingLeft: 1000 }}>
    <ContextMenu>
      <ContextMenuTrigger testId="row" style={{ width: 180, height: 40 }}>
        <text>Project</text>
      </ContextMenuTrigger>
      <ContextMenuContent testId="menu" label="Project actions">
        <ContextMenuSub>
          <ContextMenuSubTrigger testId="share">Share</ContextMenuSubTrigger>
          <ContextMenuSubContent testId="submenu" label="Share">
            <ContextMenuItem
              testId="copy-link"
              onSelect={() => onSelect("copy-link")}
            >
              Copy link
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
      </ContextMenuContent>
    </ContextMenu>
  </div>
);

describe("ContextMenu", () => {
  it("opens on a right click but not on a left click", () => {
    const row = renderComponent(<ProjectRow onSelect={vi.fn()} />);
    const origin = rowOrigin(row);

    clickCentreOf(row, "row");
    expect(row.renderer.findByTestId("menu")).toBeUndefined();

    rightClickAt(row, origin.x + 40, origin.y + 30);

    expect(row.renderer.findByTestId("menu")?.customProps?.role).toBe("menu");

    row.unmount();
  });

  it("places the surface at the pointer", () => {
    const row = renderComponent(<ProjectRow onSelect={vi.fn()} />);
    const origin = rowOrigin(row);
    const point = { x: origin.x + 100, y: origin.y + 60 };

    rightClickAt(row, point.x, point.y);

    const bounds = menuOrigin(row);

    expect(Math.abs(bounds.x - point.x)).toBeLessThanOrEqual(12);
    expect(Math.abs(bounds.y - point.y)).toBeLessThanOrEqual(12);

    row.unmount();
  });

  it("runs a selected action and closes", () => {
    const onSelect = vi.fn();
    const row = renderComponent(<ProjectRow onSelect={onSelect} />);
    const origin = rowOrigin(row);

    rightClickAt(row, origin.x + 40, origin.y + 30);
    clickCentreOf(row, "copy");

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("copy");
    expect(row.renderer.findByTestId("menu")).toBeUndefined();

    row.unmount();
  });

  it("re-opens at the new point on a second right click", () => {
    const row = renderComponent(<ProjectRow onSelect={vi.fn()} />);
    const origin = rowOrigin(row);

    rightClickAt(row, origin.x + 30, origin.y + 20);
    rightClickAt(row, origin.x + 270, origin.y + 100);

    const menu = row.renderer.findByTestId("menu");
    expect(menu).toBeDefined();

    const bounds = menuOrigin(row);
    expect(Math.abs(bounds.x - (origin.x + 270))).toBeLessThanOrEqual(12);
    expect(Math.abs(bounds.y - (origin.y + 100))).toBeLessThanOrEqual(12);

    row.unmount();
  });

  it("closes on Escape", () => {
    const row = renderComponent(<ProjectRow onSelect={vi.fn()} />);
    const origin = rowOrigin(row);

    rightClickAt(row, origin.x + 40, origin.y + 30);
    row.renderer.simulateKeystrokes("escape");

    expect(row.renderer.findByTestId("menu")).toBeUndefined();

    row.unmount();
  });

  it("does not open from a disabled trigger", () => {
    const row = renderComponent(<ProjectRow onSelect={vi.fn()} disabled />);
    const origin = rowOrigin(row);

    rightClickAt(row, origin.x + 40, origin.y + 30);

    expect(row.renderer.findByTestId("menu")).toBeUndefined();

    row.unmount();
  });

  it("opens from Shift+F10 and puts focus in the menu", () => {
    const row = renderComponent(<ProjectRow onSelect={vi.fn()} />);
    focusRow(row);

    row.renderer.simulateKeystrokes("shift-f10");

    expect(row.renderer.findByTestId("menu")?.customProps?.role).toBe("menu");
    expect(focusedTestId(row)).toEqual(Option.some("menu"));

    row.unmount();
  });

  it("opens at the trigger's bottom-left from the keyboard", () => {
    const row = renderComponent(<ProjectRow onSelect={vi.fn()} />);
    const trigger = Option.getOrElse(boundsOf(row, "row"), () => {
      throw new Error("behaviour: the row is not laid out");
    });
    focusRow(row);

    row.renderer.simulateKeystrokes("shift-f10");

    const menu = menuOrigin(row);
    expect(Math.abs(menu.x - trigger.x)).toBeLessThanOrEqual(12);
    expect(Math.abs(menu.y - (trigger.y + trigger.height))).toBeLessThanOrEqual(
      12,
    );

    row.unmount();
  });

  it("activates an item from the keyboard after opening", () => {
    const onSelect = vi.fn();
    const row = renderComponent(<ProjectRow onSelect={onSelect} />);
    focusRow(row);

    row.renderer.simulateKeystrokes("shift-f10");
    row.renderer.simulateKeystrokes("down");
    row.renderer.simulateKeystrokes("enter");

    expect(onSelect).toHaveBeenCalledWith("open");
    expect(row.renderer.findByTestId("menu")).toBeUndefined();

    row.unmount();
  });

  it("returns focus to the trigger when Escape closes it", () => {
    const row = renderComponent(<ProjectRow onSelect={vi.fn()} />);
    focusRow(row);

    row.renderer.simulateKeystrokes("shift-f10");
    row.renderer.simulateKeystrokes("escape");

    expect(row.renderer.findByTestId("menu")).toBeUndefined();
    expect(focusedTestId(row)).toEqual(Option.some("row"));

    row.unmount();
  });

  it("ignores Shift+F10 on a disabled trigger", () => {
    const row = renderComponent(<ProjectRow onSelect={vi.fn()} disabled />);
    focusRow(row);

    row.renderer.simulateKeystrokes("shift-f10");

    expect(row.renderer.findByTestId("menu")).toBeUndefined();
    expect(row.renderer.findByTestId("row")?.customProps?.tabIndex).toBe(-1);

    row.unmount();
  });

  it("feeds both the internal and the caller's trigger ref", () => {
    const ref = createRef<PublicInstance>();
    const row = renderComponent(
      <ContextMenu>
        <ContextMenuTrigger ref={ref} testId="row" style={{ height: 120 }}>
          <text>Project</text>
        </ContextMenuTrigger>
        <ContextMenuContent testId="menu" label="Project actions">
          <ContextMenuItem testId="open" onSelect={vi.fn()}>
            Open
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );

    expect(ref.current?.id).toBe(row.renderer.findByTestId("row")?.id);

    // The internal registration still works: Escape returns focus to the row.
    focusRow(row);
    row.renderer.simulateKeystrokes("shift-f10");
    row.renderer.simulateKeystrokes("escape");
    expect(focusedTestId(row)).toEqual(Option.some("row"));

    row.unmount();
  });

  it("jumps to a row from a typed prefix", () => {
    const row = renderComponent(<ProjectRow onSelect={vi.fn()} />);
    const origin = rowOrigin(row);

    rightClickAt(row, origin.x + 40, origin.y + 30);
    row.renderer.simulateKeystrokes("c");

    expect(focusedTestId(row)).toEqual(Option.some("copy"));

    row.unmount();
  });
});

describe("ContextMenu submenus", () => {
  /** Open the submenu through the keyboard: first row, Share, ArrowRight. */
  const openSubmenu = (root: ComponentTestRoot): void => {
    root.renderer.simulateKeystrokes("down");
    root.renderer.simulateKeystrokes("down");
    root.renderer.simulateKeystrokes("right");
  };

  it("runs a submenu row clicked with the pointer and closes both levels", () => {
    const onSelect = vi.fn();
    const row = renderComponent(<WithSubmenu onSelect={onSelect} />);
    openSubmenu(row);

    clickCentreOf(row, "copy-link");

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("copy-link");
    expect(row.renderer.findByTestId("submenu")).toBeUndefined();
    expect(row.renderer.findByTestId("menu")).toBeUndefined();

    row.unmount();
  });

  it("opens from ArrowRight and focuses its first row", () => {
    const row = renderComponent(<WithSubmenu onSelect={vi.fn()} />);

    openSubmenu(row);

    expect(row.renderer.findByTestId("submenu")?.customProps?.role).toBe(
      "menu",
    );
    expect(
      row.renderer.findByTestId("share")?.customProps?.["aria-expanded"],
    ).toBe(true);
    expect(focusedTestId(row)).toEqual(Option.some("copy-link"));

    row.unmount();
  });

  it("opens its submenu to the left at the right window edge", () => {
    const menu = renderComponent(<RightEdgeSubmenu onSelect={vi.fn()} />);
    const rowBounds = requireBounds(menu, "row");
    rightClickAt(
      menu,
      rowBounds.x + rowBounds.width - 10,
      rowBounds.y + rowBounds.height / 2,
    );
    clickCentreOf(menu, "share");

    const row = requireBounds(menu, "share");
    const surface = requireBounds(menu, "submenu");

    expect(surface.x + surface.width).toBeLessThanOrEqual(row.x);
    expect(surface.x).toBeGreaterThanOrEqual(8);

    menu.unmount();
  });

  it("closes one level on Escape and returns focus to the sub trigger", () => {
    const row = renderComponent(<WithSubmenu onSelect={vi.fn()} />);
    openSubmenu(row);

    row.renderer.simulateKeystrokes("escape");

    expect(row.renderer.findByTestId("submenu")).toBeUndefined();
    expect(row.renderer.findByTestId("menu")).toBeDefined();
    expect(focusedTestId(row)).toEqual(Option.some("share"));

    row.unmount();
  });

  it("closes one level on ArrowLeft and keeps the parent menu", () => {
    const row = renderComponent(<WithSubmenu onSelect={vi.fn()} />);
    openSubmenu(row);

    row.renderer.simulateKeystrokes("left");

    expect(row.renderer.findByTestId("submenu")).toBeUndefined();
    expect(row.renderer.findByTestId("menu")).toBeDefined();
    expect(focusedTestId(row)).toEqual(Option.some("share"));

    row.unmount();
  });

  it("runs an enclosing-submenu row while the nested level is open", () => {
    const onSelect = vi.fn();
    const row = renderComponent(<NestedSubmenu onSelect={onSelect} />);

    // Open, Share, then the nested More level: focus starts on the surface.
    row.renderer.simulateKeystrokes("down");
    row.renderer.simulateKeystrokes("down");
    row.renderer.simulateKeystrokes("right");
    row.renderer.simulateKeystrokes("right");

    expect(row.renderer.findByTestId("nested")).toBeDefined();

    clickCentreOf(row, "copy-link");

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("copy-link");
    expect(row.renderer.findByTestId("nested")).toBeUndefined();
    expect(row.renderer.findByTestId("submenu")).toBeUndefined();
    expect(row.renderer.findByTestId("menu")).toBeUndefined();

    row.unmount();
  });
});

/** A context menu whose sort order is one exclusive choice. */
const WithRadioGroup = ({
  onValueChange,
}: {
  readonly onValueChange: (value: string) => void;
}) => (
  <ContextMenu defaultOpen>
    <ContextMenuTrigger testId="row" style={{ width: 320, height: 120 }}>
      <text>Project</text>
    </ContextMenuTrigger>
    <ContextMenuContent testId="menu" label="Project actions">
      <ContextMenuRadioGroup
        label="Sort by"
        value="name"
        onValueChange={onValueChange}
      >
        <ContextMenuRadioItem testId="sort-name" value="name">
          Name
        </ContextMenuRadioItem>
        <ContextMenuRadioItem testId="sort-modified" value="modified">
          Modified
        </ContextMenuRadioItem>
      </ContextMenuRadioGroup>
    </ContextMenuContent>
  </ContextMenu>
);

describe("ContextMenu radio groups", () => {
  it("selects a radio row from the pointer and keeps the menu open", () => {
    const onValueChange = vi.fn();
    const row = renderComponent(
      <WithRadioGroup onValueChange={onValueChange} />,
    );

    clickCentreOf(row, "sort-modified");

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("modified");
    expect(row.renderer.findByTestId("menu")).toBeDefined();
    expect(
      row.renderer.findByTestId("sort-name")?.customProps?.["aria-selected"],
    ).toBe(true);

    row.unmount();
  });
});

describe("ContextMenu autoFocus", () => {
  it("reflects autoFocus in its focus state", () => {
    // The runtime focuses `autoFocus` after React's effects, so `onFocus` never
    // runs; the trigger's ring must still be painted (plan 388).
    const row = renderComponent(
      <ContextMenu>
        <ContextMenuTrigger
          testId="row"
          autoFocus
          style={{ width: 320, height: 120 }}
        >
          <text>Project</text>
        </ContextMenuTrigger>
        <ContextMenuContent testId="menu" label="Project actions">
          <ContextMenuItem testId="open" onSelect={vi.fn()}>
            Open
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );

    expect(focusedTestId(row)).toEqual(Option.some("row"));
    expect(row.renderer.findByTestId("row")?.style.boxShadow).toBeDefined();

    row.unmount();
  });
});
