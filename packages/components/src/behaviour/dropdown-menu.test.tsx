/**
 * DropdownMenu behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: the menu opening without a `menu` role; an arrow key that
 * highlights a disabled row (so Enter does nothing while the highlight claims it
 * would); Enter firing twice or not closing; focus not returning to the trigger
 * after Enter or Escape; a press on the open trigger flickering the menu back open;
 * a checkbox row toggling the wrong way; and a destructive row that is not painted
 * with the destructive role.
 *
 * Keyboard-opening regression: a menu opened from the trigger landed on the
 * surface with nothing highlighted, so Enter ran nothing and ArrowDown/ArrowUp on
 * the closed trigger did nothing. A caller `ref` on the trigger was discarded in
 * favour of the internal one.
 *
 * Type-ahead regression: typing a prefix selected nothing, a disabled row could
 * win the match, a repeated letter did not advance, the buffer never expired so a
 * later search inherited the old prefix, and Shift+R never matched `Rename`.
 *
 * Submenu regression: a pointer press on a submenu row counted as an outside
 * press on the parent surface, so both levels closed before the click landed and
 * `onSelect` never ran. Only the keyboard path was covered.
 */

import * as Option from "effect/Option";
import type { PublicInstance } from "@gpuix/react";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "../internal/button.js";
import { darkTheme, lightTheme } from "../internal/theme.js";
import {
  clickCentreOf,
  focusedTestId,
  hoverCentreOf,
  requireBounds,
} from "../internal/interaction.js";
import {
  renderComponent,
  type ComponentTestRoot,
  type TestTheme,
} from "../internal/test-root.js";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../dropdown-menu.js";

/** A file-actions menu with a disabled row and a checkbox row. */
const FileActions = ({
  onSelect,
  onCheckedChange,
}: {
  readonly onSelect: (action: string) => void;
  readonly onCheckedChange?: (checked: boolean) => void;
}) => {
  const [checked, setChecked] = useState(false);
  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 24, padding: 40 }}
    >
      <DropdownMenu>
        <DropdownMenuTrigger testId="trigger">Actions</DropdownMenuTrigger>
        <DropdownMenuContent testId="menu" label="File actions">
          <DropdownMenuItem testId="rename" onSelect={() => onSelect("rename")}>
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            testId="duplicate"
            disabled
            onSelect={() => onSelect("duplicate")}
          >
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuCheckboxItem
            testId="hidden"
            checked={checked}
            onCheckedChange={(next) => {
              setChecked(next);
              onCheckedChange?.(next);
            }}
          >
            Show hidden
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator testId="separator" />
          <DropdownMenuItem
            testId="delete"
            tone="destructive"
            onSelect={() => onSelect("delete")}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button testId="elsewhere">Elsewhere</Button>
    </div>
  );
};

/** A trigger near the window centre, where a centred menu has room to sit. */
const CentredActions = () => (
  <div style={{ paddingLeft: 540, paddingTop: 100 }}>
    <DropdownMenu>
      <DropdownMenuTrigger testId="trigger">Actions</DropdownMenuTrigger>
      <DropdownMenuContent testId="menu" label="Centred actions" align="center">
        <DropdownMenuItem testId="rename" onSelect={() => undefined}>
          Rename
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
);

/** A trigger at the bottom of the window, where a downside menu cannot fit. */
const LowActions = () => (
  <div style={{ display: "flex", flexDirection: "column", height: 780 }}>
    <div style={{ flexGrow: 1 }} />
    <DropdownMenu>
      <DropdownMenuTrigger testId="trigger">Actions</DropdownMenuTrigger>
      <DropdownMenuContent testId="menu" label="Low actions">
        <DropdownMenuItem testId="rename" onSelect={() => undefined}>
          Rename
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
);

/** A menu whose labels share a first letter, for the type-ahead cycle. */
const Searchable = ({
  onSelect,
}: {
  readonly onSelect: (action: string) => void;
}) => (
  <div
    style={{ display: "flex", flexDirection: "column", gap: 24, padding: 40 }}
  >
    <DropdownMenu>
      <DropdownMenuTrigger testId="trigger">Actions</DropdownMenuTrigger>
      <DropdownMenuContent testId="menu" label="Searchable actions">
        <DropdownMenuItem testId="rename" onSelect={() => onSelect("rename")}>
          Rename
        </DropdownMenuItem>
        <DropdownMenuItem
          testId="duplicate"
          onSelect={() => onSelect("duplicate")}
        >
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem testId="delete" onSelect={() => onSelect("delete")}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
);

