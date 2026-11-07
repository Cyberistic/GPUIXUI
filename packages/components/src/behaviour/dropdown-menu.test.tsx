import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { PublicInstance } from "@gpuix/react";
import {
  contrastFloors,
  contrastFloorsFor,
  contrastRatio,
  decorativeFloor,
  extendTheme,
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

    await Promise.resolve();

    clickCentreOf(menu, "trigger");
    expect(menu.renderer.findByTestId("menu")).toBeDefined();
    clickCentreOf(menu, "trigger");
    await waitFor(() =>
      expect(menu.renderer.findByTestId("menu")).toBeUndefined(),
    );

    menu.unmount();
  });

  it("closes on a second press of the trigger, and not by reopening", async () => {
    const menu = renderComponent(<FileActions onSelect={vi.fn()} />);

    clickCentreOf(menu, "trigger");
    expect(menu.renderer.findByTestId("menu")).toBeDefined();

    clickCentreOf(menu, "trigger");
    await waitFor(() =>
      expect(menu.renderer.findByTestId("menu")).toBeUndefined(),
    );

    clickCentreOf(menu, "trigger");
    expect(menu.renderer.findByTestId("menu")).toBeDefined();

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

    expect(menu.renderer.findByTestId("menu")).toBeDefined();
    menu.renderer.nativeSimulateClick(
      surface.x + surface.width / 2,
      surface.y + surface.height / 2,
    );
    expect(onBehind).not.toHaveBeenCalled();

    await waitFor(() =>
      expect(menu.renderer.findByTestId("menu")).toBeUndefined(),
    );

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

    expect(
      menu.renderer.findByTestId("hidden")?.customProps?.["aria-selected"],
    ).toBe(true);
    expect(
      nodesWithRole(menu.renderer, "image").map((node) => node.name),
    ).toContain("Checked");

    menu.unmount();
  });

  it("paints the checked mark in a role the mark floor measures", () => {
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

    expect(
      contrastRatio(lightTheme.colors.accent, lightTheme.colors.popover) ?? 0,
    ).toBeLessThan(contrastFloors.boundary);

    menu.unmount();
  });

  it("paints no emphasis bar on a highlighted row, in any style", () => {
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

      const row = menu.renderer.findByTestId("rename")?.style;

      menu.unmount();

      expect(row?.borderLeftWidth ?? 0).toBe(0);
      expect(row?.borderColor).toBeUndefined();

      expect(
        contrastRatio(theme.colors.accent, theme.colors.hover) ?? 0,
      ).toBeLessThan(contrastFloorsFor(theme).boundary);
    });
  });

  it("paints a row press the highlight it replaces can show", () => {
    const macOSLight = extendTheme(platformTheme(lightTheme, "darwin"), {
      interaction: "pointer",
    });
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

    expect(
      contrastRatio(macOSLight.colors.active, macOSLight.colors.hover) ?? 0,
    ).toBeLessThan(decorativeFloor);
  });

  it("highlights an AppKit row in the accent with the accent's ink", () => {
    const mac = platformTheme(lightTheme, "darwin");
    const menu = renderComponent(<FileActions onSelect={vi.fn()} />, mac);
    clickCentreOf(menu, "trigger");
    hoverCentreOf(menu, "rename");

    const style = menu.renderer.findByTestId("rename")?.style;

    menu.unmount();

    expect(style?.hover).toMatchObject({
      backgroundColor: mac.colors.primary,
      color: mac.colors.primaryForeground,
    });
  });

  it("toggles a checkbox row once while Enter is held", () => {
    const onCheckedChange = vi.fn();
    const menu = renderComponent(
      <FileActions onSelect={vi.fn()} onCheckedChange={onCheckedChange} />,
    );
    clickCentreOf(menu, "trigger");

    menu.renderer.simulateKeystrokes("down down");
    expect(focusedTestId(menu)).toEqual(Option.some("hidden"));

    const row = menu.renderer.findByTestId("hidden");
    expect(row).toBeDefined();
    if (row === undefined) return;

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

  it("keeps a stored tone name it does not carry paintable", () => {
    const onSelect = vi.fn();
    const menu = renderComponent(
      <DropdownMenu>
        <DropdownMenuTrigger testId="trigger">Actions</DropdownMenuTrigger>
        <DropdownMenuContent testId="menu" label="File actions">
          <DropdownMenuItem
            testId="delete"
            // @ts-expect-error a stored name is not the union's literal
            tone="danger"
            onSelect={onSelect}
          >
            Delete
          </DropdownMenuItem>
          <DropdownMenuItem testId="delete-strong" tone="destructive">
            Move to trash
          </DropdownMenuItem>
          <DropdownMenuItem
            testId="delete-null"
            // @ts-expect-error a store writes `null` for a field it never set
            tone={null}
            onSelect={onSelect}
          >
            Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    try {
      clickCentreOf(menu, "trigger");

      Arr.forEach(["delete", "delete-null"], (id) => {
        const row = menu.renderer.findByTestId(id);
        expect(row, id).toBeDefined();
        expect(row?.style.color, id).toBe(darkTheme.colors.popoverForeground);
        expect(row?.style.color, id).not.toBe(
          darkTheme.colors.destructiveSoftForeground,
        );
      });

      expect(menu.renderer.findByTestId("delete-strong")?.style.color).toBe(
        darkTheme.colors.destructiveSoftForeground,
      );

      clickCentreOf(menu, "delete");
      expect(onSelect).toHaveBeenCalledTimes(1);
    } finally {
      menu.unmount();
    }
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

  it("opens on hover, after Base UI's rest, and focuses the first row", async () => {
    const menu = renderComponent(<WithSubmenus onSelect={vi.fn()} />);
    clickCentreOf(menu, "trigger");

    hoverCentreOf(menu, "share");

    await waitFor(() =>
      expect(menu.renderer.findByTestId("submenu")).toBeDefined(),
    );
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
    await waitFor(() =>
      expect(menu.renderer.findByTestId("submenu")).toBeDefined(),
    );

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

    menu.renderer.simulateKeystrokes("e");

    expect(focusedTestId(menu)).toEqual(Option.some("email"));

    menu.unmount();
  });
});
