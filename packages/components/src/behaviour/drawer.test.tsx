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
import { alpha, darkTheme, lightTheme } from "../internal/theme.js";
import { MotionProvider } from "../motion.js";
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

      expect(resting.x + resting.width).toBe(window.width);

      expect(entering.x - resting.x).toBe(resting.width);
      expect(entering.y).toBe(resting.y);
    } finally {
      page.unmount();
    }
  });

  it("slides its whole span from the named edge and lands flush", async () => {
    const window = { width: 1280, height: 800 };

    const right = renderComponent(<Workspace side="right" />);
    try {
      right.renderer.clockPause();
      clickCentreOf(right, "open");
      await after(30);
      const enteringRight = requireBounds(right, "drawer");
      right.renderer.clockFastForward(400);
      await after(30);
      const restingRight = requireBounds(right, "drawer");

      expect(enteringRight.x).toBe(window.width);
      expect(enteringRight.x - restingRight.x).toBe(restingRight.width);
      expect(restingRight.x + restingRight.width).toBe(window.width);
    } finally {
      right.unmount();
    }

    const bottom = renderComponent(<Workspace side="bottom" />);
    try {
      bottom.renderer.clockPause();
      clickCentreOf(bottom, "open");
      await after(30);
      const enteringBottom = requireBounds(bottom, "drawer");
      bottom.renderer.clockFastForward(400);
      await after(30);
      const restingBottom = requireBounds(bottom, "drawer");

      expect(enteringBottom.y).toBe(window.height);
      expect(enteringBottom.y - restingBottom.y).toBe(restingBottom.height);
      expect(restingBottom.y + restingBottom.height).toBe(window.height);
    } finally {
      bottom.unmount();
    }
  });

  it("travels back out its span and stays painted for the exit", async () => {
    const page = renderComponent(<Workspace side="right" />);
    try {
      clickCentreOf(page, "open");
      settleMotion(page);
      const resting = requireBounds(page, "drawer");

      page.renderer.clockPause();
      clickCentreOf(page, "cancel");
      await after(30);
      expect(requireBounds(page, "drawer")).toEqual(resting);

      page.renderer.clockFastForward(160);
      await after(30);
      const leaving = requireBounds(page, "drawer");
      expect(leaving.x).toBeGreaterThan(resting.x);
      expect(leaving.y).toBe(resting.y);

      await waitFor(() =>
        expect(page.renderer.findByTestId("drawer")).toBeUndefined(),
      );
    } finally {
      page.unmount();
    }
  });

  it("paints the settled frame at once under the reduced preference", async () => {
    const page = renderComponent(
      <MotionProvider preference="reduced">
        <Workspace side="right" />
      </MotionProvider>,
    );
    try {
      page.renderer.clockPause();
      clickCentreOf(page, "open");
      await after(30);
      const first = requireBounds(page, "drawer");

      page.renderer.clockFastForward(400);
      await after(30);
      const settled = requireBounds(page, "drawer");

      expect(first).toEqual(settled);
      expect(first.x + first.width).toBe(page.renderer.getWindowSize().width);

      clickCentreOf(page, "drawer-close");
      await waitFor(() =>
        expect(page.renderer.findByTestId("drawer")).toBeUndefined(),
      );
    } finally {
      page.unmount();
    }
  });

  it("rounds the inner corners and paints the vaul grabber on a sheet", () => {
    const right = renderComponent(<Workspace side="right" />);
    try {
      clickCentreOf(right, "open");
      const surface = right.renderer.findByTestId("drawer")?.style;
      expect(surface?.borderTopLeftRadius).toBe(darkTheme.radius.xl);
      expect(surface?.borderBottomLeftRadius).toBe(darkTheme.radius.xl);
      expect(surface?.borderTopRightRadius).toBe(0);
      expect(right.renderer.findByTestId("drawer-grabber")).toBeUndefined();
    } finally {
      right.unmount();
    }

    const bottom = renderComponent(<Workspace side="bottom" />);
    try {
      clickCentreOf(bottom, "open");
      const surface = bottom.renderer.findByTestId("drawer")?.style;
      expect(surface?.borderTopLeftRadius).toBe(darkTheme.radius.xl);
      expect(surface?.borderTopRightRadius).toBe(darkTheme.radius.xl);
      expect(surface?.borderBottomLeftRadius).toBe(0);
      expect(bottom.renderer.findByTestId("drawer-grabber")).toBeDefined();
    } finally {
      bottom.unmount();
    }
  });

  it("paints the default box when the size it was stored as names no variant", () => {
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
    ).toBe(alpha(lightTheme.colors.background, 0.55));

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
