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
 * favour of the internal one. A **disabled** trigger still opened on those keys.
 *
 * Type-ahead regression: typing a prefix selected nothing, a disabled row could
 * win the match, a repeated letter did not advance, the buffer never expired so a
 * later search inherited the old prefix, and Shift+R never matched `Rename`.
 *
 * Submenu regression: a pointer press on a submenu row counted as an outside
 * press on the parent surface, so both levels closed before the click landed and
 * `onSelect` never ran. Only the keyboard path was covered.
 *
 * Submenu placement regression: a submenu was always placed at its row's right
 * edge and relied on `fit="snap"`, so near the right window edge it was clamped
 * back over the row and the parent menu instead of opening to the left.
 *
 * Radio-group regression: the exclusive rule lived at every call site, so a
 * group could mark none or several rows; a radio row closed the menu instead of
 * staying open; a controlled group overwrote its caller's value; and a disabled
 * radio row stayed reachable by the arrow keys.
 *
 * Submenu-hover regression: a `disabled` submenu row opened its panel on hover
 * (the disabled contract of plan 393, which the press and key paths already
 * honoured), and leaving the row **and** its panel never closed the level, so
 * the panel stayed painted with focus inside it until Escape or an outside
 * press. Hover now goes through the shared `useHoverTravel` policy; a leave
 * closes one level after `closeDelay` and returns focus to the row.
 *
 * Held-press regression: the outside press closed the menu and marked the click
 * that follows, but the mark was cleared on a microtask and the runtime delivers
 * the click in a later task — so a real press-and-release left the menu open
 * (plan 583).
 *
 * Group-naming regression: the page promised that a `DropdownMenuLabel` named a
 * group, but neither a sibling label nor a label child reached the group's
 * accessible name, so assistive technology heard an anonymous group. `MenuGroup`
 * now takes `label` and falls back to its first label child, with a caller
 * `aria-label` winning (plan 689).
 */

