/**
 * DropdownMenu behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: the menu opening without a `menu` role; an arrow key that
 * highlights a disabled row (so Enter does nothing while the highlight claims it
 * would); Enter firing twice or not closing; focus not returning to the trigger
 * after Enter or Escape; a press on the open trigger flickering the menu back open;
 * a checkbox row toggling the wrong way; a held Enter toggling a checkbox row
 * back again on each repeat of the key; a destructive row painted in the
 * solid `destructive` fill role, which no contrast pair measures as text; a
 * checked row's mark painted in the `accent` wash role, which is 1.26:1 on the
 * light popover and 1.14:1 on the dark one, so a toggle that was on said
 * nothing; and a disabled row dimmed with a 50% fade, which composites its
 * label into its own fill instead of painting the measured `disabledForeground`
 * role.
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
 *
 * Leaving-surface regression: the exit tween stayed hit-testable, so a press
 * inside the surface's own box was swallowed instead of reaching the control
 * underneath.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { PublicInstance } from "@gpuix/react";
import {
  contrastFloors,
  contrastFloorsFor,
  contrastRatio,
  decorativeFloor,
  getTheme,
  platformNames,
  platformTheme,
  retroNames,
  retroTheme,
} from "@gpuixui/tokens";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { nodesWithRole } from "../internal/a11y.js";
import { Button } from "../internal/button.js";
import { darkTheme, lightTheme, pressWash } from "../internal/theme.js";
import {
  clickCentreOf,
  waitFor,
  focusedTestId,
  hoverCentreOf,
  requireBounds,
  settleMotion,
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
  triggerDisabled,
}: {
  readonly onSelect: (action: string) => void;
  readonly onCheckedChange?: (checked: boolean) => void;
  readonly triggerDisabled?: boolean;
}) => {
  const [checked, setChecked] = useState(false);
  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 24, padding: 40 }}
    >
      <DropdownMenu>
        <DropdownMenuTrigger testId="trigger" disabled={triggerDisabled}>
          Actions
        </DropdownMenuTrigger>
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

  it("keeps a disabled trigger out of the tab order and closed", async () => {
    const menu = renderComponent(
      <FileActions onSelect={vi.fn()} triggerDisabled />,
    );

    expect(menu.renderer.findByTestId("trigger")?.customProps?.tabIndex).toBe(
      -1,
    );

    // A disabled control keeps its key handler observable, so the trigger must
    // refuse every open path itself rather than relying on the press being gone.
    focusTrigger(menu);
    menu.renderer.simulateKeystrokes("down");
    menu.renderer.simulateKeystrokes("enter");
    clickCentreOf(menu, "trigger");

    await waitFor(() =>
      expect(menu.renderer.findByTestId("menu")).toBeUndefined(),
    );

    menu.unmount();
  });

  it("opens on the last enabled row from ArrowUp", () => {
    const menu = renderComponent(<FileActions onSelect={vi.fn()} />);
    focusTrigger(menu);

    menu.renderer.simulateKeystrokes("up");

    expect(focusedTestId(menu)).toEqual(Option.some("delete"));

    menu.unmount();
  });

  it("opens on the first row from Enter, and a second Enter runs it", async () => {
    const onSelect = vi.fn();
    const menu = renderComponent(<FileActions onSelect={onSelect} />);
    focusTrigger(menu);

    menu.renderer.simulateKeystrokes("enter");
    expect(menu.renderer.findByTestId("menu")).toBeDefined();
    expect(focusedTestId(menu)).toEqual(Option.some("rename"));

    menu.renderer.simulateKeystrokes("enter");
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("rename");
    await waitFor(() =>
      expect(menu.renderer.findByTestId("menu")).toBeUndefined(),
    );
    expect(focusedTestId(menu)).toEqual(Option.some("trigger"));

    menu.unmount();
  });

  it("still focuses the surface when a pointer opens the menu", () => {
    const menu = renderComponent(<FileActions onSelect={vi.fn()} />);

    clickCentreOf(menu, "trigger");

    expect(focusedTestId(menu)).toEqual(Option.some("menu"));

    menu.unmount();
  });

  it("opens as a menu on the trigger", async () => {
    const menu = renderComponent(<FileActions onSelect={vi.fn()} />);

    await waitFor(() =>
      expect(menu.renderer.findByTestId("menu")).toBeUndefined(),
    );

    clickCentreOf(menu, "trigger");

    expect(menu.renderer.findByTestId("menu")?.customProps?.role).toBe("menu");
    // 0.11.0 has no `aria-haspopup`; `aria-expanded` is the whole announcement.
    expect(menu.renderer.findByTestId("trigger")?.customProps).toMatchObject({
      "aria-expanded": true,
    });

    menu.unmount();
  });

  it("centres a requested menu on its trigger", () => {
    const menu = renderComponent(<CentredActions />);
    clickCentreOf(menu, "trigger");
    settleMotion(menu);

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
    settleMotion(menu);

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

  it("runs Enter on the focused row once, closes and restores focus", async () => {
    const onSelect = vi.fn();
    const menu = renderComponent(<FileActions onSelect={onSelect} />);
    clickCentreOf(menu, "trigger");

    menu.renderer.simulateKeystrokes("down");
    menu.renderer.simulateKeystrokes("enter");

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("rename");
    await waitFor(() =>
      expect(menu.renderer.findByTestId("menu")).toBeUndefined(),
    );
    expect(focusedTestId(menu)).toEqual(Option.some("trigger"));

    menu.unmount();
  });

  it("runs a clicked row and ignores a disabled one", async () => {
    const onSelect = vi.fn();
    const menu = renderComponent(<FileActions onSelect={onSelect} />);
    clickCentreOf(menu, "trigger");

    clickCentreOf(menu, "duplicate");
    expect(onSelect).not.toHaveBeenCalled();
    expect(menu.renderer.findByTestId("menu")).toBeDefined();

    clickCentreOf(menu, "rename");
    expect(onSelect).toHaveBeenCalledWith("rename");
    await waitFor(() =>
      expect(menu.renderer.findByTestId("menu")).toBeUndefined(),
    );

    menu.unmount();
  });

  it("paints a disabled row with the measured disabled pair, not a fade", () => {
    Arr.forEach(
      [
        ["dark", darkTheme],
        ["light", lightTheme],
      ] as const,
      ([mode, theme]) => {
        const menu = renderComponent(<FileActions onSelect={vi.fn()} />, mode);
        clickCentreOf(menu, "trigger");

        const style = menu.renderer.findByTestId("duplicate")?.style;

        expect(style?.color).toBe(theme.colors.disabledForeground);
        // A 50% fade composited this label into the row's own fill, which a
        // high-contrast theme can no longer read at its 3:1.
        expect(style?.opacity).not.toBe(0.5);
        const ratio = contrastRatio(
          theme.colors.disabledForeground,
          theme.colors.popover,
        );
        expect(ratio ?? 0).toBeGreaterThanOrEqual(contrastFloors.disabled);

        menu.unmount();
      },
    );
  });

  it("closes on Escape, on an outside press, and on a second press of the trigger", async () => {
    const menu = renderComponent(<FileActions onSelect={vi.fn()} />);

    clickCentreOf(menu, "trigger");
    menu.renderer.simulateKeystrokes("escape");
    await waitFor(() =>
      expect(menu.renderer.findByTestId("menu")).toBeUndefined(),
    );
    expect(focusedTestId(menu)).toEqual(Option.some("trigger"));

    clickCentreOf(menu, "trigger");
    clickCentreOf(menu, "elsewhere");
    await waitFor(() =>
      expect(menu.renderer.findByTestId("menu")).toBeUndefined(),
    );

    // The real runtime delivers the press and the next click in separate tasks,
    // so the one-gesture dismiss mark has been cleared by now.
    await Promise.resolve();

    clickCentreOf(menu, "trigger");
    expect(menu.renderer.findByTestId("menu")).toBeDefined();
    clickCentreOf(menu, "trigger");
    await waitFor(() =>
      expect(menu.renderer.findByTestId("menu")).toBeUndefined(),
    );

    menu.unmount();
  });

  it("takes the press a leaving surface would leak", async () => {
    const onBehind = vi.fn();
    const menu = renderComponent(
      <div style={{ position: "relative", width: 800, height: 600 }}>
        <Button
          testId="behind"
          onClick={onBehind}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 800,
            height: 600,
          }}
        >
          Behind
        </Button>
        <div style={{ position: "absolute", left: 40, top: 40 }}>
          <DropdownMenu>
            <DropdownMenuTrigger testId="trigger">Actions</DropdownMenuTrigger>
            <DropdownMenuContent testId="menu" label="File actions">
              <DropdownMenuItem testId="rename" onSelect={() => undefined}>
                Rename
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>,
    );

    clickCentreOf(menu, "trigger");
    const surface = requireBounds(menu, "menu");
    menu.renderer.simulateKeystrokes("escape");

    // The surface is still mounted for its exit tween at its own coordinates.
    // Its rows keep their own hitboxes, so the seam's shield covers the box:
    // the ghost row cannot run and the page underneath stays unpressed.
    expect(menu.renderer.findByTestId("menu")).toBeDefined();
    menu.renderer.nativeSimulateClick(
      surface.x + surface.width / 2,
      surface.y + surface.height / 2,
    );
    expect(onBehind).not.toHaveBeenCalled();

    await waitFor(() =>
      expect(menu.renderer.findByTestId("menu")).toBeUndefined(),
    );
    // Once the exit window has elapsed the page answers again.
    menu.renderer.nativeSimulateClick(
      surface.x + surface.width / 2,
      surface.y + surface.height / 2,
    );
    expect(onBehind).toHaveBeenCalledTimes(1);

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
    expect(
      nodesWithRole(menu.renderer, "image").map((node) => node.name),
    ).not.toContain("Checked");

    clickCentreOf(menu, "hidden");

    expect(onCheckedChange).toHaveBeenCalledWith(true);
    // The menu stays open after a checkbox toggle, so the row is still there.
    expect(
      menu.renderer.findByTestId("hidden")?.customProps?.["aria-selected"],
    ).toBe(true);
    expect(
      nodesWithRole(menu.renderer, "image").map((node) => node.name),
    ).toContain("Checked");

    menu.unmount();
  });

  it("paints the checked mark in a role the mark floor measures", () => {
    // The bug: the check painted `colors.accent`, a wash role — 1.26:1 on the
    // light popover and 1.14:1 on the dark one, so a menu toggle was on with
    // nothing on screen saying so.
    const menu = renderComponent(<FileActions onSelect={vi.fn()} />, "light");
    clickCentreOf(menu, "trigger");
    clickCentreOf(menu, "hidden");

    const mark = menu.renderer
      .findByType("svg")
      .find((element) => element.customProps?.["aria-label"] === "Checked");

    expect(mark?.style.color).toBe(lightTheme.colors.primary);
    expect(
      Arr.every(
        ["popover", "hover"] as const,
        (surface) =>
          (contrastRatio(
            lightTheme.colors.primary,
            lightTheme.colors[surface],
          ) ?? 0) >= contrastFloors.boundary,
      ),
    ).toBe(true);
    // The premise: the wash it used to paint cannot be found on the surface.
    expect(
      contrastRatio(lightTheme.colors.accent, lightTheme.colors.popover) ?? 0,
    ).toBeLessThan(contrastFloors.boundary);

    menu.unmount();
  });

  it("paints a highlighted row's bar in a role the mark floor measures", () => {
    // The bug: the bar painted `colors.accent`, a wash role, on the `hover`
    // wash the highlighted row already wears — under the 3:1 mark floor in all
    // sixteen shipped, high-contrast, platform and authored styles, and
    // 1.000:1 on the Luna dark look's own row — so the cue naming the row that
    // leads an open submenu was invisible.
    const styles = [
      getTheme("light"),
      getTheme("dark"),
      getTheme("light", "high"),
      getTheme("dark", "high"),
      ...Arr.flatMap(platformNames, (name) => [
        platformTheme(getTheme("light"), name),
        platformTheme(getTheme("dark"), name),
      ]),
      ...Arr.flatMap(retroNames, (look) => [
        retroTheme(getTheme("light"), look),
        retroTheme(getTheme("dark"), look),
      ]),
    ];

    Arr.forEach(styles, (theme) => {
      const menu = renderComponent(<FileActions onSelect={vi.fn()} />, theme);
      clickCentreOf(menu, "trigger");
      menu.renderer.simulateKeystrokes("down");

      const bar = menu.renderer.findByTestId("rename")?.style.borderColor;

      menu.unmount();

      expect(bar).toBe(theme.colors.primary);
      expect(
        contrastRatio(theme.colors.primary, theme.colors.hover) ?? 0,
      ).toBeGreaterThanOrEqual(contrastFloorsFor(theme).boundary);
      // The premise: the role the bar used to paint cannot be read on the wash.
      expect(
        contrastRatio(theme.colors.accent, theme.colors.hover) ?? 0,
      ).toBeLessThan(contrastFloorsFor(theme).boundary);
    });
  });

  it("paints a row press the highlight it replaces can show", () => {
    // The bug: a row's press repainted the raw `active` role, which in
    // Light · macOS sits 1.037:1 from the `hover` wash the highlighted row is
    // already wearing — under the 1.05:1 perceptibility floor — so the row a
    // reader pressed did not answer. The wash is derived against the one it
    // replaces, the way a list row's press is derived against `accent`.
    const macOSLight = platformTheme(lightTheme, "darwin");
    const menu = renderComponent(
      <FileActions onSelect={vi.fn()} />,
      macOSLight,
    );
    clickCentreOf(menu, "trigger");
    hoverCentreOf(menu, "rename");

    const style = menu.renderer.findByTestId("rename")?.style;

    menu.unmount();

    expect(style?.hover).toMatchObject({
      backgroundColor: macOSLight.colors.hover,
    });
    expect(style?.active).toMatchObject({
      backgroundColor: pressWash(macOSLight, "hover"),
    });
    expect(style?.active).not.toMatchObject({
      backgroundColor: macOSLight.colors.active,
    });
    expect(
      contrastRatio(pressWash(macOSLight, "hover"), macOSLight.colors.hover) ??
        0,
    ).toBeGreaterThanOrEqual(decorativeFloor);
    // The premise: the role the row used to paint cannot be seen on its hover.
    expect(
      contrastRatio(macOSLight.colors.active, macOSLight.colors.hover) ?? 0,
    ).toBeLessThan(decorativeFloor);
  });

  it("toggles a checkbox row once while Enter is held", () => {
    const onCheckedChange = vi.fn();
    const menu = renderComponent(
      <FileActions onSelect={vi.fn()} onCheckedChange={onCheckedChange} />,
    );
    clickCentreOf(menu, "trigger");

    // Rename → (skips the disabled Duplicate) → Show hidden.
    menu.renderer.simulateKeystrokes("down down");
    expect(focusedTestId(menu)).toEqual(Option.some("hidden"));

    const row = menu.renderer.findByTestId("hidden");
    expect(row).toBeDefined();
    if (row === undefined) return;

    // One keypress, then the platform's repeats of the same held key.
    menu.renderer.nativeSimulateKeyDown(row.id, "enter");
    menu.renderer.nativeSimulateKeyDown(row.id, "enter", true);
    menu.renderer.flush();

    expect(onCheckedChange).toHaveBeenCalledTimes(1);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(
      menu.renderer.findByTestId("hidden")?.customProps?.["aria-selected"],
    ).toBe(true);

    menu.unmount();
  });

  it("paints a destructive row in the status tone's measured page role", () => {
    const menu = renderComponent(<FileActions onSelect={vi.fn()} />);
    clickCentreOf(menu, "trigger");

    const painted = menu.renderer.findByTestId("delete")?.style.color;

    expect(painted).toBe(darkTheme.colors.destructiveSoftForeground);
    expect(painted).not.toBe(darkTheme.colors.destructive);
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
    settleMotion(menu);

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

  it("runs a submenu row once, closes both levels and restores root focus", async () => {
    const onSelect = vi.fn();
    const menu = renderComponent(<WithSubmenus onSelect={onSelect} />);
    clickCentreOf(menu, "trigger");
    clickCentreOf(menu, "share");

    menu.renderer.simulateKeystrokes("down");
    menu.renderer.simulateKeystrokes("enter");

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("email");
    await waitFor(() =>
      expect(menu.renderer.findByTestId("submenu")).toBeUndefined(),
    );
    await waitFor(() =>
      expect(menu.renderer.findByTestId("menu")).toBeUndefined(),
    );
    expect(focusedTestId(menu)).toEqual(Option.some("trigger"));

    menu.unmount();
  });

  it("runs a submenu row clicked with the pointer", async () => {
    const onSelect = vi.fn();
    const menu = renderComponent(<WithSubmenus onSelect={onSelect} />);
    clickCentreOf(menu, "trigger");
    clickCentreOf(menu, "share");

    clickCentreOf(menu, "copy-link");

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("copy-link");
    await waitFor(() =>
      expect(menu.renderer.findByTestId("submenu")).toBeUndefined(),
    );
    await waitFor(() =>
      expect(menu.renderer.findByTestId("menu")).toBeUndefined(),
    );

    menu.unmount();
  });

  it("closes one level on Escape and returns focus to the sub trigger", async () => {
    const menu = renderComponent(<WithSubmenus onSelect={vi.fn()} />);
    clickCentreOf(menu, "trigger");
    clickCentreOf(menu, "share");

    menu.renderer.simulateKeystrokes("escape");

    await waitFor(() =>
      expect(menu.renderer.findByTestId("submenu")).toBeUndefined(),
    );
    expect(menu.renderer.findByTestId("menu")).toBeDefined();
    expect(focusedTestId(menu)).toEqual(Option.some("share"));

    menu.renderer.simulateKeystrokes("escape");
    await waitFor(() =>
      expect(menu.renderer.findByTestId("menu")).toBeUndefined(),
    );
    expect(focusedTestId(menu)).toEqual(Option.some("trigger"));

    menu.unmount();
  });

  it("closes one level on ArrowLeft and keeps the parent menu", async () => {
    const menu = renderComponent(<WithSubmenus onSelect={vi.fn()} />);
    clickCentreOf(menu, "trigger");
    clickCentreOf(menu, "share");

    menu.renderer.simulateKeystrokes("left");

    await waitFor(() =>
      expect(menu.renderer.findByTestId("submenu")).toBeUndefined(),
    );
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

  it("keeps at most one submenu open", async () => {
    const menu = renderComponent(<WithSubmenus onSelect={vi.fn()} />);
    clickCentreOf(menu, "trigger");
    clickCentreOf(menu, "share");

    clickCentreOf(menu, "export");

    await waitFor(() =>
      expect(menu.renderer.findByTestId("submenu")).toBeUndefined(),
    );
    expect(menu.renderer.findByTestId("export-menu")).toBeDefined();

    menu.unmount();
  });

  it("closes the submenu when the pointer moves onto another row", async () => {
    const menu = renderComponent(<WithSubmenus onSelect={vi.fn()} />);
    clickCentreOf(menu, "trigger");
    hoverCentreOf(menu, "share");
    expect(menu.renderer.findByTestId("submenu")).toBeDefined();

    hoverCentreOf(menu, "rename");

    await waitFor(() =>
      expect(menu.renderer.findByTestId("submenu")).toBeUndefined(),
    );
    expect(menu.renderer.findByTestId("menu")).toBeDefined();

    menu.unmount();
  });

  it("closes both levels on an outside press", async () => {
    const menu = renderComponent(<WithSubmenus onSelect={vi.fn()} />);
    clickCentreOf(menu, "trigger");
    clickCentreOf(menu, "share");

    clickCentreOf(menu, "elsewhere");

    await waitFor(() =>
      expect(menu.renderer.findByTestId("submenu")).toBeUndefined(),
    );
    await waitFor(() =>
      expect(menu.renderer.findByTestId("menu")).toBeUndefined(),
    );

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
