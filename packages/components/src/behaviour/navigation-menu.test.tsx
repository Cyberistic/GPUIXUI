/**
 * NavigationMenu behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: two panels open at once, a panel that does not report
 * `aria-expanded`, ArrowDown that opens without taking focus into the panel,
 * Left/Right that open instead of moving, Escape that closes the nav without
 * returning focus, an outside press that does nothing, a controlled nav that
 * opens on its own, and a hover policy that opens instantly, never closes, drops
 * the panel while the pointer crosses into it, or springs a pressed-closed panel
 * back open from a stale timer.
 */

import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "../navigation-menu.js";
import { darkTheme, lightTheme } from "../internal/theme.js";
import {
  clickCentreOf,
  focusedTestId,
  hoverCentreOf,
  requireBounds,
} from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";

/** Wait for a component timer (real timers, kept short by the props). */
const after = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Move the pointer into the open panel's padding, not onto a child. */
const hoverPanel = (
  root: ReturnType<typeof renderComponent>,
  testId: string,
): void => {
  const bounds = requireBounds(root, testId);
  root.renderer.nativeSimulateMouseMove(bounds.x + 10, bounds.y + 10);
};

/** A two-item product nav, with an inert target far to the right. */
const Workspace = ({
  value,
  onValueChange,
  onSelect,
}: {
  readonly value?: string | null;
  readonly onValueChange?: (value: string | null) => void;
  readonly onSelect?: (value: string) => void;
}) => (
  <div
    style={{
      display: "flex",
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 300,
      padding: 40,
    }}
  >
    <NavigationMenu
      label="Product"
      value={value}
      onValueChange={onValueChange}
      openDelay={20}
      closeDelay={20}
    >
      <NavigationMenuList>
        <NavigationMenuItem value="platform">
          <NavigationMenuTrigger testId="trigger-platform">
            Platform
          </NavigationMenuTrigger>
          <NavigationMenuContent testId="panel-platform">
            <NavigationMenuLink
              testId="link-overview"
              onSelect={() => onSelect?.("overview")}
            >
              Overview
            </NavigationMenuLink>
            <NavigationMenuLink
              testId="link-runtime"
              onSelect={() => onSelect?.("runtime")}
            >
              Runtime
            </NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem value="pricing">
          <NavigationMenuTrigger testId="trigger-pricing">
            Pricing
          </NavigationMenuTrigger>
          <NavigationMenuContent testId="panel-pricing">
            <NavigationMenuLink
              testId="link-plans"
              onSelect={() => onSelect?.("plans")}
            >
              Plans
            </NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
    <div testId="elsewhere" tabIndex={0} style={{ width: 120, height: 20 }}>
      Elsewhere
    </div>
  </div>
);

