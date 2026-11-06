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
