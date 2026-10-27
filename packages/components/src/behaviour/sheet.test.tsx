/**
 * Sheet names, on the drawer's surface.
 *
 * The bugs these guard: a second implementation drifting from the drawer's
 * (edges, focus, dismiss), and a `top` edge the layout reads without the motion
 * agreeing — which paints the panel at the top but travels it up from the
 * bottom, so it enters from the wrong side.
 */

import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { a11yNodes } from "../internal/a11y.js";
import { Button } from "../internal/button.js";
import {
  clickCentreOf,
  focusedTestId,
  requireBounds,
  settleMotion,
  waitFor,
} from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";
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
});
