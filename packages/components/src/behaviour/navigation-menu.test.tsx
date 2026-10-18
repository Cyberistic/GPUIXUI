/**
 * NavigationMenu behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: two panels open at once, a panel that does not report
 * `aria-expanded`, ArrowDown that opens without taking focus into the panel,
 * Left/Right that open instead of moving, Escape that closes the nav without
 * returning focus, an outside press that does nothing, a controlled nav that
 * opens on its own, a hover that opens instantly or never, a hover that steals
 * focus, a panel that closes while the pointer travels into it, a disabled
 * trigger that opens on hover, and `openOnHover={false}` that still opens.
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
} from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";

/** Wait for a component timer (real timers, kept short by the props). */
const after = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** A two-item product nav, with an inert target far to the right. */
const Workspace = ({
  value,
  onValueChange,
  onSelect,
  openOnHover,
  openDelay,
  closeDelay,
  platformDisabled,
}: {
  readonly value?: string | null;
  readonly onValueChange?: (value: string | null) => void;
  readonly onSelect?: (value: string) => void;
  readonly openOnHover?: boolean;
  readonly openDelay?: number;
  readonly closeDelay?: number;
  readonly platformDisabled?: boolean;
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
      openOnHover={openOnHover}
      openDelay={openDelay}
      closeDelay={closeDelay}
    >
      <NavigationMenuList>
        <NavigationMenuItem value="platform">
          <NavigationMenuTrigger
            testId="trigger-platform"
            disabled={platformDisabled}
          >
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

  it("opens on hover after the delay without moving focus", async () => {
    const nav = renderComponent(<Workspace openDelay={20} closeDelay={20} />);

    hoverCentreOf(nav, "trigger-platform");
    expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined();

    await after(50);

    expect(nav.renderer.findByTestId("panel-platform")).toBeDefined();
    expect(
      nav.renderer.findByTestId("trigger-platform")?.customProps,
    ).toMatchObject({ "aria-expanded": true });
    expect(focusedTestId(nav)).toEqual(Option.none());

    nav.unmount();
  });

  it("switches panels when the pointer moves to another trigger", async () => {
    const nav = renderComponent(<Workspace openDelay={20} closeDelay={20} />);

    hoverCentreOf(nav, "trigger-platform");
    await after(50);
    expect(nav.renderer.findByTestId("panel-platform")).toBeDefined();

    hoverCentreOf(nav, "trigger-pricing");
    await after(50);

    expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined();
    expect(nav.renderer.findByTestId("panel-pricing")).toBeDefined();

    nav.unmount();
  });

  it("stays open while the pointer travels into the panel", async () => {
    const nav = renderComponent(<Workspace openDelay={20} closeDelay={40} />);

    hoverCentreOf(nav, "trigger-platform");
    await after(50);
    hoverCentreOf(nav, "panel-platform");
    await after(60);

    expect(nav.renderer.findByTestId("panel-platform")).toBeDefined();

    hoverCentreOf(nav, "elsewhere");
    await after(60);

    expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined();

    nav.unmount();
  });

  it("refuses the pointer when openOnHover is false but keeps press", async () => {
    const nav = renderComponent(
      <Workspace openOnHover={false} openDelay={20} closeDelay={20} />,
    );

    hoverCentreOf(nav, "trigger-platform");
    await after(50);
    expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined();

    clickCentreOf(nav, "trigger-platform");
    expect(nav.renderer.findByTestId("panel-platform")).toBeDefined();

    nav.unmount();
  });

  it("never opens a disabled trigger, by hover or by press", async () => {
    const nav = renderComponent(
      <Workspace openDelay={20} closeDelay={20} platformDisabled />,
    );

    hoverCentreOf(nav, "trigger-platform");
    await after(50);
    expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined();

    clickCentreOf(nav, "trigger-platform");
    expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined();

    nav.unmount();
  });

  it("lets a key-opened panel survive a close timer from the one before", async () => {
    const nav = renderComponent(<Workspace openDelay={20} closeDelay={60} />);

    hoverCentreOf(nav, "trigger-platform");
    await after(40);
    expect(nav.renderer.findByTestId("panel-platform")).toBeDefined();

    hoverCentreOf(nav, "elsewhere");
    nav.renderer.focusElement(
      nav.renderer.findByTestId("trigger-pricing")?.id ?? -1,
    );
    nav.renderer.simulateKeystrokes("enter");
    expect(nav.renderer.findByTestId("panel-pricing")).toBeDefined();

    await after(90);

    expect(nav.renderer.findByTestId("panel-pricing")).toBeDefined();

    nav.unmount();
  });

  it("reports one hover intent and stays closed when controlled", async () => {
    const onValueChange = vi.fn();
    const nav = renderComponent(
      <Workspace
        value={null}
        onValueChange={onValueChange}
        openDelay={20}
        closeDelay={20}
      />,
    );

    hoverCentreOf(nav, "trigger-platform");
    await after(50);

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("platform");
    expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined();

    nav.unmount();
  });
});
