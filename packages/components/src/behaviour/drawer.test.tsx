/**
 * Drawer behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a drawer that opens from the wrong edge, a veil that
 * dims only its parent or blackens it instead of washing it, focus left outside
 * or not returned, Escape closing the wrong layer, Tab escaping a modal, an
 * uninterruptible drawer that closes, a controlled drawer that moves on its own,
 * a sheet that nudges 12px instead of arriving from outside the window, a
 * surface with no inner corners and no grabber, and a reduced reader made to
 * watch the slide.
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
      // right — its own width — and does not rise.
      expect(entering.x - resting.x).toBe(resting.width);
      expect(entering.y).toBe(resting.y);
    } finally {
      page.unmount();
    }
  });

  it("slides its whole span from the named edge and lands flush", async () => {
    // The bug this guards: a sheet that "is not animating in". The surface used
    // to nudge 12px; a vaul/shadow sheet arrives from outside the window, so the
    // first frame is the whole box past the edge it owns, and the last frame is
    // flush to it. The runtime has no `transform`, so this is a numeric offset
    // on the surface's own box, clipped by the window-sized veil.
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
    } finally {
      page.unmount();
    }
  });

  it("rounds the inner corners and paints the vaul grabber on a sheet", () => {
    // The bug this guards: every surface was square, so a bottom sheet looked
    // like a docked column rather than the drawer shadcn/vaul draws. Only the
    // corners inside the window round; the edge the surface opens from stays
    // flush. The grabber is the handle the sheet wears — decoration, because
    // 0.11.0 has no drag host.
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
    // The house veil is the page's own background at 55% — a wash, not the
    // opaque `overlay` scrim the token package keeps for captions.
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
