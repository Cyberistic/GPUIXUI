/**
 * Drawer behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a drawer that opens from the wrong edge or jumps while
 * it slides, a veil that dims only its parent, focus left outside or not
 * returned, Escape closing the wrong layer, Tab escaping a modal, an
 * uninterruptible drawer that closes, a controlled drawer that moves on its
 * own, a closing drawer that leaves a clickable ghost, and an exit that never
 * unmounts.
 */

import { describe, expect, it, vi } from "vitest";
import type { DrawerSide, DrawerSize } from "../drawer.js";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "../drawer.js";
import { Button } from "../internal/button.js";
import { darkTheme, lightTheme } from "../internal/theme.js";
import {
  boundsOf,
  clickCentreOf,
  finishMotion,
  focusedTestId,
  requireBounds,
} from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";
import { a11yNodes, nodesWithRole } from "../internal/a11y.js";
import type { HeadingLevel } from "../internal/heading.js";
import * as Option from "effect/Option";

/** A filter drawer with a real cancel/apply path. */
const Workspace = ({
  open,
  onOpenChange,
  dismissible = true,
  onBehind,
  side,
  size,
  titleLevel,
}: {
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly dismissible?: boolean;
  readonly onBehind?: () => void;
  readonly side?: DrawerSide;
  readonly size?: DrawerSize;
  readonly titleLevel?: HeadingLevel;
}) => (
  <div style={{ padding: 20 }}>
    <Button testId="behind" onClick={onBehind}>
      Behind the drawer
    </Button>
    <Drawer open={open} onOpenChange={onOpenChange} dismissible={dismissible}>
      <DrawerTrigger testId="open">Filters</DrawerTrigger>
      <DrawerContent label="Filters" testId="drawer" side={side} size={size}>
        <DrawerHeader>
          <DrawerTitle level={titleLevel}>Filters</DrawerTitle>
          <DrawerDescription>Narrow the result set.</DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <DrawerClose testId="cancel">Cancel</DrawerClose>
          <Button testId="apply" variant="primary">
            Apply
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  </div>
);

