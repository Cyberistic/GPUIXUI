/**
 * Sheet names, on the drawer's surface.
 *
 * The bugs these guard: a second implementation drifting from the drawer's
 * (edges, focus, dismiss), a `top` edge the layout reads without the motion
 * agreeing — which paints the panel at the top but travels it up from the
 * bottom, so it enters from the wrong side — a sheet that does not animate in,
 * one a reduced reader is made to watch, and a bottom sheet without the vaul
 * grabber or inner corners.
 */

import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { a11yNodes } from "../internal/a11y.js";
import { Button } from "../internal/button.js";
import {
  after,
  clickCentreOf,
  focusedTestId,
  requireBounds,
  settleMotion,
  waitFor,
} from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";
import { MotionProvider } from "../motion.js";
import type { SheetSide } from "../sheet.js";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../sheet.js";

const Example = ({ side }: { readonly side?: SheetSide }) => (
  <div style={{ padding: 20 }}>
    <Button testId="behind">Behind the sheet</Button>
    <Sheet>
      <SheetTrigger testId="open">Open sheet</SheetTrigger>
      <SheetContent label="Sheet" testId="sheet" side={side}>
        <SheetHeader>
          <SheetTitle>Sheet</SheetTitle>
        </SheetHeader>
        <SheetFooter>
          <SheetClose testId="close">Close</SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  </div>
);

describe("Sheet", () => {
  it("stays unmounted until the trigger is clicked, then is a named dialog", () => {
    const page = renderComponent(<Example />);

    expect(page.renderer.findByTestId("sheet")).toBeUndefined();

    clickCentreOf(page, "open");

    expect(page.renderer.findByTestId("sheet")?.customProps).toMatchObject({
      role: "dialog",
      "aria-label": "Sheet",
    });
    expect(
      a11yNodes(page.renderer).filter((node) => node.role === "dialog"),
    ).toHaveLength(1);

    page.unmount();
  });

  it("anchors the top edge a sheet can name", () => {
    const page = renderComponent(<Example side="top" />);

    clickCentreOf(page, "open");
    settleMotion(page);

    const window = page.renderer.getWindowSize();
    const bounds = requireBounds(page, "sheet");
    expect(bounds.y).toBe(0);
    expect(bounds.x).toBe(0);
    expect(bounds.width).toBe(window.width);
    expect(bounds.height).toBeLessThan(window.height);

    page.unmount();
  });

  it("closes on Escape and returns focus to its trigger", async () => {
    const page = renderComponent(<Example />);

    clickCentreOf(page, "open");
    expect(focusedTestId(page)).toEqual(Option.some("sheet"));

    page.renderer.simulateKeystrokes("escape");

    await waitFor(() =>
      expect(page.renderer.findByTestId("sheet")).toBeUndefined(),
    );
    expect(focusedTestId(page)).toEqual(Option.some("open"));

    page.unmount();
  });

  it("arrives from its own edge and lands on it", async () => {
    const page = renderComponent(<Example side="bottom" />);
    try {
      page.renderer.clockPause();
      clickCentreOf(page, "open");
      await after(30);
      const entering = requireBounds(page, "sheet");

      page.renderer.clockFastForward(400);
      await after(30);
      const settled = requireBounds(page, "sheet");
      const window = page.renderer.getWindowSize();

      // The sheet leaves no frame in between: at t=0 its top is the window's
      // bottom edge, and the settled box is anchored to that edge.
      expect(entering.y).toBe(window.height);
      expect(entering.y - settled.y).toBe(settled.height);
      expect(settled.y + settled.height).toBe(window.height);
    } finally {
      page.unmount();
    }
  });

  it("paints the settled frame at once under the reduced preference", async () => {
    const page = renderComponent(
      <MotionProvider preference="reduced">
        <Example side="right" />
      </MotionProvider>,
    );
    try {
      page.renderer.clockPause();
      clickCentreOf(page, "open");
      await after(30);
      const first = requireBounds(page, "sheet");

      page.renderer.clockFastForward(400);
      await after(30);

      expect(requireBounds(page, "sheet")).toEqual(first);
    } finally {
      page.unmount();
    }
  });

  it("paints the vaul grabber and the inner corners on a bottom sheet", () => {
    const page = renderComponent(<Example side="bottom" />);
    try {
      clickCentreOf(page, "open");
      const surface = page.renderer.findByTestId("sheet");

      expect(page.renderer.findByTestId("drawer-grabber")).toBeDefined();
      expect(surface?.style.borderTopLeftRadius).toBeGreaterThan(0);
      expect(surface?.style.borderTopRightRadius).toBeGreaterThan(0);
      expect(surface?.style.borderBottomLeftRadius).toBe(0);
    } finally {
      page.unmount();
    }
  });
});
