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

const wash = (theme: Theme): string =>
  alpha(theme.colors.background, OVERLAY_WASH);

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

const FAMILIES = ["dialog", "confirm", "command", "drawer", "sheet"] as const;

type Family = (typeof FAMILIES)[number];

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
