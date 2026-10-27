/**
 * The house veil, across every modal overlay family.
 *
 * The bug this guards: each family painted the token package's opaque `overlay`
 * scrim, so a modal blacked the page out. The house behaviour is a **wash** —
 * the page's own background at 55% — which keeps the page legible under the
 * surface and matches the drawings in `apps/docs`. The 6px blur a shadcn veil
 * carries has no native route (`StyleDesc` has no `filter`), so it is the
 * drawing's; these cases hold the half the runtime can paint, and the outside
 * press that every modal offers beside it.
 */

import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import { CommandMenu, CommandMenuList } from "../command-menu.js";
import { ConfirmDialog } from "../confirm-dialog.js";
import { Dialog, DialogContent, DialogTrigger } from "../dialog.js";
import { Drawer, DrawerContent, DrawerTrigger } from "../drawer.js";
import { Sheet, SheetContent, SheetTrigger } from "../sheet.js";
import { alpha, darkTheme, lightTheme, type Theme } from "../internal/theme.js";
import { boundsOf, waitFor } from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";
import { OVERLAY_WASH } from "../internal/overlay.js";

/** The veil's expected fill for one theme. */
const wash = (theme: Theme): string =>
  alpha(theme.colors.background, OVERLAY_WASH);

/** The measured box of a backdrop is the window, so the wash covers the page. */
const coversWindow = (
  root: ReturnType<typeof renderComponent>,
  testId: string,
): boolean => {
  const window = root.renderer.getWindowSize();
  return Option.match(boundsOf(root, testId), {
    onNone: () => false,
    onSome: (bounds) =>
      bounds.x === 0 &&
      bounds.y === 0 &&
      bounds.width === window.width &&
      bounds.height === window.height,
  });
};

/** Each modal family's trigger, its veil's test id and a way to open it. */
const FAMILIES = ["dialog", "confirm", "command", "drawer", "sheet"] as const;

type Family = (typeof FAMILIES)[number];

/** One family opened, and the action that dismisses it. */
const open = (
  family: Family,
): {
  readonly root: ReturnType<typeof renderComponent>;
  readonly veil: string;
  readonly onClose: ReturnType<typeof vi.fn>;
} => {
  switch (family) {
    case "dialog": {
      const onOpenChange = vi.fn();
      const root = renderComponent(
        <Dialog defaultOpen onOpenChange={onOpenChange}>
          <DialogTrigger testId="open">Open</DialogTrigger>
          <DialogContent label="Rename" testId="surface">
            <text>Body</text>
          </DialogContent>
        </Dialog>,
      );
      return {
        root,
        veil: "dialog-backdrop",
        onClose: onOpenChange,
      };
    }
    case "confirm": {
      const onOpenChange = vi.fn();
      const root = renderComponent(
        <ConfirmDialog
          description="This cannot be undone."
          onConfirm={vi.fn()}
          onOpenChange={onOpenChange}
          open
          title="Archive project"
        />,
      );
      return { root, veil: "dialog-backdrop", onClose: onOpenChange };
    }
    case "command": {
      const onOpenChange = vi.fn();
      const root = renderComponent(
        <CommandMenu actions={[]} onOpenChange={onOpenChange} open>
          <CommandMenuList />
        </CommandMenu>,
      );
      return {
        root,
        veil: "dialog-backdrop",
        onClose: onOpenChange,
      };
    }
    case "drawer": {
      const onOpenChange = vi.fn();
      const root = renderComponent(
        <Drawer defaultOpen onOpenChange={onOpenChange}>
          <DrawerTrigger testId="open">Open</DrawerTrigger>
          <DrawerContent label="Filters" testId="surface">
            <text>Body</text>
          </DrawerContent>
        </Drawer>,
      );
      return {
        root,
        veil: "drawer-backdrop",
        onClose: onOpenChange,
      };
    }
    case "sheet": {
      const onOpenChange = vi.fn();
      const root = renderComponent(
        <Sheet defaultOpen onOpenChange={onOpenChange}>
          <SheetTrigger testId="open">Open</SheetTrigger>
          <SheetContent label="Filters" testId="surface" side="bottom">
            <text>Body</text>
          </SheetContent>
        </Sheet>,
      );
      return {
        root,
        veil: "drawer-backdrop",
        onClose: onOpenChange,
      };
    }
  }
};

describe("the modal veil", () => {
  it.each(FAMILIES)("washes the page behind %s", (family) => {
    const { root, veil } = open(family);
    try {
      expect(coversWindow(root, veil)).toBe(true);
      expect(root.renderer.findByTestId(veil)?.style.backgroundColor).toBe(
        wash(darkTheme),
      );
    } finally {
      root.unmount();
    }
  });

  it.each(FAMILIES)("dismisses %s on an outside press", async (family) => {
    const { root, onClose } = open(family);
    try {
      root.renderer.nativeSimulateClick(12, 12);
      await waitFor(() => expect(onClose).toHaveBeenCalledWith(false));
    } finally {
      root.unmount();
    }
  });

  it("washes the page in the light theme too", () => {
    const root = renderComponent(
      <Dialog defaultOpen>
        <DialogTrigger testId="open">Open</DialogTrigger>
        <DialogContent label="Rename" testId="surface">
          <text>Body</text>
        </DialogContent>
      </Dialog>,
      "light",
    );
    try {
      expect(
        root.renderer.findByTestId("dialog-backdrop")?.style.backgroundColor,
      ).toBe(wash(lightTheme));
    } finally {
      root.unmount();
    }
  });

  it("keeps the page behind a modal legible: the wash is translucent", () => {
    // The scrim it replaced was opaque enough to read as a blackout. A wash is
    // a share of the page's own background, so some of the page always shows.
    const { root, veil } = open("dialog");
    try {
      const painted = root.renderer.findByTestId(veil)?.style.backgroundColor;
      expect(painted).toBe(wash(darkTheme));
      expect(painted).not.toBe(darkTheme.colors.overlay);
    } finally {
      root.unmount();
    }
  });
});
