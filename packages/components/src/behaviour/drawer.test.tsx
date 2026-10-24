/**
 * Drawer behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a drawer that opens from the wrong edge, a veil that
 * dims only its parent, focus left outside or not returned, Escape closing the
 * wrong layer, Tab escaping a modal, an uninterruptible drawer that closes, and
 * a controlled drawer that moves on its own.
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
  after,
  boundsOf,
  clickCentreOf,
  focusedTestId,
  requireBounds,
  settle,
  settleMotion,
  waitFor,
} from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";
import { a11yNodes } from "../internal/a11y.js";
import * as Option from "effect/Option";

/** A filter drawer with a real cancel/apply path. */
const Workspace = ({
  open,
  onOpenChange,
  dismissible = true,
  onBehind,
  side,
  size,
}: {
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly dismissible?: boolean;
  readonly onBehind?: () => void;
  readonly side?: DrawerSide;
  readonly size?: DrawerSize;
}) => (
  <div style={{ padding: 20 }}>
    <Button testId="behind" onClick={onBehind}>
      Behind the drawer
    </Button>
    <Drawer open={open} onOpenChange={onOpenChange} dismissible={dismissible}>
      <DrawerTrigger testId="open">Filters</DrawerTrigger>
      <DrawerContent label="Filters" testId="drawer" side={side} size={size}>
        <DrawerHeader>
          <DrawerTitle>Filters</DrawerTitle>
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

  it("takes focus on open and returns it to the trigger on Escape", async () => {
    const drawer = renderComponent(<Workspace />);
    clickCentreOf(drawer, "open");

    expect(focusedTestId(drawer)).toEqual(Option.some("drawer"));

    drawer.renderer.simulateKeystrokes("escape");

    expect(focusedTestId(drawer)).toEqual(Option.some("open"));
    await waitFor(() =>
      expect(drawer.renderer.findByTestId("drawer")).toBeUndefined(),
    );

    drawer.unmount();
  });

  it("closes on a backdrop press but not on a press inside", async () => {
    const drawer = renderComponent(<Workspace />);
    clickCentreOf(drawer, "open");
    settleMotion(drawer);

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
    await waitFor(() =>
      expect(drawer.renderer.findByTestId("drawer")).toBeUndefined(),
    );

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

  it("keeps its close control outside the body's scroller", async () => {
    // The same bug the Dialog guards: the control was painted inside the
    // surface's `overflow: "scroll"` box, so a long body scrolled the one
    // visible way out of the panel.
    const LongDrawer = () => (
      <Drawer defaultOpen>
        <DrawerContent label="Long body" testId="drawer" side="right">
          <DrawerHeader>
            <DrawerTitle>Thirty rows</DrawerTitle>
          </DrawerHeader>
          {Array.from({ length: 30 }, (_, index) => (
            <div key={index} style={{ height: 40 }}>
              <text>{`row ${index}`}</text>
            </div>
          ))}
        </DrawerContent>
      </Drawer>
    );
    const drawer = renderComponent(<LongDrawer />);
    settleMotion(drawer);

    const surface = requireBounds(drawer, "drawer");
    const rest = requireBounds(drawer, "drawer-close");

    drawer.renderer.scrollTo(
      drawer.renderer.findByTestId("drawer")?.id ?? -1,
      0,
      -400,
    );
    settle(drawer);

    expect(requireBounds(drawer, "drawer")).toEqual(surface);
    expect(requireBounds(drawer, "drawer-close")).toEqual(rest);
    clickCentreOf(drawer, "drawer-close");
    await waitFor(() =>
      expect(drawer.renderer.findByTestId("drawer")).toBeUndefined(),
    );

    drawer.unmount();
  });

  it("opens from the right, left or bottom at the requested size", () => {
    const window = { width: 1280, height: 800 };

    const right = renderComponent(<Workspace side="right" size="md" />);
    clickCentreOf(right, "open");
    settleMotion(right);
    const rightBox = requireBounds(right, "drawer");
    expect(rightBox.width).toBe(400);
    expect(rightBox.height).toBe(window.height);
    expect(rightBox.x + rightBox.width).toBe(window.width);
    right.unmount();

    const left = renderComponent(<Workspace side="left" size="sm" />);
    clickCentreOf(left, "open");
    settleMotion(left);
    const leftBox = requireBounds(left, "drawer");
    expect(leftBox.x).toBe(0);
    expect(leftBox.width).toBe(320);
    left.unmount();

    const bottom = renderComponent(<Workspace side="bottom" size="lg" />);
    clickCentreOf(bottom, "open");
    settleMotion(bottom);
    const bottomBox = requireBounds(bottom, "drawer");
    expect(bottomBox.width).toBe(window.width);
    expect(bottomBox.height).toBe(420);
    expect(bottomBox.y + bottomBox.height).toBe(window.height);
    bottom.unmount();
  });

  it("opens on the house edge when the side it was stored as names no edge", async () => {
    // The bug this guards: `side` is a stored choice, so the union the props
    // declare is not a runtime guarantee. The box read an unnamed value as its
    // right-hand branch while `fadeFromSide` read it as its house `bottom`: the
    // panel painted on the right and rose from the bottom. The house answer is
    // the component's own default — the right edge, travelled from the right.
    // @ts-expect-error — a side a store wrote, not the union the props declare.
    const stored: DrawerSide = "end";

    const page = renderComponent(<Workspace side={stored} />);
    try {
      page.renderer.clockPause();
      clickCentreOf(page, "open");
      await after(30);
      const entering = requireBounds(page, "drawer");

      page.renderer.clockFastForward(400);
      await after(30);
      const resting = requireBounds(page, "drawer");
      const window = page.renderer.getWindowSize();

      // The resting box is the default edge's: a column against the right edge.
      expect(resting.x + resting.width).toBe(window.width);
      // The travel comes from that edge too, so the panel arrives from the
      // right and rises from nowhere.
      expect(entering.x - resting.x).toBe(12);
      expect(entering.y).toBe(resting.y);
    } finally {
      page.unmount();
    }
  });

  it("paints the default box when the size it was stored as names no variant", () => {
    // The bug this guards: `size` is a stored choice, so the union the props
    // declare is not a runtime guarantee. The table lookup handed `Math.min` an
    // `undefined`, the renderer dropped the resulting `NaN` width and height,
    // and the panel shrank to its content instead of opening at the default
    // 400×window box — a stored size the library no longer ships resized the
    // surface rather than ignoring it.
    // @ts-expect-error — a size a store wrote, not the union the props declare.
    const stored: DrawerSize = "xl";

    const page = renderComponent(<Workspace size={stored} />);
    try {
      clickCentreOf(page, "open");
      settleMotion(page);
      const box = requireBounds(page, "drawer");
      const window = page.renderer.getWindowSize();

      expect(box.width).toBe(400);
      expect(box.height).toBe(window.height);
      expect(box.x + box.width).toBe(window.width);
    } finally {
      page.unmount();
    }
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
});
