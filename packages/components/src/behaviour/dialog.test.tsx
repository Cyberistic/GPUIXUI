/**
 * Dialog behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a veil that dims only its parent's box instead of the
 * window; a click reaching a control behind the modal; focus staying outside the
 * dialog or failing to return to the opener; Escape or a backdrop press closing
 * the wrong overlay; Tab escaping a modal; a dialog that cannot be made
 * uninterruptible; and a surface that ignores the theme. A caller `ref` on the
 * content was discarded in favour of the internal one.
 */

import { describe, expect, it, vi } from "vitest";
import type { PublicInstance } from "@gpuix/react";
import { createRef } from "react";
import { Button } from "../internal/button.js";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../dialog.js";
import { darkTheme, lightTheme } from "../internal/theme.js";
import {
  boundsOf,
  clickCentreOf,
  focusedTestId,
  waitFor,
} from "../internal/interaction.js";
import { renderComponent, type TestTheme } from "../internal/test-root.js";
import { a11yNodes } from "../internal/a11y.js";
import * as Option from "effect/Option";

/** A destructive-confirmation-shaped dialog, with a real cancel path. */
const Workspace = ({
  open,
  onOpenChange,
  dismissible = true,
  onBehind,
}: {
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly dismissible?: boolean;
  readonly onBehind?: () => void;
}) => (
  <div
    style={{ display: "flex", flexDirection: "column", gap: 20, padding: 20 }}
  >
    <Button testId="behind" onClick={onBehind}>
      Behind the dialog
    </Button>
    <Dialog open={open} onOpenChange={onOpenChange} dismissible={dismissible}>
      <DialogTrigger testId="open">Delete workspace</DialogTrigger>
      <DialogContent label="Delete workspace" testId="dialog" size="sm">
        <DialogHeader>
          <DialogTitle>Delete workspace</DialogTitle>
          <DialogDescription>This cannot be undone.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose testId="cancel">Cancel</DialogClose>
          <Button testId="confirm" variant="primary">
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
);

