/**
 * NavigationMenu behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: two panels open at once, a panel that does not report
 * `aria-expanded`, ArrowDown that opens without taking focus into the panel,
 * Left/Right that open instead of moving, Escape that closes the nav without
 * returning focus, an outside press that does nothing, a controlled nav that
 * opens on its own, a hover that opens instantly or never, a hover that steals
 * focus, a panel that closes while the pointer travels into it, a disabled
 * trigger that opens (on hover, on press, or on an arrow key) or moves focus
 * with the arrow keys, `openOnHover={false}` that still opens, a bottom
 * panel that covers its trigger at the window's edge, and a caller `ref` that is
 * discarded in favour of the internal panel ref. A held trigger press closed on
 * the press and re-opened on the release (plan 583). The panel was announced by
 * its item's internal value (`nav-platform-panel`) instead of the trigger's
 * visible label (`Platform`), so the one region the nav revealed had a name a
 * screen-reader user could not map to the trigger (plan 724). A malformed
 * `openDelay`/`closeDelay` ran its `setTimeout` at once, so the panel opened on
 * hover and closed before the pointer could travel into it (plan 763).
 */

import { describe, expect, it, vi } from "vitest";
import type { PublicInstance } from "@gpuix/react";
import { createRef, type ReactNode, type Ref } from "react";
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
import { nodesWithRole } from "../internal/a11y.js";
import { darkTheme, lightTheme } from "../internal/theme.js";
import {
  clickCentreOf,
  focusedTestId,
  hoverCentreOf,
  isShown,
  requireBounds,
  until,
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
  top = 40,
  contentRef,
}: {
  readonly value?: string | null;
  readonly onValueChange?: (value: string | null) => void;
  readonly onSelect?: (value: string) => void;
  readonly openOnHover?: boolean;
  readonly openDelay?: number;
  readonly closeDelay?: number;
  readonly platformDisabled?: boolean;
  /** Top padding, so a test can put the nav at the window's bottom edge. */
  readonly top?: number;
  /** A caller ref on the first panel. */
  readonly contentRef?: Ref<PublicInstance>;
}) => (
  <div
    style={{
      display: "flex",
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 300,
      paddingTop: top,
      paddingRight: 40,
      paddingBottom: 40,
      paddingLeft: 40,
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
          <NavigationMenuContent testId="panel-platform" ref={contentRef}>
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

/** One item whose panel name can be varied, over an opaque internal value. */
const NamedPanel = ({
  value,
  trigger,
  panelLabel,
}: {
  readonly value: string;
  readonly trigger?: ReactNode;
  readonly panelLabel?: string;
}) => (
  <div style={{ padding: 20 }}>
    <NavigationMenu label="Product">
      <NavigationMenuList>
        <NavigationMenuItem value={value}>
          <NavigationMenuTrigger testId="trigger-named">
            {trigger ?? "Platform"}
          </NavigationMenuTrigger>
          <NavigationMenuContent
            testId="panel-named"
            {...(panelLabel === undefined ? {} : { "aria-label": panelLabel })}
          >
            <NavigationMenuLink testId="link-named">
              Overview
            </NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  </div>
);

/** Two items whose first trigger label is the caller's. */
const RenamableNav = ({ firstLabel }: { readonly firstLabel: string }) => (
  <div style={{ padding: 20 }}>
    <NavigationMenu label="Product">
      <NavigationMenuList>
        <NavigationMenuItem value="first">
          <NavigationMenuTrigger testId="trigger-first">
            {firstLabel}
          </NavigationMenuTrigger>
          <NavigationMenuContent testId="panel-first">
            <NavigationMenuLink testId="link-first">
              Overview
            </NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem value="second">
          <NavigationMenuTrigger testId="trigger-second">
            Pricing
          </NavigationMenuTrigger>
          <NavigationMenuContent testId="panel-second">
            <NavigationMenuLink testId="link-second">Plans</NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem value="third">
          <NavigationMenuTrigger testId="trigger-third">
            Docs
          </NavigationMenuTrigger>
          <NavigationMenuContent testId="panel-third">
            <NavigationMenuLink testId="link-third">Guides</NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
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

  it("keeps focus in a panel whose close the caller refuses", () => {
    const onValueChange = vi.fn();
    const nav = renderComponent(
      <Workspace value="platform" onValueChange={onValueChange} />,
    );
    nav.renderer.focusElement(
      nav.renderer.findByTestId("link-overview")?.id ?? -1,
    );

    nav.renderer.simulateKeystrokes("escape");

    expect(onValueChange).toHaveBeenCalledWith(null);
    expect(nav.renderer.findByTestId("panel-platform")).toBeDefined();
    expect(focusedTestId(nav)).toEqual(Option.some("link-overview"));

    nav.unmount();
  });

  it("closes on an outside press", () => {
    const nav = renderComponent(<Workspace />);
    clickCentreOf(nav, "trigger-platform");

    nav.renderer.nativeSimulateClick(12, 12);

    expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined();

    nav.unmount();
  });

  it("stays closed after a held trigger press, and a new press opens it", async () => {
    const nav = renderComponent(<Workspace openOnHover={false} />);
    clickCentreOf(nav, "trigger-platform");
    expect(nav.renderer.findByTestId("panel-platform")).toBeDefined();

    const { x, y, width, height } = requireBounds(nav, "trigger-platform");
    nav.renderer.nativeSimulateMouseDown(x + width / 2, y + height / 2);
    // The runtime delivers the release in a later task; the old panel closed on
    // the press and the click re-opened it.
    await after(10);
    nav.renderer.nativeSimulateMouseUp(x + width / 2, y + height / 2);

    expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined();

    clickCentreOf(nav, "trigger-platform");

    expect(nav.renderer.findByTestId("panel-platform")).toBeDefined();

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

    await until(() => isShown(nav, "panel-platform"));

    expect(nav.renderer.findByTestId("panel-platform")).toBeDefined();
    expect(
      nav.renderer.findByTestId("trigger-platform")?.customProps,
    ).toMatchObject({ "aria-expanded": true });
    expect(focusedTestId(nav)).toEqual(Option.none());

    nav.unmount();
  });

  it("keeps the default open delay when openDelay is malformed", async () => {
    const nav = renderComponent(
      <Workspace openDelay={Number.NaN} closeDelay={20} />,
    );

    hoverCentreOf(nav, "trigger-platform");
    await after(30);
    // 30 ms is inside the default 100 ms; the old code ran the NaN timer
    // at once.
    expect(isShown(nav, "panel-platform")).toBe(false);

    await until(() => isShown(nav, "panel-platform"));
    expect(nav.renderer.findByTestId("panel-platform")).toBeDefined();

    nav.unmount();
  });

  it("keeps the default close delay when closeDelay is malformed", async () => {
    const nav = renderComponent(
      <Workspace openDelay={20} closeDelay={Number.NaN} />,
    );

    hoverCentreOf(nav, "trigger-platform");
    await until(() => isShown(nav, "panel-platform"));
    hoverCentreOf(nav, "elsewhere");
    await after(30);
    // The default 150 ms is still running; the old code closed at once, so the
    // pointer could not travel into the panel.
    expect(isShown(nav, "panel-platform")).toBe(true);

    await until(() => !isShown(nav, "panel-platform"));
    expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined();

    nav.unmount();
  });

  it("switches panels when the pointer moves to another trigger", async () => {
    const nav = renderComponent(<Workspace openDelay={20} closeDelay={20} />);

    hoverCentreOf(nav, "trigger-platform");
    await until(() => isShown(nav, "panel-platform"));
    expect(nav.renderer.findByTestId("panel-platform")).toBeDefined();

    hoverCentreOf(nav, "trigger-pricing");
    await until(() => isShown(nav, "panel-pricing"));

    expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined();
    expect(nav.renderer.findByTestId("panel-pricing")).toBeDefined();

    nav.unmount();
  });

  it("switches panels when the pointer leaves a panel for another trigger", async () => {
    const nav = renderComponent(<Workspace openDelay={20} closeDelay={20} />);

    hoverCentreOf(nav, "trigger-platform");
    await until(() => isShown(nav, "panel-platform"));
    hoverCentreOf(nav, "panel-platform");
    await after(30);

    hoverCentreOf(nav, "trigger-pricing");
    await until(() => isShown(nav, "panel-pricing"));

    expect(nav.renderer.findByTestId("panel-pricing")).toBeDefined();
    expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined();

    nav.unmount();
  });

  it("stays open while the pointer travels into the panel", async () => {
    const nav = renderComponent(<Workspace openDelay={20} closeDelay={40} />);

    hoverCentreOf(nav, "trigger-platform");
    await until(() => isShown(nav, "panel-platform"));
    hoverCentreOf(nav, "panel-platform");
    await after(60);

    expect(nav.renderer.findByTestId("panel-platform")).toBeDefined();

    hoverCentreOf(nav, "elsewhere");
    await until(() => !isShown(nav, "panel-platform"));

    expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined();

    nav.unmount();
  });

  it("refuses the pointer when openOnHover is false but keeps press", async () => {
    const nav = renderComponent(
      <Workspace openOnHover={false} openDelay={20} closeDelay={20} />,
    );

    hoverCentreOf(nav, "trigger-platform");
    await after(150);
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
    await after(150);
    expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined();

    clickCentreOf(nav, "trigger-platform");
    expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined();

    nav.unmount();
  });

  it("keeps a disabled link inert, including its hover", () => {
    // `NavigationMenuLink` always supplies a hover to the shared button, and the
    // caller's style merges last; an inert link must still not light up
    // (plan 691).
    const onSelect = vi.fn();
    const nav = renderComponent(
      <NavigationMenu label="Product" defaultValue="platform">
        <NavigationMenuList>
          <NavigationMenuItem value="platform">
            <NavigationMenuTrigger testId="trigger-platform">
              Platform
            </NavigationMenuTrigger>
            <NavigationMenuContent testId="panel-platform">
              <NavigationMenuLink
                testId="link-runtime"
                disabled
                onSelect={() => onSelect("runtime")}
              >
                Runtime
              </NavigationMenuLink>
              <NavigationMenuLink
                testId="link-overview"
                onSelect={() => onSelect("overview")}
              >
                Overview
              </NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );

    const disabled = nav.renderer.findByTestId("link-runtime");
    const enabled = nav.renderer.findByTestId("link-overview");

    expect(disabled?.style.hover).toBeUndefined();
    expect(disabled?.style.cursor).toBe("not-allowed");
    expect(disabled?.customProps?.["aria-description"]).toContain("Disabled");
    expect(enabled?.style.hover).toBeDefined();

    clickCentreOf(nav, "link-runtime");
    expect(onSelect).not.toHaveBeenCalled();

    clickCentreOf(nav, "link-overview");
    expect(onSelect).toHaveBeenCalledTimes(1);

    nav.unmount();
  });

  it("ignores arrow keys on a disabled trigger and still forwards the caller's", () => {
    const onKeyDown = vi.fn();
    const nav = renderComponent(
      <NavigationMenu label="Product">
        <NavigationMenuList>
          <NavigationMenuItem value="platform">
            <NavigationMenuTrigger
              testId="trigger-platform"
              disabled
              onKeyDown={onKeyDown}
            >
              Platform
            </NavigationMenuTrigger>
            <NavigationMenuContent testId="panel-platform">
              <text>Overview</text>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem value="pricing">
            <NavigationMenuTrigger testId="trigger-pricing">
              Pricing
            </NavigationMenuTrigger>
            <NavigationMenuContent testId="panel-pricing">
              <text>Plans</text>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );

    nav.renderer.focusElement(
      nav.renderer.findByTestId("trigger-platform")?.id ?? -1,
    );
    nav.renderer.simulateKeystrokes("down");
    expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined();
    expect(onKeyDown).toHaveBeenCalledTimes(1);

    nav.renderer.simulateKeystrokes("right");
    expect(focusedTestId(nav)).toEqual(Option.some("trigger-platform"));

    nav.unmount();
  });

  it("lets a key-opened panel survive a close timer from the one before", async () => {
    const nav = renderComponent(<Workspace openDelay={20} closeDelay={60} />);

    hoverCentreOf(nav, "trigger-platform");
    await until(() => isShown(nav, "panel-platform"));
    expect(nav.renderer.findByTestId("panel-platform")).toBeDefined();

    hoverCentreOf(nav, "elsewhere");
    nav.renderer.focusElement(
      nav.renderer.findByTestId("trigger-pricing")?.id ?? -1,
    );
    nav.renderer.simulateKeystrokes("enter");
    expect(nav.renderer.findByTestId("panel-pricing")).toBeDefined();

    await after(120);

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
    await until(() => onValueChange.mock.calls.length > 0);
    // Give a stray second timer time to fire before counting.
    await after(150);

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("platform");
    expect(nav.renderer.findByTestId("panel-platform")).toBeUndefined();

    nav.unmount();
  });

  it("flips a bottom panel above a trigger at the window's bottom edge", () => {
    const nav = renderComponent(<Workspace top={740} />);
    nav.renderer.focusElement(
      nav.renderer.findByTestId("trigger-platform")?.id ?? -1,
    );
    nav.renderer.simulateKeystrokes("enter");

    const trigger = requireBounds(nav, "trigger-platform");
    const panel = requireBounds(nav, "panel-platform");

    // The runtime snaps a bottom panel up into the window, over its trigger;
    // the measured placement flips it above instead.
    expect(
      panel.y + panel.height <= trigger.y ||
        panel.y >= trigger.y + trigger.height,
    ).toBe(true);
    expect(panel.y).toBeGreaterThanOrEqual(0);

    nav.unmount();
  });

  it("composes the caller's ref with the panel ref", () => {
    const ref = createRef<PublicInstance>();
    const nav = renderComponent(<Workspace contentRef={ref} />);
    nav.renderer.focusElement(
      nav.renderer.findByTestId("trigger-platform")?.id ?? -1,
    );
    nav.renderer.simulateKeystrokes("enter");

    expect(ref.current).not.toBeNull();
    expect(ref.current?.id).toBe(
      nav.renderer.findByTestId("panel-platform")?.id,
    );

    nav.unmount();
  });

  it("names a panel by its trigger's visible label, not its value", () => {
    const nav = renderComponent(<NamedPanel value="nav-platform-panel" />);
    nav.renderer.focusElement(
      nav.renderer.findByTestId("trigger-named")?.id ?? -1,
    );
    nav.renderer.simulateKeystrokes("enter");

    expect(
      Arr.map(nodesWithRole(nav.renderer, "group"), (n) => n.name),
    ).toEqual(["Platform"]);

    nav.unmount();
  });

  it("lets the caller's aria-label name the panel", () => {
    const nav = renderComponent(
      <NamedPanel value="nav-platform-panel" panelLabel="Platform menu" />,
    );
    nav.renderer.focusElement(
      nav.renderer.findByTestId("trigger-named")?.id ?? -1,
    );
    nav.renderer.simulateKeystrokes("enter");

    expect(
      Arr.map(nodesWithRole(nav.renderer, "group"), (n) => n.name),
    ).toEqual(["Platform menu"]);

    nav.unmount();
  });

  it("falls back to the item's value when the trigger has no plain text", () => {
    const nav = renderComponent(
      <NamedPanel
        value="nav-platform-panel"
        trigger={<div testId="glyph" style={{ width: 8, height: 8 }} />}
      />,
    );
    nav.renderer.focusElement(
      nav.renderer.findByTestId("trigger-named")?.id ?? -1,
    );
    nav.renderer.simulateKeystrokes("enter");

    expect(
      Arr.map(nodesWithRole(nav.renderer, "group"), (n) => n.name),
    ).toEqual(["nav-platform-panel"]);

    nav.unmount();
  });

  it("a renamed trigger updates its panel and keeps its registry place", () => {
    const nav = renderComponent(<RenamableNav firstLabel="Platform" />);
    nav.renderer.focusElement(
      nav.renderer.findByTestId("trigger-first")?.id ?? -1,
    );
    nav.renderer.simulateKeystrokes("enter");
    expect(nav.renderer.findByTestId("panel-first")).toBeDefined();

    nav.rerender(<RenamableNav firstLabel="Products" />);

    expect(
      Arr.map(nodesWithRole(nav.renderer, "group"), (n) => n.name),
    ).toEqual(["Products"]);

    // A row that re-registered would move to the end, so `End` would land on
    // the renamed trigger instead of the last authored one.
    nav.renderer.focusElement(
      nav.renderer.findByTestId("trigger-first")?.id ?? -1,
    );
    nav.renderer.simulateKeystrokes("end");
    expect(focusedTestId(nav)).toEqual(Option.some("trigger-third"));

    nav.unmount();
  });
});
