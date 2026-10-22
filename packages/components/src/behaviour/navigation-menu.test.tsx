/**
 * NavigationMenu behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: two panels open at once, a panel that does not report
 * `aria-expanded`, ArrowDown that opens without taking focus into the panel,
 * Left/Right that open instead of moving, Escape that closes the nav without
 * returning focus, an outside press that does nothing, a controlled nav that
 * opens on its own, a hover policy that opens instantly, never closes, drops
 * the panel while the pointer crosses into it, or springs a pressed-closed panel
 * back open from a stale timer — and a panel that vanishes on dismiss instead of
 * running its exit, keeps taking presses while it leaves, or travels under a
 * reduced-motion preference.
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
  after,
  clickCentreOf,
  focusedTestId,
  hoverCentreOf,
  requireBounds,
  waitFor,
} from "../internal/interaction.js";
import { MotionProvider } from "../motion.js";
import { renderComponent } from "../internal/test-root.js";
import { Button } from "../internal/button.js";

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

  it("keeps exactly one panel open", async () => {
    const nav = renderComponent(<Workspace />);

    clickCentreOf(nav, "trigger-platform");
    clickCentreOf(nav, "trigger-pricing");

    // The switch is a state change at once: the first trigger no longer says it
    // is expanded, and the panel it owned is on its way out rather than open.
    expect(
      nav.renderer.findByTestId("trigger-platform")?.customProps,
    ).toMatchObject({ "aria-expanded": false });
    expect(nav.renderer.findByTestId("panel-pricing")).toBeDefined();

    await waitFor(() =>
      expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined(),
    );

    nav.unmount();
  });

  it("opens with Enter and ArrowDown, and ArrowDown takes focus into the panel", async () => {
    const nav = renderComponent(<Workspace />);
    nav.renderer.focusElement(
      nav.renderer.findByTestId("trigger-platform")?.id ?? -1,
    );

    nav.renderer.simulateKeystrokes("enter");
    expect(nav.renderer.findByTestId("panel-platform")).toBeDefined();

    nav.renderer.simulateKeystrokes("escape");
    await waitFor(() =>
      expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined(),
    );

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

  it("closes on Escape and returns focus to the trigger", async () => {
    const nav = renderComponent(<Workspace />);
    clickCentreOf(nav, "trigger-platform");

    nav.renderer.simulateKeystrokes("escape");

    // The state is settled at once: the trigger is collapsed and focus is back.
    expect(
      nav.renderer.findByTestId("trigger-platform")?.customProps,
    ).toMatchObject({ "aria-expanded": false });
    expect(focusedTestId(nav)).toEqual(Option.some("trigger-platform"));

    await waitFor(() =>
      expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined(),
    );

    nav.unmount();
  });

  it("closes on an outside press", async () => {
    const nav = renderComponent(<Workspace />);
    clickCentreOf(nav, "trigger-platform");

    nav.renderer.nativeSimulateClick(12, 12);

    await waitFor(() =>
      expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined(),
    );

    nav.unmount();
  });

  it("runs a link once and closes the panel", async () => {
    const onSelect = vi.fn();
    const nav = renderComponent(<Workspace onSelect={onSelect} />);
    clickCentreOf(nav, "trigger-platform");

    clickCentreOf(nav, "link-overview");

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("overview");

    await waitFor(() =>
      expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined(),
    );

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

    await waitFor(() =>
      expect(nav.renderer.findByTestId("panel-platform")).toBeDefined(),
    );

    nav.unmount();
  });

  it("keeps the panel open while the pointer crosses into it, and closes after leaving both", async () => {
    const nav = renderComponent(<Workspace />);

    hoverCentreOf(nav, "trigger-platform");
    await waitFor(() =>
      expect(nav.renderer.findByTestId("panel-platform")).toBeDefined(),
    );

    hoverPanel(nav, "panel-platform");
    await after(60);
    expect(nav.renderer.findByTestId("panel-platform")).toBeDefined();

    hoverCentreOf(nav, "elsewhere");
    await waitFor(() =>
      expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined(),
    );

    nav.unmount();
  });

  it("switches panels when the pointer moves between triggers", async () => {
    const nav = renderComponent(<Workspace />);

    hoverCentreOf(nav, "trigger-platform");
    await waitFor(() =>
      expect(nav.renderer.findByTestId("panel-platform")).toBeDefined(),
    );

    hoverCentreOf(nav, "trigger-pricing");
    await waitFor(() => {
      expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined();
      expect(nav.renderer.findByTestId("panel-pricing")).toBeDefined();
    });

    nav.unmount();
  });

  it("lets an explicit key win over a pending hover open", async () => {
    const nav = renderComponent(<Workspace />);

    hoverCentreOf(nav, "trigger-platform");
    nav.renderer.focusElement(
      nav.renderer.findByTestId("trigger-pricing")?.id ?? -1,
    );
    nav.renderer.simulateKeystrokes("down");
    await waitFor(() =>
      expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined(),
    );

    // The stale hover timer is gone for good: the pricing panel is still the
    // open one a full open-delay later.
    await after(60);
    expect(nav.renderer.findByTestId("panel-pricing")).toBeDefined();
    expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined();

    nav.unmount();
  });

  it("does not reopen a panel a press closed", async () => {
    const nav = renderComponent(<Workspace />);

    hoverCentreOf(nav, "trigger-platform");
    await waitFor(() =>
      expect(nav.renderer.findByTestId("panel-platform")).toBeDefined(),
    );
    clickCentreOf(nav, "trigger-platform");
    await waitFor(() =>
      expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined(),
    );

    await after(60);
    expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined();

    nav.unmount();
  });

  it("stays closed after Escape even while the pointer rests on the trigger", async () => {
    const nav = renderComponent(<Workspace />);

    hoverCentreOf(nav, "trigger-platform");
    await waitFor(() =>
      expect(nav.renderer.findByTestId("panel-platform")).toBeDefined(),
    );
    nav.renderer.simulateKeystrokes("escape");
    await waitFor(() =>
      expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined(),
    );
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
    await waitFor(() => expect(onValueChange).toHaveBeenCalledWith("platform"));
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

describe("NavigationMenu motion", () => {
  it("travels 4px toward its trigger and settles there", async () => {
    const nav = renderComponent(<Workspace />);
    nav.renderer.clockPause();
    clickCentreOf(nav, "trigger-platform");
    await after(30);
    const entering = requireBounds(nav, "panel-platform").y;

    nav.renderer.clockFastForward(300);
    await after(30);

    // A panel below its trigger enters from the trigger's side, then stops.
    expect(requireBounds(nav, "panel-platform").y - entering).toBe(4);

    nav.unmount();
  });

  it("stays painted for its exit without taking the pointer, then unmounts", async () => {
    const onBehind = vi.fn();
    const nav = renderComponent(
      <div
        style={{
          display: "flex",
          position: "relative",
          width: 800,
          height: 600,
          padding: 40,
        }}
      >
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
        <Workspace />
      </div>,
    );
    clickCentreOf(nav, "trigger-platform");
    await waitFor(() =>
      expect(nav.renderer.findByTestId("panel-platform")).toBeDefined(),
    );
    const surface = requireBounds(nav, "panel-platform");

    nav.renderer.simulateKeystrokes("escape");
    await after(30);

    // The box is still painted while it fades, but it is no longer a target...
    const leaving = nav.renderer.findByTestId("panel-platform");
    expect(leaving).toBeDefined();
    expect(leaving?.style.pointerEvents).toBe("none");
    // ...so a press inside the box belongs to the control under it now.
    nav.renderer.nativeSimulateClick(
      surface.x + surface.width / 2,
      surface.y + surface.height / 2,
    );
    expect(onBehind).toHaveBeenCalledTimes(1);

    await waitFor(() =>
      expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined(),
    );

    nav.unmount();
  });

  it("paints its resting frame with no travel under reduced motion", async () => {
    const nav = renderComponent(
      <MotionProvider preference="reduced">
        <Workspace />
      </MotionProvider>,
    );
    nav.renderer.clockPause();
    clickCentreOf(nav, "trigger-platform");
    await after(30);
    const resting = requireBounds(nav, "panel-platform").y;

    nav.renderer.clockFastForward(300);
    await after(30);
    expect(requireBounds(nav, "panel-platform").y).toBe(resting);

    nav.renderer.simulateKeystrokes("escape");
    await waitFor(() =>
      expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined(),
    );

    nav.unmount();
  });
});