import * as Option from "effect/Option";
import type { PublicInstance } from "@gpuix/react";
import { createRef, useState, type Ref } from "react";
import { describe, expect, it, vi } from "vitest";
import { Dialog, DialogContent, DialogTitle } from "../dialog.js";
import { Button } from "../internal/button.js";
import { darkTheme, lightTheme } from "../internal/theme.js";
import {
  clickCentreOf,
  focusedTestId,
  hoverCentreOf,
  isShown,
  nextTask,
  requireBounds,
  until,
} from "../internal/interaction.js";
import { a11yNodes } from "../internal/a11y.js";
import {
  renderComponent,
  type ComponentTestRoot,
  type TestTheme,
} from "../internal/test-root.js";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
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
  submenuRef,
}: {
  readonly onSelect: (action: string) => void;
  readonly submenuRef?: Ref<PublicInstance>;
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
          <DropdownMenuSubContent
            ref={submenuRef}
            testId="submenu"
            label="Share"
          >
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

/** A menu whose extra submenu row is disabled. */
const WithDisabledSubmenu = ({
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
          <DropdownMenuSubTrigger testId="share" disabled>
            Share
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent testId="submenu" label="Share">
            <DropdownMenuItem
              testId="copy-link"
              onSelect={() => onSelect("copy-link")}
            >
              Copy link
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
    <Button testId="elsewhere">Elsewhere</Button>
  </div>
);

/** A menu whose Share submenu contains a More submenu and an outside target. */
const NestedSubmenus = ({
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
        <DropdownMenuSub>
          <DropdownMenuSubTrigger testId="share">Share</DropdownMenuSubTrigger>
          <DropdownMenuSubContent testId="submenu" label="Share">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger testId="more">
                More
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent testId="nested" label="More">
                <DropdownMenuItem
                  testId="deep"
                  onSelect={() => onSelect("deep")}
                >
                  Copy as Markdown
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem
              testId="copy-link"
              onSelect={() => onSelect("copy-link")}
            >
              Copy link
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem testId="rename" onSelect={() => onSelect("rename")}>
          Rename
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <Button testId="elsewhere">Elsewhere</Button>
  </div>
);

/** A controlled radio group with a disabled row and a following action. */
const WithRadioGroup = ({
  value,
  onValueChange,
}: {
  readonly value: string | null;
  readonly onValueChange: (value: string) => void;
}) => (
  <div style={{ display: "flex", flexDirection: "column", padding: 40 }}>
    <DropdownMenu>
      <DropdownMenuTrigger testId="trigger">View</DropdownMenuTrigger>
      <DropdownMenuContent testId="menu" label="View options">
        <DropdownMenuRadioGroup
          testId="sort-group"
          label="Sort by"
          value={value}
          onValueChange={onValueChange}
        >
          <DropdownMenuRadioItem testId="sort-name" value="name">
            Name
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem testId="sort-modified" value="modified">
            Modified
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem testId="sort-size" value="size" disabled>
            Size
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuItem testId="after">After</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
);

/** The same group owning its value, so a real selection can be observed. */
const RadioMenu = ({
  onValueChange,
}: {
  readonly onValueChange?: (value: string) => void;
}) => {
  const [value, setValue] = useState<string | null>("name");
  return (
    <WithRadioGroup
      value={value}
      onValueChange={(next) => {
        setValue(next);
        onValueChange?.(next);
      }}
    />
  );
};

/** A radio group inside a submenu, so one level can be proven. */
const WithRadioSubmenu = ({
  value,
  onValueChange,
}: {
  readonly value: string | null;
  readonly onValueChange: (value: string) => void;
}) => (
  <div style={{ display: "flex", flexDirection: "column", padding: 40 }}>
    <DropdownMenu defaultOpen>
      <DropdownMenuTrigger testId="trigger">View</DropdownMenuTrigger>
      <DropdownMenuContent testId="menu" label="View options">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger testId="sort">Sort</DropdownMenuSubTrigger>
          <DropdownMenuSubContent testId="submenu" label="Sort">
            <DropdownMenuRadioGroup
              label="Sort by"
              value={value}
              onValueChange={onValueChange}
            >
              <DropdownMenuRadioItem testId="sub-name" value="name">
                Name
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem testId="sub-modified" value="modified">
                Modified
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
);

/** The same submenu group owning its value. */
const RadioSubmenu = ({
  onValueChange,
}: {
  readonly onValueChange: (value: string) => void;
}) => {
  const [value, setValue] = useState<string | null>("name");
  return (
    <WithRadioSubmenu
      value={value}
      onValueChange={(next) => {
        setValue(next);
        onValueChange(next);
      }}
    />
  );
};

/** A menu at the right edge, where a right-hand submenu cannot fit. */
const RightEdgeSubmenu = ({
  submenuRef,
}: {
  readonly submenuRef?: Ref<PublicInstance>;
}) => (
  <div style={{ paddingLeft: 1000, paddingTop: 100 }}>
    <DropdownMenu defaultOpen>
      <DropdownMenuTrigger testId="trigger">Actions</DropdownMenuTrigger>
      <DropdownMenuContent testId="menu" label="Actions">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger testId="share">Share</DropdownMenuSubTrigger>
          <DropdownMenuSubContent
            ref={submenuRef}
            testId="submenu"
            label="Share"
          >
            <DropdownMenuItem testId="copy">Copy link</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
);

/** Focus the trigger, as Tab would. */
const focusTrigger = (root: ComponentTestRoot): void => {
  root.renderer.focusElement(root.renderer.findByTestId("trigger")?.id ?? -1);
};

/**
 * A menu between two app controls, bare or inside a dialog, so a tab-out has a
 * control on each side to continue to.
 */
const Framed = ({
  inDialog = false,
  withSubmenu = false,
  open,
  onOpenChange,
}: {
  readonly inDialog?: boolean;
  readonly withSubmenu?: boolean;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
}) => {
  const menu = (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger testId="trigger">Actions</DropdownMenuTrigger>
      <DropdownMenuContent testId="menu" label="File actions">
        <DropdownMenuItem testId="rename" onSelect={() => undefined}>
          Rename
        </DropdownMenuItem>
        {withSubmenu ? (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger testId="share">
              Share
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent testId="submenu" label="Share">
              <DropdownMenuItem testId="copy-link" onSelect={() => undefined}>
                Copy link
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
  const body = (
    <>
      <Button testId="before">Before</Button>
      {menu}
      <Button testId="after">After</Button>
    </>
  );
  return inDialog ? (
    <Dialog open onOpenChange={() => undefined}>
      <DialogContent label="File actions" testId="dialog">
        <DialogTitle>File actions</DialogTitle>
        {body}
      </DialogContent>
    </Dialog>
  ) : (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 24, padding: 40 }}
    >
      {body}
    </div>
  );
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

  it("opens on the first row from a real Space down/up pair", () => {
    const menu = renderComponent(<FileActions onSelect={vi.fn()} />);
    focusTrigger(menu);

    // `simulateKeystrokes` batches down and up, so the old key-down open looked
    // fine; separate events expose the render where the key-up click closed it.
    const trigger = menu.renderer.findByTestId("trigger")?.id ?? -1;
    menu.renderer.nativeSimulateKeyDown(trigger, "space");
    menu.renderer.nativeSimulateKeyUp(trigger, "space");

    expect(menu.renderer.findByTestId("menu")?.customProps?.role).toBe("menu");
    expect(focusedTestId(menu)).toEqual(Option.some("rename"));

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

  it("never opens from a disabled trigger, by arrow keys", () => {
    const menu = renderComponent(
      <div style={{ padding: 40 }}>
        <DropdownMenu>
          <DropdownMenuTrigger testId="trigger" disabled>
            Actions
          </DropdownMenuTrigger>
          <DropdownMenuContent testId="menu" label="File actions">
            <DropdownMenuItem testId="rename">Rename</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>,
    );

    menu.renderer.focusElement(menu.renderer.findByTestId("trigger")?.id ?? -1);
    menu.renderer.simulateKeystrokes("down");
    menu.renderer.simulateKeystrokes("up");

    expect(menu.renderer.findByTestId("menu")).toBeUndefined();

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

  it("stays closed after a held trigger press, and a new press opens it", async () => {
    const menu = renderComponent(<FileActions onSelect={vi.fn()} />);
    clickCentreOf(menu, "trigger");
    expect(menu.renderer.findByTestId("menu")).toBeDefined();

    const { x, y, width, height } = requireBounds(menu, "trigger");
    menu.renderer.nativeSimulateMouseDown(x + width / 2, y + height / 2);
    // The runtime delivers the release in a later task; the old one-gesture mark
    // was already cleared, so the click re-opened the menu.
    await new Promise((resolve) => setTimeout(resolve, 10));
    menu.renderer.nativeSimulateMouseUp(x + width / 2, y + height / 2);

    expect(menu.renderer.findByTestId("menu")).toBeUndefined();

    clickCentreOf(menu, "trigger");

    expect(menu.renderer.findByTestId("menu")).toBeDefined();

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
    expect(menu.renderer.findByType("svg")).toHaveLength(0);

    clickCentreOf(menu, "hidden");

    expect(onCheckedChange).toHaveBeenCalledWith(true);
    // The menu stays open after a checkbox toggle, so the row is still there.
    expect(
      menu.renderer.findByTestId("hidden")?.customProps?.["aria-selected"],
    ).toBe(true);
    expect(menu.renderer.findByType("svg")).toHaveLength(1);
    expect(menu.renderer.findByType("svg")[0]?.style.color).toBe(
      darkTheme.colors.popoverForeground,
    );

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

  it("opens to the left when the right side cannot hold it", () => {
    const menu = renderComponent(<RightEdgeSubmenu />);
    clickCentreOf(menu, "share");

    const row = requireBounds(menu, "share");
    const surface = requireBounds(menu, "submenu");

    expect(surface.x + surface.width).toBeLessThanOrEqual(row.x);
    expect(surface.x).toBeGreaterThanOrEqual(8);
    expect(Math.abs(surface.y - row.y)).toBeLessThanOrEqual(8);

    menu.unmount();
  });

  /**
   * The bug these guard (plan 696): the surface spread its props after passing
   * its own `ref`, so a caller's `ref` — part of the public prop type —
   * replaced the internal surface ref instead of composing with it. The flip
   * measurement then read no surface and a right-edge submenu stopped opening
   * left.
   */
  it("feeds both the internal and the caller's submenu ref", () => {
    const ref = createRef<PublicInstance>();
    const onSelect = vi.fn();
    const menu = renderComponent(
      <WithSubmenus submenuRef={ref} onSelect={onSelect} />,
    );
    clickCentreOf(menu, "trigger");
    clickCentreOf(menu, "share");

    expect(ref.current).not.toBeNull();
    expect(ref.current?.id).toBe(menu.renderer.findByTestId("submenu")?.id);

    // The internal surface ref still recognises a press inside the level, so
    // the row runs once instead of the surface closing first (plan 389).
    clickCentreOf(menu, "copy-link");
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("copy-link");

    menu.unmount();
  });

  it("keeps arrow movement inside the submenu, skipping disabled rows", async () => {
    const menu = renderComponent(<WithSubmenus onSelect={vi.fn()} />);
    clickCentreOf(menu, "trigger");
    clickCentreOf(menu, "share");

    expect(menu.renderer.findByTestId("submenu")).toBeDefined();
    expect(focusedTestId(menu)).toEqual(Option.some("copy-link"));

    menu.renderer.simulateKeystrokes("down");
    expect(focusedTestId(menu)).toEqual(Option.some("email"));

    // A second real ArrowDown is a new task, not the same propagation.
    await nextTask();
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

  it("closes one level on Escape and returns focus to the sub trigger", async () => {
    const menu = renderComponent(<WithSubmenus onSelect={vi.fn()} />);
    clickCentreOf(menu, "trigger");
    clickCentreOf(menu, "share");

    menu.renderer.simulateKeystrokes("escape");

    expect(menu.renderer.findByTestId("submenu")).toBeUndefined();
    expect(menu.renderer.findByTestId("menu")).toBeDefined();
    expect(focusedTestId(menu)).toEqual(Option.some("share"));

    // A real second Escape is a new task, not the same propagation (plan 669).
    await nextTask();
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

  it("never opens a disabled submenu row", () => {
    const menu = renderComponent(<WithDisabledSubmenu onSelect={vi.fn()} />);
    clickCentreOf(menu, "trigger");

    hoverCentreOf(menu, "share");
    expect(isShown(menu, "submenu")).toBe(false);

    clickCentreOf(menu, "share");
    expect(isShown(menu, "submenu")).toBe(false);

    menu.unmount();
  });

  it("closes one level when the pointer leaves the row and its panel", async () => {
    const menu = renderComponent(<WithSubmenus onSelect={vi.fn()} />);
    clickCentreOf(menu, "trigger");
    hoverCentreOf(menu, "share");
    expect(isShown(menu, "submenu")).toBe(true);

    hoverCentreOf(menu, "elsewhere");

    // The close is delayed so the pointer can travel into the panel.
    expect(isShown(menu, "submenu")).toBe(true);
    await until(() => !isShown(menu, "submenu"));

    expect(isShown(menu, "menu")).toBe(true);
    expect(focusedTestId(menu)).toEqual(Option.some("share"));

    menu.unmount();
  });

  it("keeps the submenu open while the pointer is inside its panel", async () => {
    const menu = renderComponent(<WithSubmenus onSelect={vi.fn()} />);
    clickCentreOf(menu, "trigger");
    hoverCentreOf(menu, "share");
    hoverCentreOf(menu, "submenu");
    await new Promise((resolve) => setTimeout(resolve, 250));

    expect(isShown(menu, "submenu")).toBe(true);

    hoverCentreOf(menu, "elsewhere");
    await until(() => !isShown(menu, "submenu"));
    expect(isShown(menu, "submenu")).toBe(false);

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

  it("runs a row in the enclosing submenu while a nested submenu is open", () => {
    const onSelect = vi.fn();
    const menu = renderComponent(<NestedSubmenus onSelect={onSelect} />);
    clickCentreOf(menu, "trigger");
    hoverCentreOf(menu, "share");
    hoverCentreOf(menu, "more");

    expect(menu.renderer.findByTestId("nested")).toBeDefined();

    clickCentreOf(menu, "copy-link");

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("copy-link");
    expect(menu.renderer.findByTestId("nested")).toBeUndefined();
    expect(menu.renderer.findByTestId("submenu")).toBeUndefined();
    expect(menu.renderer.findByTestId("menu")).toBeUndefined();

    menu.unmount();
  });

  it("runs a root row while a nested submenu is open", () => {
    const onSelect = vi.fn();
    const menu = renderComponent(<NestedSubmenus onSelect={onSelect} />);
    clickCentreOf(menu, "trigger");
    hoverCentreOf(menu, "share");
    hoverCentreOf(menu, "more");

    clickCentreOf(menu, "rename");

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("rename");
    expect(menu.renderer.findByTestId("nested")).toBeUndefined();
    expect(menu.renderer.findByTestId("submenu")).toBeUndefined();
    expect(menu.renderer.findByTestId("menu")).toBeUndefined();

    menu.unmount();
  });

  it("closes every level on an outside press while nested", () => {
    const onSelect = vi.fn();
    const menu = renderComponent(<NestedSubmenus onSelect={onSelect} />);
    clickCentreOf(menu, "trigger");
    hoverCentreOf(menu, "share");
    hoverCentreOf(menu, "more");

    clickCentreOf(menu, "elsewhere");

    expect(onSelect).not.toHaveBeenCalled();
    expect(menu.renderer.findByTestId("nested")).toBeUndefined();
    expect(menu.renderer.findByTestId("submenu")).toBeUndefined();
    expect(menu.renderer.findByTestId("menu")).toBeUndefined();

    menu.unmount();
  });

  it("runs the deepest row once and closes every level", () => {
    const onSelect = vi.fn();
    const menu = renderComponent(<NestedSubmenus onSelect={onSelect} />);
    clickCentreOf(menu, "trigger");
    hoverCentreOf(menu, "share");
    hoverCentreOf(menu, "more");

    clickCentreOf(menu, "deep");

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("deep");
    expect(menu.renderer.findByTestId("nested")).toBeUndefined();
    expect(menu.renderer.findByTestId("submenu")).toBeUndefined();
    expect(menu.renderer.findByTestId("menu")).toBeUndefined();

    menu.unmount();
  });
});

describe("DropdownMenu radio groups", () => {
  it("marks exactly one radio row, reports the value and stays open", () => {
    const onValueChange = vi.fn();
    const menu = renderComponent(<RadioMenu onValueChange={onValueChange} />);
    clickCentreOf(menu, "trigger");

    clickCentreOf(menu, "sort-modified");

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("modified");
    expect(
      menu.renderer.findByTestId("sort-modified")?.customProps?.[
        "aria-selected"
      ],
    ).toBe(true);
    expect(
      menu.renderer.findByTestId("sort-name")?.customProps?.["aria-selected"],
    ).toBe(false);
    expect(menu.renderer.findByTestId("menu")).toBeDefined();

    const marked = ["sort-name", "sort-modified", "sort-size"].filter(
      (testId) =>
        menu.renderer.findByTestId(testId)?.customProps?.["aria-selected"] ===
        true,
    );
    expect(marked).toEqual(["sort-modified"]);

    menu.unmount();
  });

  it("paints the highlight bar and the radio dot with the row's text role", () => {
    // `accent` is a wash: on the menu's popover it measures about 1.1:1, so the
    // bar and dot that carry the highlight and the chosen value were invisible.
    // The row's own ink is the readable role on the popover and its washes.
    const menu = renderComponent(<RadioMenu />);
    clickCentreOf(menu, "trigger");

    menu.renderer.simulateKeystrokes("down");

    expect(menu.renderer.findByTestId("sort-name")?.style.borderColor).toBe(
      darkTheme.colors.popoverForeground,
    );

    clickCentreOf(menu, "sort-modified");

    const row = menu.renderer.findByTestId("sort-modified");
    const leadingId = row?.children[0];
    const leading =
      leadingId === undefined ? undefined : menu.renderer.getElement(leadingId);
    const dotId = leading?.children[0];
    const dot =
      dotId === undefined ? undefined : menu.renderer.getElement(dotId);

    expect(dot?.style.backgroundColor).toBe(darkTheme.colors.popoverForeground);

    menu.unmount();
  });

  it("keeps a controlled group on the caller's value", () => {
    const onValueChange = vi.fn();
    const menu = renderComponent(
      <WithRadioGroup value="name" onValueChange={onValueChange} />,
    );

    clickCentreOf(menu, "trigger");
    clickCentreOf(menu, "sort-modified");

    expect(onValueChange).toHaveBeenCalledWith("modified");
    expect(
      menu.renderer.findByTestId("sort-name")?.customProps?.["aria-selected"],
    ).toBe(true);
    expect(
      menu.renderer.findByTestId("sort-modified")?.customProps?.[
        "aria-selected"
      ],
    ).toBe(false);

    menu.unmount();
  });

  it("selects with Enter and Space and leaves one row marked", () => {
    const onValueChange = vi.fn();
    const menu = renderComponent(<RadioMenu onValueChange={onValueChange} />);
    clickCentreOf(menu, "trigger");

    menu.renderer.simulateKeystrokes("down");
    expect(focusedTestId(menu)).toEqual(Option.some("sort-name"));
    menu.renderer.simulateKeystrokes("down");
    expect(focusedTestId(menu)).toEqual(Option.some("sort-modified"));
    menu.renderer.simulateKeystrokes("enter");

    menu.renderer.simulateKeystrokes("up");
    menu.renderer.simulateKeystrokes("space");

    // Pressing the row that is already marked reports nothing new.
    menu.renderer.simulateKeystrokes("enter");

    expect(onValueChange.mock.calls).toEqual([["modified"], ["name"]]);
    expect(
      menu.renderer.findByTestId("sort-modified")?.customProps?.[
        "aria-selected"
      ],
    ).toBe(false);

    menu.unmount();
  });

  it("skips a disabled radio row and refuses its press", () => {
    const onValueChange = vi.fn();
    const menu = renderComponent(<RadioMenu onValueChange={onValueChange} />);
    clickCentreOf(menu, "trigger");

    // Name, Modified, then After: the disabled Size row is skipped.
    menu.renderer.simulateKeystrokes("down down down");
    expect(focusedTestId(menu)).toEqual(Option.some("after"));

    clickCentreOf(menu, "sort-size");

    expect(onValueChange).not.toHaveBeenCalled();
    expect(
      menu.renderer.findByTestId("sort-size")?.customProps?.["aria-selected"],
    ).toBe(false);

    menu.unmount();
  });

  it("names the group and reports the selected row as a menuitemradio", () => {
    const menu = renderComponent(<RadioMenu />);
    clickCentreOf(menu, "trigger");

    expect(menu.renderer.findByTestId("sort-group")?.customProps).toMatchObject(
      {
        role: "group",
        "aria-label": "Sort by",
      },
    );

    const radios = a11yNodes(menu.renderer).filter(
      (node) => node.role === "menuitemradio",
    );
    expect(radios.map((node) => node.name)).toEqual(
      expect.arrayContaining(["Name", "Modified", "Size"]),
    );
    expect(
      radios
        .filter((node) => Option.getOrElse(node.selected, () => false))
        .map((node) => node.name),
    ).toEqual(["Name"]);

    menu.unmount();
  });

  it("selects inside a submenu and closes one level on Escape", () => {
    const onValueChange = vi.fn();
    const menu = renderComponent(
      <RadioSubmenu onValueChange={onValueChange} />,
    );
    clickCentreOf(menu, "sort");
    expect(menu.renderer.findByTestId("submenu")).toBeDefined();

    clickCentreOf(menu, "sub-modified");
    expect(onValueChange).toHaveBeenCalledWith("modified");
    expect(
      menu.renderer.findByTestId("sub-modified")?.customProps?.[
        "aria-selected"
      ],
    ).toBe(true);
    expect(menu.renderer.findByTestId("submenu")).toBeDefined();
    expect(menu.renderer.findByTestId("menu")).toBeDefined();

    menu.renderer.simulateKeystrokes("escape");
    expect(menu.renderer.findByTestId("submenu")).toBeUndefined();
    expect(menu.renderer.findByTestId("menu")).toBeDefined();
    expect(focusedTestId(menu)).toEqual(Option.some("sort"));

    menu.unmount();
  });
});

/** A group whose name can come from a child label, a prop or a caller. */
const GroupedMenu = ({
  label,
  ariaLabel,
}: {
  readonly label?: string;
  readonly ariaLabel?: string;
}) => (
  <DropdownMenu defaultOpen>
    <DropdownMenuContent>
      <DropdownMenuGroup testId="group" label={label} aria-label={ariaLabel}>
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        <DropdownMenuItem testId="compact">Compact</DropdownMenuItem>
      </DropdownMenuGroup>
    </DropdownMenuContent>
  </DropdownMenu>
);

describe("Menu groups", () => {
  it("names a group from its label child", () => {
    const menu = renderComponent(<GroupedMenu />);

    expect(
      menu.renderer.findByTestId("group")?.customProps?.["aria-label"],
    ).toBe("Appearance");
    expect(
      a11yNodes(menu.renderer).some(
        (node) => node.role === "group" && node.name === "Appearance",
      ),
    ).toBe(true);

    menu.unmount();
  });

  it("names a group from its label prop", () => {
    const menu = renderComponent(<GroupedMenu label="View" />);

    expect(
      menu.renderer.findByTestId("group")?.customProps?.["aria-label"],
    ).toBe("View");

    menu.unmount();
  });

  it("keeps the caller's name over the label", () => {
    const menu = renderComponent(
      <GroupedMenu label="View" ariaLabel="Caller" />,
    );

    expect(
      menu.renderer.findByTestId("group")?.customProps?.["aria-label"],
    ).toBe("Caller");

    menu.unmount();
  });
});

describe("Tab leaves the menu", () => {
  it("closes on Tab and continues with the control after the trigger", () => {
    const menu = renderComponent(<Framed />);
    focusTrigger(menu);
    menu.renderer.simulateKeystrokes("down");

    menu.renderer.simulateKeystrokes("tab");

    expect(menu.renderer.findByTestId("menu")).toBeUndefined();
    expect(focusedTestId(menu)).toEqual(Option.some("after"));

    menu.unmount();
  });

  it("closes on Shift+Tab and continues with the control before the trigger", () => {
    const menu = renderComponent(<Framed />);
    focusTrigger(menu);
    menu.renderer.simulateKeystrokes("down");

    menu.renderer.simulateKeystrokes("shift-tab");

    expect(menu.renderer.findByTestId("menu")).toBeUndefined();
    expect(focusedTestId(menu)).toEqual(Option.some("before"));

    menu.unmount();
  });

  it("closes on Tab inside a dialog and moves focus once", () => {
    const scene = renderComponent(<Framed inDialog />);
    focusTrigger(scene);
    scene.renderer.simulateKeystrokes("down");

    // The dialog's trap must not step as well: one Tab is one move (plan 719).
    scene.renderer.simulateKeystrokes("tab");

    expect(scene.renderer.findByTestId("menu")).toBeUndefined();
    expect(scene.renderer.findByTestId("dialog")).toBeDefined();
    expect(focusedTestId(scene)).toEqual(Option.some("after"));

    scene.unmount();
  });

  it("closes every level on Tab from a submenu", () => {
    const scene = renderComponent(<Framed withSubmenu />);
    focusTrigger(scene);
    scene.renderer.simulateKeystrokes("down");
    scene.renderer.simulateKeystrokes("down");
    scene.renderer.simulateKeystrokes("right");
    expect(scene.renderer.findByTestId("submenu")).toBeDefined();

    scene.renderer.simulateKeystrokes("tab");

    expect(scene.renderer.findByTestId("submenu")).toBeUndefined();
    expect(scene.renderer.findByTestId("menu")).toBeUndefined();
    expect(focusedTestId(scene)).toEqual(Option.some("after"));

    scene.unmount();
  });

  it("keeps the menu and the user's focus when the caller refuses the close", () => {
    const scene = renderComponent(
      <Framed open onOpenChange={() => undefined} />,
    );
    scene.renderer.simulateKeystrokes("down");
    expect(focusedTestId(scene)).toEqual(Option.some("rename"));

    scene.renderer.simulateKeystrokes("tab");

    expect(scene.renderer.findByTestId("menu")).toBeDefined();
    expect(focusedTestId(scene)).toEqual(Option.some("rename"));

    scene.unmount();
  });
});