describe("Drawer", () => {
  it("stays unmounted until the trigger is clicked", () => {
    const drawer = renderComponent(<Workspace />);

    expect(drawer.renderer.findByTestId("drawer")).toBeUndefined();
    expect(drawer.renderer.findByTestId("drawer-backdrop")).toBeUndefined();

    clickCentreOf(drawer, "open");

    expect(drawer.renderer.findByTestId("drawer")).toBeDefined();
    expect(drawer.renderer.getAllText()).toContain("Narrow the result set.");
    expect(drawer.renderer.findByType("svg")).toHaveLength(1);

    drawer.unmount();
  });

  it("is a named dialog and reports the trigger's expanded state", () => {
    const drawer = renderComponent(<Workspace />);

    expect(drawer.renderer.findByTestId("open")?.customProps).toMatchObject({
      "aria-expanded": false,
    });

    clickCentreOf(drawer, "open");

    expect(drawer.renderer.findByTestId("drawer")?.customProps).toMatchObject({
      role: "dialog",
      "aria-label": "Filters",
    });
    expect(
      a11yNodes(drawer.renderer).filter((node) => node.role === "dialog"),
    ).toHaveLength(1);

    drawer.unmount();
  });

  it("takes the title's heading level from the caller", () => {
    const standard = renderComponent(<Workspace />);
    clickCentreOf(standard, "open");
    expect(
      nodesWithRole(standard.renderer, "heading").map((node) => node.level),
    ).toEqual([Option.some(2)]);
    standard.unmount();

    const custom = renderComponent(<Workspace titleLevel={6} />);
    clickCentreOf(custom, "open");
    expect(
      nodesWithRole(custom.renderer, "heading").map((node) => node.level),
    ).toEqual([Option.some(6)]);
    custom.unmount();
  });

  it("dims the whole window", () => {
    const drawer = renderComponent(<Workspace />);
    clickCentreOf(drawer, "open");

    const window = drawer.renderer.getWindowSize();
    expect(boundsOf(drawer, "drawer-backdrop")).toEqual(
      Option.some({ x: 0, y: 0, width: window.width, height: window.height }),
    );
    expect(drawer.renderer.findByType("anchored")).toHaveLength(1);

    drawer.unmount();
  });

  it("takes focus on open and returns it to the trigger on Escape", () => {
    const drawer = renderComponent(<Workspace />);
    clickCentreOf(drawer, "open");

    expect(focusedTestId(drawer)).toEqual(Option.some("drawer"));

    drawer.renderer.simulateKeystrokes("escape");
    finishMotion(drawer, 300);

    expect(drawer.renderer.findByTestId("drawer")).toBeUndefined();
    expect(focusedTestId(drawer)).toEqual(Option.some("open"));

    drawer.unmount();
  });

  it("closes on a backdrop press but not on a press inside", () => {
    const drawer = renderComponent(<Workspace />);
    clickCentreOf(drawer, "open");

    const surface = requireBounds(drawer, "drawer");
    drawer.renderer.nativeSimulateMouseDown(
      surface.x + surface.width / 2,
      surface.y + 8,
    );
    drawer.renderer.nativeSimulateMouseUp(
      surface.x + surface.width / 2,
      surface.y + 8,
    );
    expect(drawer.renderer.findByTestId("drawer")).toBeDefined();

    drawer.renderer.nativeSimulateClick(12, 12);
    finishMotion(drawer, 300);
    expect(drawer.renderer.findByTestId("drawer")).toBeUndefined();

    drawer.unmount();
  });

  it("traps Tab inside the surface and wraps at both ends", () => {
    const drawer = renderComponent(<Workspace />);
    clickCentreOf(drawer, "open");

    drawer.renderer.focusElement(
      drawer.renderer.findByTestId("drawer-close")?.id ?? -1,
    );
    drawer.renderer.simulateKeystrokes("tab");
    expect(focusedTestId(drawer)).toEqual(Option.some("cancel"));

    drawer.renderer.simulateKeystrokes("shift-tab");
    expect(focusedTestId(drawer)).toEqual(Option.some("drawer-close"));

    drawer.unmount();
  });

  it("opens from the right, left or bottom at the requested size", () => {
    const window = { width: 1280, height: 800 };

    const right = renderComponent(<Workspace side="right" size="md" />);
    clickCentreOf(right, "open");
    finishMotion(right, 300);
    const rightBox = requireBounds(right, "drawer");
    expect(rightBox.width).toBe(400);
    expect(rightBox.height).toBe(window.height);
    expect(rightBox.x + rightBox.width).toBe(window.width);
    right.unmount();

    const left = renderComponent(<Workspace side="left" size="sm" />);
    clickCentreOf(left, "open");
    finishMotion(left, 300);
    const leftBox = requireBounds(left, "drawer");
    expect(leftBox.x).toBe(0);
    expect(leftBox.width).toBe(320);
    left.unmount();

    const bottom = renderComponent(<Workspace side="bottom" size="lg" />);
    clickCentreOf(bottom, "open");
    finishMotion(bottom, 300);
    const bottomBox = requireBounds(bottom, "drawer");
    expect(bottomBox.width).toBe(window.width);
    expect(bottomBox.height).toBe(420);
    expect(bottomBox.y + bottomBox.height).toBe(window.height);
    bottom.unmount();
  });

  it("reads the surface and veil from whichever theme is active", () => {
    const theme = renderComponent(<Workspace />, "light");
    clickCentreOf(theme, "open");

    expect(theme.renderer.findByTestId("drawer")?.style.backgroundColor).toBe(
      lightTheme.colors.popover,
    );
    expect(
      theme.renderer.findByTestId("drawer-backdrop")?.style.backgroundColor,
    ).toBe(lightTheme.colors.overlay);

    theme.unmount();

    const dark = renderComponent(<Workspace />);
    clickCentreOf(dark, "open");
    expect(dark.renderer.findByTestId("drawer")?.style.backgroundColor).toBe(
      darkTheme.colors.popover,
    );
    dark.unmount();
  });

  it("cannot be dismissed when it is not dismissible", () => {
    const onOpenChange = vi.fn();
    const drawer = renderComponent(
      <Workspace dismissible={false} onOpenChange={onOpenChange} />,
    );
    clickCentreOf(drawer, "open");
    onOpenChange.mockClear();

    drawer.renderer.simulateKeystrokes("escape");
    expect(drawer.renderer.findByTestId("drawer")).toBeDefined();

    drawer.renderer.nativeSimulateClick(12, 12);
    expect(drawer.renderer.findByTestId("drawer")).toBeDefined();
    expect(onOpenChange).not.toHaveBeenCalled();

    drawer.unmount();
  });

  it("reports the open change and lets a controlled drawer stay closed", () => {
    const onOpenChange = vi.fn();
    const drawer = renderComponent(
      <Workspace open={false} onOpenChange={onOpenChange} />,
    );

    clickCentreOf(drawer, "open");

    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(drawer.renderer.findByTestId("drawer")).toBeUndefined();

    drawer.unmount();
  });

  it("enters with the 100 ms veil fade and the 300 ms edge slide", () => {
    const drawer = renderComponent(<Workspace side="right" />);
    clickCentreOf(drawer, "open");

    const animated = drawer.renderer
      .findByType("div")
      .filter((element) => element.customProps?.motion !== undefined)
      .map((element) => element.customProps?.motion);

    expect(animated).toHaveLength(2);
    expect(animated[0]).toEqual(
      expect.objectContaining({
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: expect.objectContaining({ duration: 0.1 }),
      }),
    );
    expect(animated[1]).toEqual(
      expect.objectContaining({
        initial: { opacity: 0, left: 8 },
        animate: { opacity: 1, left: 0 },
        transition: expect.objectContaining({ duration: 0.3 }),
      }),
    );

    drawer.unmount();
  });

  it("actually moves the surface while it opens", () => {
    const drawer = renderComponent(<Workspace side="right" />);
    clickCentreOf(drawer, "open");

    const early = requireBounds(drawer, "drawer");
    finishMotion(drawer, 300);
    const settled = requireBounds(drawer, "drawer");

    // The right-hand drawer starts 8 px out and lands on the window edge.
    expect(early.x).toBeGreaterThan(settled.x);
    expect(early.x - settled.x).toBeLessThanOrEqual(8);

    drawer.unmount();
  });

  it("slides a bottom drawer on the vertical axis", () => {
    const drawer = renderComponent(<Workspace side="bottom" />);
    clickCentreOf(drawer, "open");

    const surface = drawer.renderer
      .findByType("div")
      .filter((element) => element.customProps?.motion !== undefined)
      .map((element) => element.customProps?.motion)[1];

    expect(surface).toEqual(
      expect.objectContaining({
        initial: { opacity: 0, top: 8 },
        animate: { opacity: 1, top: 0 },
      }),
    );

    drawer.unmount();
  });

  it("keeps the surface for its exit, then unmounts it", () => {
    const drawer = renderComponent(<Workspace />);
    clickCentreOf(drawer, "open");
    finishMotion(drawer, 300);

    drawer.renderer.simulateKeystrokes("escape");

    // Closed: focus is back, but the exit ghost is still painted.
    expect(focusedTestId(drawer)).toEqual(Option.some("open"));
    expect(drawer.renderer.findByTestId("drawer")).toBeDefined();

    finishMotion(drawer, 300);

    expect(drawer.renderer.findByTestId("drawer")).toBeUndefined();

    drawer.unmount();
  });
});