describe("NavigationMenu", () => {
  it("keeps a disabled trigger from opening on hover, press or key", async () => {
    const nav = renderComponent(
      <NavigationMenu label="Product" openDelay={20} closeDelay={20}>
        <NavigationMenuList>
          <NavigationMenuItem value="platform">
            <NavigationMenuTrigger testId="trigger-platform" disabled>
              Platform
            </NavigationMenuTrigger>
            <NavigationMenuContent testId="panel-platform">
              <NavigationMenuLink testId="link-overview">
                Overview
              </NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );
    const trigger = nav.renderer.findByTestId("trigger-platform");

    expect(trigger?.customProps?.tabIndex).toBe(-1);

    hoverCentreOf(nav, "trigger-platform");
    await after(40);
    clickCentreOf(nav, "trigger-platform");
    nav.renderer.focusElement(trigger?.id ?? -1);
    nav.renderer.simulateKeystrokes("down");

    expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined();

    nav.unmount();
  });

  it("renders the triggers in order and no panel until one opens", () => {
    const nav = renderComponent(<Workspace />);

    expect(nav.renderer.getAllText()).toEqual([
      "Platform",
      "Pricing",
      "Elsewhere",
    ]);
    expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined();
    expect(nav.renderer.findByTestId("panel-pricing")).toBeUndefined();

    nav.unmount();
  });

  it("opens a panel on a press and reports aria-expanded", () => {
    const nav = renderComponent(<Workspace />);

    clickCentreOf(nav, "trigger-platform");

    expect(nav.renderer.findByTestId("panel-platform")).toBeDefined();
    expect(
      nav.renderer.findByTestId("trigger-platform")?.customProps,
    ).toMatchObject({ "aria-expanded": true });

    nav.unmount();
  });

  it("keeps exactly one panel open", () => {
    const nav = renderComponent(<Workspace />);

    clickCentreOf(nav, "trigger-platform");
    clickCentreOf(nav, "trigger-pricing");

    expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined();
    expect(nav.renderer.findByTestId("panel-pricing")).toBeDefined();

    nav.unmount();
  });

  it("opens with Enter and ArrowDown, and ArrowDown takes focus into the panel", () => {
    const nav = renderComponent(<Workspace />);
    nav.renderer.focusElement(
      nav.renderer.findByTestId("trigger-platform")?.id ?? -1,
    );

    nav.renderer.simulateKeystrokes("enter");
    expect(nav.renderer.findByTestId("panel-platform")).toBeDefined();

    nav.renderer.simulateKeystrokes("escape");
    expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined();

    nav.renderer.focusElement(
      nav.renderer.findByTestId("trigger-platform")?.id ?? -1,
    );
    nav.renderer.simulateKeystrokes("down");
    expect(nav.renderer.findByTestId("panel-platform")).toBeDefined();
    expect(focusedTestId(nav)).toEqual(Option.some("panel-platform"));

    nav.unmount();
  });

  it("moves between triggers with Left, Right, Home and End without opening", () => {
    const nav = renderComponent(<Workspace />);
    nav.renderer.focusElement(
      nav.renderer.findByTestId("trigger-platform")?.id ?? -1,
    );

    nav.renderer.simulateKeystrokes("right");
    expect(focusedTestId(nav)).toEqual(Option.some("trigger-pricing"));

    nav.renderer.simulateKeystrokes("left");
    expect(focusedTestId(nav)).toEqual(Option.some("trigger-platform"));

    nav.renderer.simulateKeystrokes("end");
    expect(focusedTestId(nav)).toEqual(Option.some("trigger-pricing"));

    nav.renderer.simulateKeystrokes("home");
    expect(focusedTestId(nav)).toEqual(Option.some("trigger-platform"));
    expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined();

    nav.unmount();
  });

  it("closes on Escape and returns focus to the trigger", () => {
    const nav = renderComponent(<Workspace />);
    clickCentreOf(nav, "trigger-platform");

    nav.renderer.simulateKeystrokes("escape");

    expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined();
    expect(focusedTestId(nav)).toEqual(Option.some("trigger-platform"));

    nav.unmount();
  });

  it("closes on an outside press", () => {
    const nav = renderComponent(<Workspace />);
    clickCentreOf(nav, "trigger-platform");

    nav.renderer.nativeSimulateClick(12, 12);

    expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined();

    nav.unmount();
  });

  it("runs a link once and closes the panel", () => {
    const onSelect = vi.fn();
    const nav = renderComponent(<Workspace onSelect={onSelect} />);
    clickCentreOf(nav, "trigger-platform");

    clickCentreOf(nav, "link-overview");

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("overview");
    expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined();

    nav.unmount();
  });

  it("reports the open change and lets a controlled nav stay closed", () => {
    const onValueChange = vi.fn();
    const nav = renderComponent(
      <Workspace value={null} onValueChange={onValueChange} />,
    );

    clickCentreOf(nav, "trigger-platform");

    expect(onValueChange).toHaveBeenCalledWith("platform");
    expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined();

    nav.unmount();
  });

  it("opens on hover only after the delay", async () => {
    const nav = renderComponent(<Workspace />);

    hoverCentreOf(nav, "trigger-platform");
    expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined();

    await after(40);
    expect(nav.renderer.findByTestId("panel-platform")).toBeDefined();

    nav.unmount();
  });

  it("keeps the panel open while the pointer crosses into it, and closes after leaving both", async () => {
    const nav = renderComponent(<Workspace />);

    hoverCentreOf(nav, "trigger-platform");
    await after(40);
    expect(nav.renderer.findByTestId("panel-platform")).toBeDefined();

    hoverPanel(nav, "panel-platform");
    await after(60);
    expect(nav.renderer.findByTestId("panel-platform")).toBeDefined();

    hoverCentreOf(nav, "elsewhere");
    await after(60);
    expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined();

    nav.unmount();
  });

  it("switches panels when the pointer moves between triggers", async () => {
    const nav = renderComponent(<Workspace />);

    hoverCentreOf(nav, "trigger-platform");
    await after(40);
    expect(nav.renderer.findByTestId("panel-platform")).toBeDefined();

    hoverCentreOf(nav, "trigger-pricing");
    await after(40);

    expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined();
    expect(nav.renderer.findByTestId("panel-pricing")).toBeDefined();

    nav.unmount();
  });

  it("lets an explicit key win over a pending hover open", async () => {
    const nav = renderComponent(<Workspace />);

    hoverCentreOf(nav, "trigger-platform");
    nav.renderer.focusElement(
      nav.renderer.findByTestId("trigger-pricing")?.id ?? -1,
    );
    nav.renderer.simulateKeystrokes("down");
    await after(40);

    expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined();
    expect(nav.renderer.findByTestId("panel-pricing")).toBeDefined();

    nav.unmount();
  });

  it("does not reopen a panel a press closed", async () => {
    const nav = renderComponent(<Workspace />);

    hoverCentreOf(nav, "trigger-platform");
    await after(40);
    clickCentreOf(nav, "trigger-platform");
    expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined();

    await after(60);
    expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined();

    nav.unmount();
  });

  it("stays closed after Escape even while the pointer rests on the trigger", async () => {
    const nav = renderComponent(<Workspace />);

    hoverCentreOf(nav, "trigger-platform");
    await after(40);
    nav.renderer.simulateKeystrokes("escape");
    await after(60);

    expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined();

    nav.unmount();
  });

  it("reports a hover open and lets a controlled nav stay closed", async () => {
    const onValueChange = vi.fn();
    const nav = renderComponent(
      <Workspace value={null} onValueChange={onValueChange} />,
    );

    hoverCentreOf(nav, "trigger-platform");
    await after(40);

    expect(onValueChange).toHaveBeenCalledWith("platform");
    expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined();

    nav.unmount();
  });

  it("reads the panel surface from whichever theme is active", () => {
    const light = renderComponent(<Workspace />, "light");
    clickCentreOf(light, "trigger-platform");
    expect(
      light.renderer.findByTestId("panel-platform")?.style.backgroundColor,
    ).toBe(lightTheme.colors.popover);
    light.unmount();

    const dark = renderComponent(<Workspace />);
    clickCentreOf(dark, "trigger-platform");
    expect(
      dark.renderer.findByTestId("panel-platform")?.style.backgroundColor,
    ).toBe(darkTheme.colors.popover);
    dark.unmount();
  });
});