describe("Dialog", () => {
  it("stays unmounted until the trigger is clicked", () => {
    const dialog = renderComponent(<Workspace />);

    expect(dialog.renderer.findByTestId("dialog")).toBeUndefined();
    expect(dialog.renderer.findByTestId("dialog-backdrop")).toBeUndefined();

    clickCentreOf(dialog, "open");

    expect(dialog.renderer.findByTestId("dialog")).toBeDefined();
    expect(dialog.renderer.getAllText()).toContain("This cannot be undone.");

    dialog.unmount();
  });

  it("dims the whole window, not the parent's box", () => {
    const dialog = renderComponent(<Workspace />);
    clickCentreOf(dialog, "open");

    const window = dialog.renderer.getWindowSize();

    expect(boundsOf(dialog, "dialog-backdrop")).toEqual(
      Option.some({
        x: 0,
        y: 0,
        width: window.width,
        height: window.height,
      }),
    );
    expect(dialog.renderer.findByType("anchored")).toHaveLength(1);

    dialog.unmount();
  });

  it("blocks a click that lands behind the modal", async () => {
    const onBehind = vi.fn();
    const dialog = renderComponent(<Workspace onBehind={onBehind} />);
    clickCentreOf(dialog, "open");

    // The trigger sits under the veil; pressing that point must reach the
    // dialog, never the page control below it.
    clickCentreOf(dialog, "behind");

    expect(onBehind).not.toHaveBeenCalled();
    // The surface plays its exit before it leaves (see `presence.test.tsx`).
    await waitFor(() =>
      expect(dialog.renderer.findByTestId("dialog")).toBeUndefined(),
    );

    dialog.unmount();
  });

  it("moves focus into the surface when it opens", () => {
    const dialog = renderComponent(<Workspace />);
    clickCentreOf(dialog, "open");

    expect(focusedTestId(dialog)).toEqual(Option.some("dialog"));

    dialog.unmount();
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const dialog = renderComponent(<Workspace />);
    clickCentreOf(dialog, "open");

    dialog.renderer.simulateKeystrokes("escape");

    expect(focusedTestId(dialog)).toEqual(Option.some("open"));
    await waitFor(() =>
      expect(dialog.renderer.findByTestId("dialog")).toBeUndefined(),
    );

    dialog.unmount();
  });

  it("closes on a backdrop press and stays open on a press inside", async () => {
    const dialog = renderComponent(<Workspace />);
    clickCentreOf(dialog, "open");

    const surface = boundsOf(dialog, "dialog");
    if (Option.isNone(surface)) {
      expect.fail("the dialog surface was not measured");
    }
    dialog.renderer.nativeSimulateMouseDown(
      surface.value.x + surface.value.width / 2,
      surface.value.y + 8,
    );
    dialog.renderer.nativeSimulateMouseUp(
      surface.value.x + surface.value.width / 2,
      surface.value.y + 8,
    );

    expect(dialog.renderer.findByTestId("dialog")).toBeDefined();

    dialog.renderer.nativeSimulateClick(12, 12);

    await waitFor(() =>
      expect(dialog.renderer.findByTestId("dialog")).toBeUndefined(),
    );

    dialog.unmount();
  });

  it("traps Tab inside the surface and wraps at both ends", () => {
    const dialog = renderComponent(<Workspace />);
    clickCentreOf(dialog, "open");

    const close = dialog.renderer.findByTestId("dialog-close");
    dialog.renderer.focusElement(close?.id ?? -1);
    dialog.renderer.simulateKeystrokes("tab");

    expect(focusedTestId(dialog)).toEqual(Option.some("cancel"));

    dialog.renderer.simulateKeystrokes("shift-tab");

    expect(focusedTestId(dialog)).toEqual(Option.some("dialog-close"));

    dialog.unmount();
  });

  it("names the dialog through aria-label, since 0.11.0 has no labelledby", () => {
    const dialog = renderComponent(<Workspace />);
    clickCentreOf(dialog, "open");

    expect(dialog.renderer.findByTestId("dialog")?.customProps).toMatchObject({
      role: "dialog",
      "aria-label": "Delete workspace",
    });
    expect(
      a11yNodes(dialog.renderer).filter((node) => node.role === "dialog"),
    ).toHaveLength(1);

    dialog.unmount();
  });

  it("reads the popover and overlay roles from whichever theme is active", () => {
    const assertTheme = (
      theme: TestTheme,
      popover: string,
      overlay: string,
    ): void => {
      const dialog = renderComponent(<Workspace />, theme);
      clickCentreOf(dialog, "open");

      expect(
        dialog.renderer.findByTestId("dialog")?.style.backgroundColor,
      ).toBe(popover);
      expect(
        dialog.renderer.findByTestId("dialog-backdrop")?.style.backgroundColor,
      ).toBe(overlay);

      dialog.unmount();
    };

    assertTheme("dark", darkTheme.colors.popover, darkTheme.colors.overlay);
    assertTheme("light", lightTheme.colors.popover, lightTheme.colors.overlay);
  });

  it("cannot be dismissed when it is not dismissible", () => {
    const onOpenChange = vi.fn();
    const dialog = renderComponent(<Workspace dismissible={false} />);
    clickCentreOf(dialog, "open");

    dialog.renderer.simulateKeystrokes("escape");
    expect(dialog.renderer.findByTestId("dialog")).toBeDefined();

    dialog.renderer.nativeSimulateClick(12, 12);
    expect(dialog.renderer.findByTestId("dialog")).toBeDefined();
    expect(onOpenChange).not.toHaveBeenCalled();

    dialog.unmount();
  });

  it("reports the open change and lets a controlled dialog stay closed", () => {
    const onOpenChange = vi.fn();
    const dialog = renderComponent(
      <Workspace open={false} onOpenChange={onOpenChange} />,
    );

    clickCentreOf(dialog, "open");

    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(dialog.renderer.findByTestId("dialog")).toBeUndefined();

    dialog.unmount();
  });

  it("renders the caller's close control", async () => {
    const dialog = renderComponent(<Workspace />);
    clickCentreOf(dialog, "open");
    clickCentreOf(dialog, "dialog-close");

    await waitFor(() =>
      expect(dialog.renderer.findByTestId("dialog")).toBeUndefined(),
    );

    dialog.unmount();
  });

  it("returns focus to the opener when the surface auto-focused its own field", async () => {
    // The regression: `autoFocus` runs during the surface's commit, before the
    // effect that recorded the previous holder, so the restore target used to be
    // the field itself — which unmounts with the surface, leaving the reader's
    // focus nowhere. The holder is now captured in the opening render.
    const AutoFocusPage = () => (
      <div style={{ display: "flex", padding: 40 }}>
        <Dialog>
          <DialogTrigger testId="open">Rename</DialogTrigger>
          <DialogContent label="Rename" testId="dialog" size="sm">
            <DialogTitle>Rename</DialogTitle>
            <input testId="name" autoFocus />
            <DialogClose testId="cancel">Cancel</DialogClose>
          </DialogContent>
        </Dialog>
      </div>
    );
    const dialog = renderComponent(<AutoFocusPage />);

    clickCentreOf(dialog, "open");
    // The field wins the focus once, as its `autoFocus` asks...
    expect(focusedTestId(dialog)).toEqual(Option.some("dialog"));

    dialog.renderer.focusElement(
      dialog.renderer.findByTestId("name")?.id ?? -1,
    );
    expect(focusedTestId(dialog)).toEqual(Option.some("name"));

    clickCentreOf(dialog, "cancel");
    // ...and the opener gets it back, not the field that is fading away.
    expect(focusedTestId(dialog)).toEqual(Option.some("open"));
    await waitFor(() =>
      expect(dialog.renderer.findByTestId("dialog")).toBeUndefined(),
    );

    dialog.unmount();
  });

  it("feeds both the internal and the caller's content ref", () => {
    const ref = createRef<PublicInstance>();
    const dialog = renderComponent(
      <Dialog defaultOpen>
        <DialogContent ref={ref} label="Delete workspace" testId="dialog">
          <DialogTitle>Delete workspace</DialogTitle>
        </DialogContent>
      </Dialog>,
    );

    expect(ref.current?.id).toBe(dialog.renderer.findByTestId("dialog")?.id);
    // The internal ref still focuses the surface.
    expect(focusedTestId(dialog)).toEqual(Option.some("dialog"));

    dialog.unmount();
  });
});
