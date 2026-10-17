/**
 * ContextMenu behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a left click opening the menu; a right click that the
 * runtime reported but the component ignored; the surface appearing at the
 * parent's origin instead of the pointer; a selected action not running, or
 * running twice; and a second right click leaving the old point in place. A
 * caller `ref` on the trigger was also discarded in favour of the internal one.
 */

import { describe, expect, it, vi } from "vitest";
import type { PublicInstance } from "@gpuix/react";
import { createRef } from "react";
import * as Option from "effect/Option";
import {
  boundsOf,
  clickCentreOf,
  focusedTestId,
} from "../internal/interaction.js";
import {
  renderComponent,
  type ComponentTestRoot,
} from "../internal/test-root.js";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
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
});