/** A menu with two submenus and an outside target. */
const WithSubmenus = ({
  onSelect,
}: {
  readonly onSelect: (action: string) => void;
}) => (
  <div
    style={{ display: "flex", flexDirection: "column", gap: 24, padding: 40 }}
  >
    <DropdownMenu>
      <DropdownMenuTrigger testId="trigger">Actions</DropdownMenuTrigger>
      <DropdownMenuContent testId="menu" label="File actions">
        <DropdownMenuItem testId="rename" onSelect={() => onSelect("rename")}>
          Rename
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger testId="share">Share</DropdownMenuSubTrigger>
          <DropdownMenuSubContent testId="submenu" label="Share">
            <DropdownMenuItem
              testId="copy-link"
              onSelect={() => onSelect("copy-link")}
            >
              Copy link
            </DropdownMenuItem>
            <DropdownMenuItem testId="email" onSelect={() => onSelect("email")}>
              Email
            </DropdownMenuItem>
            <DropdownMenuItem
              testId="blocked"
              disabled
              onSelect={() => onSelect("blocked")}
            >
              Blocked
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger testId="export">
            Export
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent testId="export-menu" label="Export">
            <DropdownMenuItem testId="pdf" onSelect={() => onSelect("pdf")}>
              PDF
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem testId="delete" onSelect={() => onSelect("delete")}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <Button testId="elsewhere">Elsewhere</Button>
  </div>
);

/** Focus the trigger, as Tab would. */
const focusTrigger = (root: ComponentTestRoot): void => {
  root.renderer.focusElement(root.renderer.findByTestId("trigger")?.id ?? -1);
};

