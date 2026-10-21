/**
 * Overlay layering, in the real GPUix renderer.
 *
 * The bug this guards: Escape (or an outside press) closing more than the
 * topmost overlay when several are open. `internal/dismiss-layer.ts` proves the
 * stack rules in isolation; this suite proves them end to end — a dialog, a
 * popover and a menu open at once form one dismiss stack, and each Escape
 * consumes exactly the top layer, outside-in: dialog, then popover, then menu.
 */

import { describe, expect, it } from "vitest";
import { Dialog, DialogContent } from "../dialog.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../dropdown-menu.js";
import { Popover, PopoverContent, PopoverTrigger } from "../popover.js";
import { clickCentreOf } from "../internal/interaction.js";
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
  it("dismisses a popover opened inside a dialog one layer at a time", () => {
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
    expect(nested.renderer.findByTestId("popover-panel")).toBeUndefined();
    expect(nested.renderer.findByTestId("dialog-panel")).toBeDefined();

    nested.renderer.simulateKeystrokes("escape");
    expect(nested.renderer.findByTestId("dialog-panel")).toBeUndefined();

    nested.unmount();
  });

  it("dismisses a dialog over a popover over a menu outside-in", () => {
    const stack = renderComponent(<Stack />);

    expect(stack.renderer.findByTestId("menu-panel")).toBeDefined();
    expect(stack.renderer.findByTestId("popover-panel")).toBeDefined();
    expect(stack.renderer.findByTestId("dialog-panel")).toBeDefined();

    // Escape closes the top overlay, not the one that is focused: the bottom
    // menu holds focus, but the top dialog is what a single Escape dismisses.
    focus(stack, "menu-panel");
    stack.renderer.simulateKeystrokes("escape");
    expect(stack.renderer.findByTestId("dialog-panel")).toBeUndefined();
    expect(stack.renderer.findByTestId("popover-panel")).toBeDefined();
    expect(stack.renderer.findByTestId("menu-panel")).toBeDefined();

    focus(stack, "popover-panel");
    stack.renderer.simulateKeystrokes("escape");
    expect(stack.renderer.findByTestId("popover-panel")).toBeUndefined();
    expect(stack.renderer.findByTestId("menu-panel")).toBeDefined();

    focus(stack, "menu-panel");
    stack.renderer.simulateKeystrokes("escape");
    expect(stack.renderer.findByTestId("menu-panel")).toBeUndefined();

    stack.unmount();
  });
});
