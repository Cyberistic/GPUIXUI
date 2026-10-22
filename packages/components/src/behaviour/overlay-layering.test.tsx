/**
 * Overlay layering, in the real GPUix renderer.
 *
 * The bug this guards: Escape (or an outside press) closing more than the
 * topmost overlay when several are open. `internal/dismiss-layer.ts` proves the
 * stack rules in isolation; this suite proves them end to end — a dialog, a
 * popover and a menu open at once form one dismiss stack, and each Escape
 * consumes exactly the top layer, outside-in: dialog, then popover, then menu.
 * The first case opens the popover and the dialog in one commit, where a stack
 * ordered by push would put the container on top.
 */

import { describe, expect, it } from "vitest";
import { Dialog, DialogContent } from "../dialog.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../dropdown-menu.js";
import { Popover, PopoverContent, PopoverTrigger } from "../popover.js";
import { clickCentreOf, waitFor } from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";

/**
 * Three overlays open at once. They are siblings, not nested, because a nested
 * floating surface escapes its parent's bounds and a press inside it is then an
 * outside press on the parent (`menu/surface.tsx` documents the geometry). The
 * dismiss stack is order-of-push, so the dialog — mounted last — is the top.
 */
const Stack = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
    <DropdownMenu defaultOpen>
      <DropdownMenuContent testId="menu-panel" label="Menu">
        <DropdownMenuItem>An action</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <Popover defaultOpen>
      <PopoverContent testId="popover-panel">
        <text>Popover</text>
      </PopoverContent>
    </Popover>
    <Dialog defaultOpen>
      <DialogContent testId="dialog-panel" label="Dialog" size="sm">
        <text>Dialog</text>
      </DialogContent>
    </Dialog>
  </div>
);

/** Focus the surface named `testId`, so the next Escape reaches its handler. */
const focus = (
  stack: ReturnType<typeof renderComponent>,
  testId: string,
): void => {
  stack.renderer.focusElement(stack.renderer.findByTestId(testId)?.id ?? -1);
};

describe("overlay layering", () => {
  it("dismisses a popover opened inside a dialog one layer at a time", async () => {
    const nested = renderComponent(
      <Dialog defaultOpen>
        <DialogContent label="Dialog" testId="dialog-panel">
          <Popover>
            <PopoverTrigger testId="open-popover">Details</PopoverTrigger>
            <PopoverContent testId="popover-panel">
              <text>Popover</text>
            </PopoverContent>
          </Popover>
        </DialogContent>
      </Dialog>,
    );

    clickCentreOf(nested, "open-popover");
    expect(nested.renderer.findByTestId("popover-panel")).toBeDefined();

    // One keystroke reaches the popover's handler and the dialog's: the shared
    // stack must dismiss only the popover, which is what is on top.
    nested.renderer.simulateKeystrokes("escape");
    await waitFor(() =>
      expect(nested.renderer.findByTestId("popover-panel")).toBeUndefined(),
    );
    expect(nested.renderer.findByTestId("dialog-panel")).toBeDefined();

    nested.renderer.simulateKeystrokes("escape");
    await waitFor(() =>
      expect(nested.renderer.findByTestId("dialog-panel")).toBeUndefined(),
    );

    nested.unmount();
  });

  it("puts a popover declared open inside a dialog above it in the first render", async () => {
    // Both surfaces open in one commit. React runs the popover's layout effect
    // before the dialog's, so a stack ordered by push would hand the first
    // Escape to the dialog — the container — and unmount the popover with it.
    const nested = renderComponent(
      <Dialog defaultOpen>
        <DialogContent label="Dialog" testId="dialog-panel">
          <Popover defaultOpen>
            <PopoverTrigger testId="popover-trigger">Details</PopoverTrigger>
            <PopoverContent testId="popover-panel">
              <text>Popover</text>
            </PopoverContent>
          </Popover>
        </DialogContent>
      </Dialog>,
    );

    expect(nested.renderer.findByTestId("popover-panel")).toBeDefined();
    expect(nested.renderer.findByTestId("dialog-panel")).toBeDefined();

    // The key starts inside the popover and bubbles into the dialog, which is
    // the path a reader's Escape takes.
    focus(nested, "popover-panel");
    nested.renderer.simulateKeystrokes("escape");
    await waitFor(() =>
      expect(nested.renderer.findByTestId("popover-panel")).toBeUndefined(),
    );
    expect(nested.renderer.findByTestId("dialog-panel")).toBeDefined();

    nested.renderer.simulateKeystrokes("escape");
    await waitFor(() =>
      expect(nested.renderer.findByTestId("dialog-panel")).toBeUndefined(),
    );

    nested.unmount();
  });

  it("closes one overlay per outside press, outside-in", async () => {
    // The bug this guards: one outside press raises every open overlay's
    // `onMouseDownOutside`, and each handler dismissed the topmost layer — so
    // the app saw the same overlay close twice and the next press never reached
    // the surface it should have closed.
    const stack = renderComponent(<Stack />);

    expect(stack.renderer.findByTestId("menu-panel")).toBeDefined();
    expect(stack.renderer.findByTestId("popover-panel")).toBeDefined();
    expect(stack.renderer.findByTestId("dialog-panel")).toBeDefined();

    stack.renderer.nativeSimulateClick(1000, 700);
    await waitFor(() =>
      expect(stack.renderer.findByTestId("dialog-panel")).toBeUndefined(),
    );
    expect(stack.renderer.findByTestId("popover-panel")).toBeDefined();
    expect(stack.renderer.findByTestId("menu-panel")).toBeDefined();

    // A later press elsewhere is a new gesture and reaches what is now topmost.
    stack.renderer.nativeSimulateClick(1050, 720);
    await waitFor(() =>
      expect(stack.renderer.findByTestId("popover-panel")).toBeUndefined(),
    );
    expect(stack.renderer.findByTestId("menu-panel")).toBeDefined();

    stack.renderer.nativeSimulateClick(1100, 740);
    await waitFor(() =>
      expect(stack.renderer.findByTestId("menu-panel")).toBeUndefined(),
    );

    stack.unmount();
  });

  it("dismisses a dialog over a popover over a menu outside-in", async () => {
    const stack = renderComponent(<Stack />);

    expect(stack.renderer.findByTestId("menu-panel")).toBeDefined();
    expect(stack.renderer.findByTestId("popover-panel")).toBeDefined();
    expect(stack.renderer.findByTestId("dialog-panel")).toBeDefined();

    // Escape closes the top overlay, not the one that is focused: the bottom
    // menu holds focus, but the top dialog is what a single Escape dismisses.
    focus(stack, "menu-panel");
    stack.renderer.simulateKeystrokes("escape");
    await waitFor(() =>
      expect(stack.renderer.findByTestId("dialog-panel")).toBeUndefined(),
    );
    expect(stack.renderer.findByTestId("popover-panel")).toBeDefined();
    expect(stack.renderer.findByTestId("menu-panel")).toBeDefined();

    focus(stack, "popover-panel");
    stack.renderer.simulateKeystrokes("escape");
    await waitFor(() =>
      expect(stack.renderer.findByTestId("popover-panel")).toBeUndefined(),
    );
    expect(stack.renderer.findByTestId("menu-panel")).toBeDefined();

    focus(stack, "menu-panel");
    stack.renderer.simulateKeystrokes("escape");
    await waitFor(() =>
      expect(stack.renderer.findByTestId("menu-panel")).toBeUndefined(),
    );

    stack.unmount();
  });
});