describe("DropdownMenu", () => {
  it("opens on the first enabled row from ArrowDown", () => {
    const menu = renderComponent(<FileActions onSelect={vi.fn()} />);
    focusTrigger(menu);

    menu.renderer.simulateKeystrokes("down");

    expect(menu.renderer.findByTestId("menu")?.customProps?.role).toBe("menu");
    expect(focusedTestId(menu)).toEqual(Option.some("rename"));

    menu.unmount();
  });

  it("opens on the last enabled row from ArrowUp", () => {
    const menu = renderComponent(<FileActions onSelect={vi.fn()} />);
    focusTrigger(menu);

    menu.renderer.simulateKeystrokes("up");

    expect(focusedTestId(menu)).toEqual(Option.some("delete"));

    menu.unmount();
  });

  it("opens on the first row from Enter, and a second Enter runs it", () => {
    const onSelect = vi.fn();
    const menu = renderComponent(<FileActions onSelect={onSelect} />);
    focusTrigger(menu);

    menu.renderer.simulateKeystrokes("enter");
    expect(menu.renderer.findByTestId("menu")).toBeDefined();
    expect(focusedTestId(menu)).toEqual(Option.some("rename"));

    menu.renderer.simulateKeystrokes("enter");
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("rename");
    expect(menu.renderer.findByTestId("menu")).toBeUndefined();
    expect(focusedTestId(menu)).toEqual(Option.some("trigger"));

    menu.unmount();
  });

  it("still focuses the surface when a pointer opens the menu", () => {
    const menu = renderComponent(<FileActions onSelect={vi.fn()} />);

    clickCentreOf(menu, "trigger");

    expect(focusedTestId(menu)).toEqual(Option.some("menu"));

    menu.unmount();
  });

  it("opens as a menu on the trigger", () => {
    const menu = renderComponent(<FileActions onSelect={vi.fn()} />);

    expect(menu.renderer.findByTestId("menu")).toBeUndefined();

    clickCentreOf(menu, "trigger");

    expect(menu.renderer.findByTestId("menu")?.customProps?.role).toBe("menu");
    // 0.10.0 has no `aria-haspopup`; `aria-expanded` is the whole announcement.
    expect(menu.renderer.findByTestId("trigger")?.customProps).toMatchObject({
      "aria-expanded": true,
    });

    menu.unmount();
  });

  it("centres a requested menu on its trigger", () => {
    const menu = renderComponent(<CentredActions />);
    clickCentreOf(menu, "trigger");

    const trigger = requireBounds(menu, "trigger");
    const surface = requireBounds(menu, "menu");

    expect(
      Math.abs(surface.x + surface.width / 2 - (trigger.x + trigger.width / 2)),
    ).toBeLessThanOrEqual(1);

    menu.unmount();
  });

  it("opens above a trigger near the window bottom instead of covering it", () => {
    const menu = renderComponent(<LowActions />);
    clickCentreOf(menu, "trigger");

    const trigger = requireBounds(menu, "trigger");
    const surface = requireBounds(menu, "menu");

    expect(surface.y + surface.height).toBeLessThanOrEqual(trigger.y);

    menu.unmount();
  });

  it("moves real focus down, skipping disabled rows", () => {
    const menu = renderComponent(<FileActions onSelect={vi.fn()} />);
    clickCentreOf(menu, "trigger");

    menu.renderer.simulateKeystrokes("down");
    expect(focusedTestId(menu)).toEqual(Option.some("rename"));

    menu.renderer.simulateKeystrokes("down");
    expect(focusedTestId(menu)).toEqual(Option.some("hidden"));

    menu.renderer.simulateKeystrokes("down");
    expect(focusedTestId(menu)).toEqual(Option.some("delete"));

    menu.renderer.simulateKeystrokes("down");
    expect(focusedTestId(menu)).toEqual(Option.some("rename"));

    menu.unmount();
  });

  it("jumps to the first and last enabled rows", () => {
    const menu = renderComponent(<FileActions onSelect={vi.fn()} />);
    clickCentreOf(menu, "trigger");

    menu.renderer.simulateKeystrokes("end");
    expect(focusedTestId(menu)).toEqual(Option.some("delete"));

    menu.renderer.simulateKeystrokes("home");
    expect(focusedTestId(menu)).toEqual(Option.some("rename"));

    menu.unmount();
  });

  it("runs Enter on the focused row once, closes and restores focus", () => {
    const onSelect = vi.fn();
    const menu = renderComponent(<FileActions onSelect={onSelect} />);
    clickCentreOf(menu, "trigger");

    menu.renderer.simulateKeystrokes("down");
    menu.renderer.simulateKeystrokes("enter");

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("rename");
    expect(menu.renderer.findByTestId("menu")).toBeUndefined();
    expect(focusedTestId(menu)).toEqual(Option.some("trigger"));

    menu.unmount();
  });

  it("runs a clicked row and ignores a disabled one", () => {
    const onSelect = vi.fn();
    const menu = renderComponent(<FileActions onSelect={onSelect} />);
    clickCentreOf(menu, "trigger");

    clickCentreOf(menu, "duplicate");
    expect(onSelect).not.toHaveBeenCalled();
    expect(menu.renderer.findByTestId("menu")).toBeDefined();

    clickCentreOf(menu, "rename");
    expect(onSelect).toHaveBeenCalledWith("rename");
    expect(menu.renderer.findByTestId("menu")).toBeUndefined();

    menu.unmount();
  });

  it("closes on Escape, on an outside press, and on a second press of the trigger", async () => {
    const menu = renderComponent(<FileActions onSelect={vi.fn()} />);

    clickCentreOf(menu, "trigger");
    menu.renderer.simulateKeystrokes("escape");
    expect(menu.renderer.findByTestId("menu")).toBeUndefined();
    expect(focusedTestId(menu)).toEqual(Option.some("trigger"));

    clickCentreOf(menu, "trigger");
    clickCentreOf(menu, "elsewhere");
    expect(menu.renderer.findByTestId("menu")).toBeUndefined();

    // The real runtime delivers the press and the next click in separate tasks,
    // so the one-gesture dismiss mark has been cleared by now.
    await Promise.resolve();

    clickCentreOf(menu, "trigger");
    expect(menu.renderer.findByTestId("menu")).toBeDefined();
    clickCentreOf(menu, "trigger");
    expect(menu.renderer.findByTestId("menu")).toBeUndefined();

    menu.unmount();
  });

  it("toggles a checkbox row and shows the check mark only when checked", () => {
    const onCheckedChange = vi.fn();
    const menu = renderComponent(
      <FileActions onSelect={vi.fn()} onCheckedChange={onCheckedChange} />,
    );
    clickCentreOf(menu, "trigger");

    expect(
      menu.renderer.findByTestId("hidden")?.customProps?.["aria-selected"],
    ).toBe(false);
    expect(menu.renderer.getAllText()).not.toContain("✓");

    clickCentreOf(menu, "hidden");

    expect(onCheckedChange).toHaveBeenCalledWith(true);
    // The menu stays open after a checkbox toggle, so the row is still there.
    expect(
      menu.renderer.findByTestId("hidden")?.customProps?.["aria-selected"],
    ).toBe(true);
    expect(menu.renderer.getAllText()).toContain("✓");

    menu.unmount();
  });

  it("paints a destructive row with the destructive role", () => {
    const menu = renderComponent(<FileActions onSelect={vi.fn()} />);
    clickCentreOf(menu, "trigger");

    expect(menu.renderer.findByTestId("delete")?.style.color).toBe(
      darkTheme.colors.destructive,
    );
    expect(menu.renderer.findByTestId("separator")?.style.height).toBe(
      darkTheme.borderWidth.thin,
    );

    menu.unmount();
  });

  it("reads the popover surface from whichever theme is active", () => {
    const assertTheme = (theme: TestTheme, popover: string): void => {
      const menu = renderComponent(<FileActions onSelect={vi.fn()} />, theme);
      clickCentreOf(menu, "trigger");

      expect(menu.renderer.findByTestId("menu")?.style.backgroundColor).toBe(
        popover,
      );

      menu.unmount();
    };

    assertTheme("dark", darkTheme.colors.popover);
    assertTheme("light", lightTheme.colors.popover);
  });

  it("feeds both the internal and the caller's trigger ref", () => {
    const ref = createRef<PublicInstance>();
    const menu = renderComponent(
      <DropdownMenu>
        <DropdownMenuTrigger ref={ref} testId="trigger">
          Actions
        </DropdownMenuTrigger>
        <DropdownMenuContent testId="menu" label="File actions">
          <DropdownMenuItem testId="rename" onSelect={vi.fn()}>
            Rename
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    expect(ref.current?.id).toBe(menu.renderer.findByTestId("trigger")?.id);

    // The internal ref still works: Escape returns focus to the trigger.
    clickCentreOf(menu, "trigger");
    menu.renderer.simulateKeystrokes("escape");
    expect(focusedTestId(menu)).toEqual(Option.some("trigger"));

    menu.unmount();
  });

  it("feeds both the internal and the caller's row ref", () => {
    const ref = createRef<PublicInstance>();
    const menu = renderComponent(
      <DropdownMenu>
        <DropdownMenuTrigger testId="trigger">Actions</DropdownMenuTrigger>
        <DropdownMenuContent testId="menu" label="File actions">
          <DropdownMenuItem ref={ref} testId="rename" onSelect={vi.fn()}>
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem testId="delete" onSelect={vi.fn()}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    clickCentreOf(menu, "trigger");

    expect(ref.current?.id).toBe(menu.renderer.findByTestId("rename")?.id);

    // The internal row ref still carries the highlight.
    menu.renderer.simulateKeystrokes("down");
    menu.renderer.simulateKeystrokes("down");
    expect(focusedTestId(menu)).toEqual(Option.some("delete"));

    menu.unmount();
  });

  it("jumps to a row from a typed prefix", () => {
    const menu = renderComponent(<Searchable onSelect={vi.fn()} />);
    clickCentreOf(menu, "trigger");

    menu.renderer.simulateKeystrokes("r e");

    expect(focusedTestId(menu)).toEqual(Option.some("rename"));

    menu.unmount();
  });

  it("advances on a repeated letter and wraps", () => {
    const menu = renderComponent(<Searchable onSelect={vi.fn()} />);
    clickCentreOf(menu, "trigger");

    menu.renderer.simulateKeystrokes("d");
    expect(focusedTestId(menu)).toEqual(Option.some("duplicate"));

    menu.renderer.simulateKeystrokes("d");
    expect(focusedTestId(menu)).toEqual(Option.some("delete"));

    menu.renderer.simulateKeystrokes("d");
    expect(focusedTestId(menu)).toEqual(Option.some("duplicate"));

    menu.unmount();
  });

  it("skips a disabled row when matching", () => {
    const menu = renderComponent(<FileActions onSelect={vi.fn()} />);
    clickCentreOf(menu, "trigger");

    // `Duplicate` starts with "du" but is disabled, so "du" matches nothing and
    // the highlight stays on the row the first letter reached.
    menu.renderer.simulateKeystrokes("d u");
    expect(focusedTestId(menu)).toEqual(Option.some("delete"));

    menu.unmount();
  });

  it("matches shifted text case-insensitively", () => {
    const menu = renderComponent(<Searchable onSelect={vi.fn()} />);
    clickCentreOf(menu, "trigger");

    menu.renderer.simulateKeystrokes("shift-r");

    expect(focusedTestId(menu)).toEqual(Option.some("rename"));

    menu.unmount();
  });

  it("starts a new search after the type-ahead window", async () => {
    const menu = renderComponent(<Searchable onSelect={vi.fn()} />);
    clickCentreOf(menu, "trigger");

    menu.renderer.simulateKeystrokes("d e");
    expect(focusedTestId(menu)).toEqual(Option.some("delete"));

    await new Promise((resolve) => setTimeout(resolve, 600));

    menu.renderer.simulateKeystrokes("r");
    expect(focusedTestId(menu)).toEqual(Option.some("rename"));

    menu.unmount();
  });

  it("clears an unmatched prefix so the next letter searches afresh", () => {
    const menu = renderComponent(<Searchable onSelect={vi.fn()} />);
    clickCentreOf(menu, "trigger");

    menu.renderer.simulateKeystrokes("z");
    expect(focusedTestId(menu)).toEqual(Option.some("menu"));

    menu.renderer.simulateKeystrokes("r");
    expect(focusedTestId(menu)).toEqual(Option.some("rename"));

    menu.unmount();
  });
});

describe("DropdownMenu submenus", () => {
  it("opens from ArrowRight and focuses the first row", () => {
    const menu = renderComponent(<WithSubmenus onSelect={vi.fn()} />);
    clickCentreOf(menu, "trigger");

    menu.renderer.simulateKeystrokes("down down");
    expect(focusedTestId(menu)).toEqual(Option.some("share"));
    expect(
      menu.renderer.findByTestId("share")?.customProps?.["aria-expanded"],
    ).toBe(false);

    menu.renderer.simulateKeystrokes("right");

    expect(menu.renderer.findByTestId("submenu")?.customProps?.role).toBe(
      "menu",
    );
    expect(
      menu.renderer.findByTestId("share")?.customProps?.["aria-expanded"],
    ).toBe(true);
    expect(focusedTestId(menu)).toEqual(Option.some("copy-link"));

    menu.unmount();
  });

  it("opens to the right of its trigger row", () => {
    const menu = renderComponent(<WithSubmenus onSelect={vi.fn()} />);
    clickCentreOf(menu, "trigger");

    clickCentreOf(menu, "share");

    const row = requireBounds(menu, "share");
    const surface = requireBounds(menu, "submenu");
    expect(surface.x).toBeGreaterThanOrEqual(row.x + row.width);
    expect(Math.abs(surface.y - row.y)).toBeLessThanOrEqual(8);

    menu.unmount();
  });

  it("keeps arrow movement inside the submenu, skipping disabled rows", () => {
    const menu = renderComponent(<WithSubmenus onSelect={vi.fn()} />);
    clickCentreOf(menu, "trigger");
    clickCentreOf(menu, "share");

    expect(menu.renderer.findByTestId("submenu")).toBeDefined();
    expect(focusedTestId(menu)).toEqual(Option.some("copy-link"));

    menu.renderer.simulateKeystrokes("down");
    expect(focusedTestId(menu)).toEqual(Option.some("email"));

    menu.renderer.simulateKeystrokes("down");
    expect(focusedTestId(menu)).toEqual(Option.some("copy-link"));

    menu.unmount();
  });

  it("runs a submenu row once, closes both levels and restores root focus", () => {
    const onSelect = vi.fn();
    const menu = renderComponent(<WithSubmenus onSelect={onSelect} />);
    clickCentreOf(menu, "trigger");
    clickCentreOf(menu, "share");

    menu.renderer.simulateKeystrokes("down");
    menu.renderer.simulateKeystrokes("enter");

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("email");
    expect(menu.renderer.findByTestId("submenu")).toBeUndefined();
    expect(menu.renderer.findByTestId("menu")).toBeUndefined();
    expect(focusedTestId(menu)).toEqual(Option.some("trigger"));

    menu.unmount();
  });

  it("runs a submenu row clicked with the pointer", () => {
    const onSelect = vi.fn();
    const menu = renderComponent(<WithSubmenus onSelect={onSelect} />);
    clickCentreOf(menu, "trigger");
    clickCentreOf(menu, "share");

    clickCentreOf(menu, "copy-link");

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("copy-link");
    expect(menu.renderer.findByTestId("submenu")).toBeUndefined();
    expect(menu.renderer.findByTestId("menu")).toBeUndefined();

    menu.unmount();
  });

  it("closes one level on Escape and returns focus to the sub trigger", () => {
    const menu = renderComponent(<WithSubmenus onSelect={vi.fn()} />);
    clickCentreOf(menu, "trigger");
    clickCentreOf(menu, "share");

    menu.renderer.simulateKeystrokes("escape");

    expect(menu.renderer.findByTestId("submenu")).toBeUndefined();
    expect(menu.renderer.findByTestId("menu")).toBeDefined();
    expect(focusedTestId(menu)).toEqual(Option.some("share"));

    menu.renderer.simulateKeystrokes("escape");
    expect(menu.renderer.findByTestId("menu")).toBeUndefined();
    expect(focusedTestId(menu)).toEqual(Option.some("trigger"));

    menu.unmount();
  });

  it("closes one level on ArrowLeft and keeps the parent menu", () => {
    const menu = renderComponent(<WithSubmenus onSelect={vi.fn()} />);
    clickCentreOf(menu, "trigger");
    clickCentreOf(menu, "share");

    menu.renderer.simulateKeystrokes("left");

    expect(menu.renderer.findByTestId("submenu")).toBeUndefined();
    expect(menu.renderer.findByTestId("menu")).toBeDefined();
    expect(focusedTestId(menu)).toEqual(Option.some("share"));

    menu.unmount();
  });

  it("opens on hover and focuses the first row", () => {
    const menu = renderComponent(<WithSubmenus onSelect={vi.fn()} />);
    clickCentreOf(menu, "trigger");

    hoverCentreOf(menu, "share");

    expect(menu.renderer.findByTestId("submenu")).toBeDefined();
    expect(focusedTestId(menu)).toEqual(Option.some("copy-link"));

    menu.unmount();
  });

  it("keeps at most one submenu open", () => {
    const menu = renderComponent(<WithSubmenus onSelect={vi.fn()} />);
    clickCentreOf(menu, "trigger");
    clickCentreOf(menu, "share");

    clickCentreOf(menu, "export");

    expect(menu.renderer.findByTestId("submenu")).toBeUndefined();
    expect(menu.renderer.findByTestId("export-menu")).toBeDefined();

    menu.unmount();
  });

  it("closes the submenu when the pointer moves onto another row", () => {
    const menu = renderComponent(<WithSubmenus onSelect={vi.fn()} />);
    clickCentreOf(menu, "trigger");
    hoverCentreOf(menu, "share");
    expect(menu.renderer.findByTestId("submenu")).toBeDefined();

    hoverCentreOf(menu, "rename");

    expect(menu.renderer.findByTestId("submenu")).toBeUndefined();
    expect(menu.renderer.findByTestId("menu")).toBeDefined();

    menu.unmount();
  });

  it("closes both levels on an outside press", () => {
    const menu = renderComponent(<WithSubmenus onSelect={vi.fn()} />);
    clickCentreOf(menu, "trigger");
    clickCentreOf(menu, "share");

    clickCentreOf(menu, "elsewhere");

    expect(menu.renderer.findByTestId("submenu")).toBeUndefined();
    expect(menu.renderer.findByTestId("menu")).toBeUndefined();

    menu.unmount();
  });

  it("keeps type-ahead inside the submenu", () => {
    const menu = renderComponent(<WithSubmenus onSelect={vi.fn()} />);
    clickCentreOf(menu, "trigger");
    clickCentreOf(menu, "share");

    // "e" matches Email in the submenu and Export in the parent. Only the
    // submenu may react; otherwise focus would be stolen out of it.
    menu.renderer.simulateKeystrokes("e");

    expect(focusedTestId(menu)).toEqual(Option.some("email"));

    menu.unmount();
  });
});
