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
import * as Arr from "effect/Array";
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
  pressKey,
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

/**
 * Walk the window's Tab order: focus `from`, then take `steps` stops in turn.
 *
 * The runtime decides the order element by element, so this is the only route a
 * suite can ask which painted controls a reader can Tab to.
 */
const tabWalk = (
  root: ReturnType<typeof renderComponent>,
  from: string,
  steps: number,
): ReadonlyArray<string> => {
  const start = root.renderer.findByTestId(from);
  if (start !== undefined) root.renderer.focusElement(start.id);
  return Arr.makeBy(steps, () => {
    root.renderer.focusNext();
    return Option.getOrElse(focusedTestId(root), () => "none");
  });
};

/** A two-item product nav, with an inert target far to the right. */
const Workspace = ({
  value,
  onValueChange,
  onSelect,
  onActivate,
  onClick,
  disabled = false,
  openDelay = 20,
}: {
  readonly value?: string | null;
  readonly onValueChange?: (value: string | null) => void;
  readonly onSelect?: (value: string) => void;
  readonly onActivate?: () => void;
  readonly onClick?: () => void;
  readonly disabled?: boolean;
  readonly openDelay?: number;
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
      openDelay={openDelay}
      closeDelay={20}
    >
      <NavigationMenuList>
        <NavigationMenuItem value="platform">
          <NavigationMenuTrigger testId="trigger-platform" disabled={disabled}>
            Platform
          </NavigationMenuTrigger>
          <NavigationMenuContent testId="panel-platform">
            <NavigationMenuLink
              testId="link-overview"
              onSelect={() => onSelect?.("overview")}
              {...(onActivate === undefined
                ? {}
                : { onActivate: () => onActivate() })}
              {...(onClick === undefined ? {} : { onClick: () => onClick() })}
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

  it("cancels a hover open when the trigger is disabled before the delay", async () => {
    // The trigger can be disabled between the pointer's entry and the delay's
    // end; the armed timer used to open anyway, mounting the panel over a
    // control that refuses every route.
    const nav = renderComponent(<Workspace openDelay={120} />);

    try {
      hoverCentreOf(nav, "trigger-platform");
      await after(30);
      expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined();

      nav.rerender(<Workspace openDelay={120} disabled />);
      await after(150);

      expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined();
    } finally {
      nav.unmount();
    }
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

  it("runs the focused link's action on Enter, then closes the panel", async () => {
    const onActivate = vi.fn();
    const onClick = vi.fn();
    const nav = renderComponent(
      <Workspace onActivate={onActivate} onClick={onClick} />,
    );
    clickCentreOf(nav, "trigger-platform");
    nav.renderer.focusElement(
      nav.renderer.findByTestId("link-overview")?.id ?? -1,
    );

    pressKey(nav, "enter");

    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined(),
    );

    nav.unmount();
  });

  it("runs a link's deprecated onClick when it is the only handler", async () => {
    const onClick = vi.fn();
    const nav = renderComponent(<Workspace onClick={onClick} />);
    clickCentreOf(nav, "trigger-platform");
    nav.renderer.focusElement(
      nav.renderer.findByTestId("link-overview")?.id ?? -1,
    );

    pressKey(nav, "enter");

    expect(onClick).toHaveBeenCalledTimes(1);
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
    // ...and its links keep their own hitboxes, so the seam's shield takes the
    // press rather than the page underneath receiving it mid-exit.
    nav.renderer.nativeSimulateClick(
      surface.x + surface.width / 2,
      surface.y + surface.height / 2,
    );
    expect(onBehind).not.toHaveBeenCalled();

    await waitFor(() =>
      expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined(),
    );
    nav.renderer.nativeSimulateClick(
      surface.x + surface.width / 2,
      surface.y + surface.height / 2,
    );
    expect(onBehind).toHaveBeenCalledTimes(1);

    nav.unmount();
  });

  it("keeps a dismissed panel's links out of the window's tab order", async () => {
    // The bug this guards: a dismissed panel stays painted for its 200 ms exit
    // (`PresenceShield` takes the presses), but the runtime decides its Tab order
    // element by element, and neither the surface's `pointerEvents` nor the shield
    // reaches a descendant's `tabIndex`. So a reader who pressed Escape and then
    // Tabbed landed on a link of the panel that unmounted under the keyboard —
    // the same defect the menu family fixed for its rows (`MenuLeaving`). Every
    // link of a panel that is only painted for its exit drops its own stop.
    const nav = renderComponent(<Workspace />);
    try {
      nav.renderer.focusElement(
        nav.renderer.findByTestId("trigger-platform")?.id ?? -1,
      );
      nav.renderer.simulateKeystrokes("down");
      await waitFor(() =>
        expect(nav.renderer.findByTestId("panel-platform")).toBeDefined(),
      );
      // While the panel is open its links are stops, or the ghost walk below
      // would pass by reading a tree that never had them.
      expect(tabWalk(nav, "trigger-platform", 6)).toContain("link-overview");

      nav.renderer.focusElement(
        nav.renderer.findByTestId("trigger-platform")?.id ?? -1,
      );
      nav.renderer.simulateKeystrokes("escape");
      await after(30);

      expect(focusedTestId(nav)).toEqual(Option.some("trigger-platform"));
      expect(nav.renderer.findByTestId("panel-platform")).toBeDefined();

      const ghost = tabWalk(nav, "trigger-platform", 6);
      expect(ghost).not.toContain("link-overview");
      expect(ghost).not.toContain("link-runtime");
    } finally {
      nav.unmount();
    }
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
