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
 * levels before the click ran the row.
 *
 * Hover regression (guarded by the suite below): a submenu opened on the first
 * `mouseEnter` — so sweeping the pointer across a menu left the last submenu it
 * crossed open — and nothing closed it when the pointer left, because the only
 * close was another row's. Base UI rests ~100 ms before an open and holds a
 * grace before a close; these cases hold the same two waits.
 *
 * Shift regression: opening the menu must not move the page. The surface is an
 * `anchored` layer, out of the layout flow, so a sibling keeps its y — the case
 * below is the guard, and painting the surface in flow is what fails it.
 */

import { describe, expect, it, vi } from "vitest";
import type { PublicInstance } from "@gpuix/react";
import { createRef } from "react";
import * as Option from "effect/Option";
import {
  after,
  boundsOf,
  clickCentreOf,
  focusedTestId,
  hoverCentreOf,
  requireBounds,
  waitFor,
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

describe("ContextMenu", () => {
  it("opens on a right click but not on a left click", async () => {
    const row = renderComponent(<ProjectRow onSelect={vi.fn()} />);
    const origin = rowOrigin(row);

    clickCentreOf(row, "row");
    await waitFor(() =>
      expect(row.renderer.findByTestId("menu")).toBeUndefined(),
    );

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

  it("runs a selected action and closes", async () => {
    const onSelect = vi.fn();
    const row = renderComponent(<ProjectRow onSelect={onSelect} />);
    const origin = rowOrigin(row);

    rightClickAt(row, origin.x + 40, origin.y + 30);
    clickCentreOf(row, "copy");

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("copy");
    await waitFor(() =>
      expect(row.renderer.findByTestId("menu")).toBeUndefined(),
    );

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

  it("closes on Escape", async () => {
    const row = renderComponent(<ProjectRow onSelect={vi.fn()} />);
    const origin = rowOrigin(row);

    rightClickAt(row, origin.x + 40, origin.y + 30);
    row.renderer.simulateKeystrokes("escape");

    await waitFor(() =>
      expect(row.renderer.findByTestId("menu")).toBeUndefined(),
    );

    row.unmount();
  });

  it("leaves the focus nowhere when a pointer-opened menu dismisses", async () => {
    // The light harness cannot see a native window's focus, but the rule is the
    // component's: a pointer open records no restore target, so the documented
    // contract is "focus stays where the pointer put it" rather than the
    // trigger. A pointer-opened menu that started restoring would make the
    // Context menu page wrong (measured in a window by `context-menu-lifecycle`).
    const row = renderComponent(<ProjectRow onSelect={vi.fn()} />);
    const origin = rowOrigin(row);

    rightClickAt(row, origin.x + 40, origin.y + 30);
    expect(focusedTestId(row)).not.toEqual(Option.some("row"));

    row.renderer.simulateKeystrokes("escape");

    await waitFor(() =>
      expect(row.renderer.findByTestId("menu")).toBeUndefined(),
    );
    expect(focusedTestId(row)).toEqual(Option.none());

    row.unmount();
  });

  it("does not open from a disabled trigger", async () => {
    const row = renderComponent(<ProjectRow onSelect={vi.fn()} disabled />);
    const origin = rowOrigin(row);

    rightClickAt(row, origin.x + 40, origin.y + 30);

    await waitFor(() =>
      expect(row.renderer.findByTestId("menu")).toBeUndefined(),
    );

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

  it("activates an item from the keyboard after opening", async () => {
    const onSelect = vi.fn();
    const row = renderComponent(<ProjectRow onSelect={onSelect} />);
    focusRow(row);

    row.renderer.simulateKeystrokes("shift-f10");
    row.renderer.simulateKeystrokes("down");
    row.renderer.simulateKeystrokes("enter");

    expect(onSelect).toHaveBeenCalledWith("open");
    await waitFor(() =>
      expect(row.renderer.findByTestId("menu")).toBeUndefined(),
    );

    row.unmount();
  });

  it("returns focus to the trigger when Escape closes it", async () => {
    const row = renderComponent(<ProjectRow onSelect={vi.fn()} />);
    focusRow(row);

    row.renderer.simulateKeystrokes("shift-f10");
    row.renderer.simulateKeystrokes("escape");

    await waitFor(() =>
      expect(row.renderer.findByTestId("menu")).toBeUndefined(),
    );
    expect(focusedTestId(row)).toEqual(Option.some("row"));

    row.unmount();
  });

  it("ignores Shift+F10 on a disabled trigger", async () => {
    const row = renderComponent(<ProjectRow onSelect={vi.fn()} disabled />);
    focusRow(row);

    row.renderer.simulateKeystrokes("shift-f10");

    await waitFor(() =>
      expect(row.renderer.findByTestId("menu")).toBeUndefined(),
    );
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

  it("runs a submenu row clicked with the pointer and closes both levels", async () => {
    const onSelect = vi.fn();
    const row = renderComponent(<WithSubmenu onSelect={onSelect} />);
    openSubmenu(row);

    clickCentreOf(row, "copy-link");

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("copy-link");
    await waitFor(() =>
      expect(row.renderer.findByTestId("submenu")).toBeUndefined(),
    );
    await waitFor(() =>
      expect(row.renderer.findByTestId("menu")).toBeUndefined(),
    );

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

  it("closes one level on Escape and returns focus to the sub trigger", async () => {
    const row = renderComponent(<WithSubmenu onSelect={vi.fn()} />);
    openSubmenu(row);

    row.renderer.simulateKeystrokes("escape");

    await waitFor(() =>
      expect(row.renderer.findByTestId("submenu")).toBeUndefined(),
    );
    expect(row.renderer.findByTestId("menu")).toBeDefined();
    expect(focusedTestId(row)).toEqual(Option.some("share"));

    row.unmount();
  });

  it("closes one level on ArrowLeft and keeps the parent menu", async () => {
    const row = renderComponent(<WithSubmenu onSelect={vi.fn()} />);
    openSubmenu(row);

    row.renderer.simulateKeystrokes("left");

    await waitFor(() =>
      expect(row.renderer.findByTestId("submenu")).toBeUndefined(),
    );
    expect(row.renderer.findByTestId("menu")).toBeDefined();
    expect(focusedTestId(row)).toEqual(Option.some("share"));

    row.unmount();
  });
});

/** Whether the trigger row says its submenu is open, which outlives its paint. */
const submenuOpen = (root: ComponentTestRoot): boolean =>
  root.renderer.findByTestId("share")?.customProps?.["aria-expanded"] === true;

/** A menu whose pointer routes can be followed: a submenu, a disabled row, and a neighbour. */
const PointerPage = ({
  onSelect,
  onReason,
}: {
  readonly onSelect?: (action: string) => void;
  readonly onReason?: (open: boolean, reason: string) => void;
}) => (
  <div
    style={{ display: "flex", flexDirection: "row", alignItems: "flex-start" }}
  >
    <ContextMenu
      onOpenChange={(open, details) => onReason?.(open, details.reason)}
    >
      <ContextMenuTrigger testId="row" style={{ width: 320, height: 60 }}>
        <text>Project</text>
      </ContextMenuTrigger>
      <ContextMenuContent testId="menu" label="Project actions">
        <ContextMenuItem testId="open" onSelect={() => onSelect?.("open")}>
          Open
        </ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger testId="share">Share</ContextMenuSubTrigger>
          <ContextMenuSubContent testId="submenu" label="Share">
            <ContextMenuItem
              testId="copy-link"
              onSelect={() => onSelect?.("copy-link")}
            >
              Copy link
            </ContextMenuItem>
            <ContextMenuItem
              testId="email"
              onSelect={() => onSelect?.("email")}
            >
              Email
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuItem testId="rename" onSelect={() => onSelect?.("rename")}>
          Rename
        </ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger testId="disabled-share" disabled>
            Disabled share
          </ContextMenuSubTrigger>
          <ContextMenuSubContent
            testId="disabled-submenu"
            label="Disabled share"
          >
            <ContextMenuItem testId="never">Never</ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuItem testId="blocked" disabled>
          Blocked
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
    <div
      testId="elsewhere"
      style={{ width: 200, height: 200, marginLeft: 300 }}
    />
  </div>
);

/** Open the pointer menu at a point clear of the neighbour. */
const openPointerMenu = (root: ComponentTestRoot): void => {
  rightClickAt(root, 160, 30);
};

describe("ContextMenu hover, in Base UI's shape", () => {
  it("opens a submenu only after the rest Base UI asks for", async () => {
    const page = renderComponent(<PointerPage />);
    openPointerMenu(page);

    hoverCentreOf(page, "share");
    await after(40);
    expect(page.renderer.findByTestId("submenu")).toBeUndefined();

    await waitFor(() =>
      expect(page.renderer.findByTestId("submenu")).toBeDefined(),
    );
    page.unmount();
  });

  it("keeps the submenu through a diagonal move across the gap", async () => {
    const page = renderComponent(<PointerPage />);
    openPointerMenu(page);
    hoverCentreOf(page, "share");
    await waitFor(() => expect(submenuOpen(page)).toBe(true));

    const menu = requireBounds(page, "menu");
    const share = requireBounds(page, "share");
    // The 4px between the menu's edge and the submenu's: neither surface holds it.
    page.renderer.nativeSimulateMouseMove(menu.x + menu.width + 2, share.y + 4);
    await after(40);
    hoverCentreOf(page, "copy-link");
    await after(60);

    expect(submenuOpen(page)).toBe(true);
    expect(page.renderer.findByTestId("submenu")).toBeDefined();
    page.unmount();
  });

  it("closes a submenu when the pointer reaches a row that is not its trigger", async () => {
    const page = renderComponent(<PointerPage />);
    openPointerMenu(page);
    hoverCentreOf(page, "share");
    await waitFor(() => expect(submenuOpen(page)).toBe(true));

    hoverCentreOf(page, "rename");

    expect(submenuOpen(page)).toBe(false);
    // The submenu's rows unmount, so the focus they held goes back to the row the
    // submenu belongs to rather than nowhere.
    expect(focusedTestId(page)).toEqual(Option.some("share"));
    await waitFor(() =>
      expect(page.renderer.findByTestId("submenu")).toBeUndefined(),
    );
    expect(page.renderer.findByTestId("menu")).toBeDefined();
    page.unmount();
  });

  it("keeps its own submenu when the pointer comes back to its trigger", async () => {
    const page = renderComponent(<PointerPage />);
    openPointerMenu(page);
    hoverCentreOf(page, "share");
    await waitFor(() => expect(submenuOpen(page)).toBe(true));

    hoverCentreOf(page, "copy-link");
    await after(40);
    hoverCentreOf(page, "share");

    // No close and no second wait: the row that opens the submenu is inside it.
    expect(submenuOpen(page)).toBe(true);
    page.unmount();
  });

  it("closes the menu after the pointer leaves it and its submenu", async () => {
    const page = renderComponent(<PointerPage />);
    openPointerMenu(page);
    hoverCentreOf(page, "share");
    await waitFor(() => expect(submenuOpen(page)).toBe(true));
    hoverCentreOf(page, "copy-link");

    hoverCentreOf(page, "elsewhere");
    await after(40);
    // Still inside the grace: a pointer crossing a corner on its way back is
    // not a dismissal.
    expect(submenuOpen(page)).toBe(true);

    await waitFor(() =>
      expect(page.renderer.findByTestId("menu")).toBeUndefined(),
    );
    expect(page.renderer.findByTestId("submenu")).toBeUndefined();
    page.unmount();
  });

  it("does not open a disabled submenu trigger on hover", async () => {
    const page = renderComponent(<PointerPage />);
    openPointerMenu(page);

    hoverCentreOf(page, "disabled-share");
    await after(150);

    expect(page.renderer.findByTestId("disabled-submenu")).toBeUndefined();
    page.unmount();
  });
});

describe("ContextMenu keeps the page still", () => {
  it("opens without moving a sibling or its own trigger", async () => {
    const page = renderComponent(
      <div style={{ display: "flex", flexDirection: "column" }}>
        <ContextMenu>
          <ContextMenuTrigger testId="row" style={{ width: 320, height: 120 }}>
            <text>Project</text>
          </ContextMenuTrigger>
          <ContextMenuContent testId="menu" label="Project actions">
            <ContextMenuItem testId="open">Open</ContextMenuItem>
            <ContextMenuItem testId="copy">Copy path</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
        <div testId="sibling" style={{ width: 320, height: 40 }} />
      </div>,
    );
    const sibling = requireBounds(page, "sibling");
    const trigger = requireBounds(page, "row");

    rightClickAt(page, 100, 40);
    await waitFor(() =>
      expect(page.renderer.findByTestId("menu")).toBeDefined(),
    );

    expect(requireBounds(page, "sibling")).toEqual(sibling);
    expect(requireBounds(page, "row")).toEqual(trigger);
    page.unmount();
  });
});

describe("ContextMenu keyboard, in Base UI's shape", () => {
  it("moves to the row a typed prefix names", () => {
    const page = renderComponent(
      <ContextMenu defaultOpen>
        <ContextMenuTrigger testId="row" style={{ height: 60 }}>
          <text>Project</text>
        </ContextMenuTrigger>
        <ContextMenuContent testId="menu" label="Project actions">
          <ContextMenuItem testId="open">Open</ContextMenuItem>
          <ContextMenuItem testId="duplicate">Duplicate</ContextMenuItem>
          <ContextMenuItem testId="delete">Delete</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );

    page.renderer.simulateKeystrokes("d e");

    expect(focusedTestId(page)).toEqual(Option.some("delete"));
    page.unmount();
  });

  it("skips a disabled row with the arrow keys", () => {
    const page = renderComponent(<PointerPage />);
    openPointerMenu(page);

    // The last row is disabled, so Up lands on the row before it.
    page.renderer.simulateKeystrokes("up");

    expect(focusedTestId(page)).toEqual(Option.some("rename"));
    page.unmount();
  });

  it("treats a press inside the submenu as inside the menu", async () => {
    const page = renderComponent(<PointerPage />);
    openPointerMenu(page);
    hoverCentreOf(page, "share");
    await waitFor(() =>
      expect(page.renderer.findByTestId("submenu")).toBeDefined(),
    );

    const surface = requireBounds(page, "submenu");
    page.renderer.nativeSimulateClick(
      surface.x + surface.width - 3,
      surface.y + surface.height - 3,
      0,
    );

    // The state, not the paint: a closing submenu is still mounted for its exit.
    expect(submenuOpen(page)).toBe(true);
    expect(page.renderer.findByTestId("menu")).toBeDefined();
    page.unmount();
  });
});

describe("ContextMenu reports why it changed", () => {
  it("names the gesture that opened it and each that closed it", async () => {
    const reasons: Array<readonly [boolean, string]> = [];
    const page = renderComponent(
      <PointerPage onReason={(open, reason) => reasons.push([open, reason])} />,
    );

    openPointerMenu(page);
    expect(reasons).toEqual([[true, "trigger-press"]]);

    clickCentreOf(page, "open");
    await waitFor(() =>
      expect(page.renderer.findByTestId("menu")).toBeUndefined(),
    );
    expect(reasons.at(-1)).toEqual([false, "item-press"]);

    openPointerMenu(page);
    page.renderer.simulateKeystrokes("escape");
    await waitFor(() =>
      expect(page.renderer.findByTestId("menu")).toBeUndefined(),
    );
    expect(reasons.at(-1)).toEqual([false, "escape-key"]);

    openPointerMenu(page);
    clickCentreOf(page, "elsewhere");
    await waitFor(() =>
      expect(page.renderer.findByTestId("menu")).toBeUndefined(),
    );
    expect(reasons.at(-1)).toEqual([false, "outside-press"]);

    openPointerMenu(page);
    hoverCentreOf(page, "menu");
    hoverCentreOf(page, "elsewhere");
    await waitFor(() =>
      expect(page.renderer.findByTestId("menu")).toBeUndefined(),
    );
    expect(reasons.at(-1)).toEqual([false, "pointer-leave"]);

    page.unmount();
  });
});
