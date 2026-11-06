import { describe, expect, it, vi } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useState } from "react";
import type { MotionProps } from "@gpuix/react";
import type { TestRoot } from "@gpuix/react/testing";
import { presenceMotion as motionOfPresence } from "@gpuixui/motion/presence";
import type {
  PresenceFramesInput,
  PresenceTiming,
} from "@gpuixui/motion/presence";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../accordion.js";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "../context-menu.js";
import { Button } from "../internal/button.js";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "../dialog.js";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTrigger,
} from "../drawer.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../dropdown-menu.js";
import {
  boundsOf,
  clickCentreOf,
  focusedTestId,
  hoverCentreOf,
  settle,
  settleMotion,
  waitFor,
} from "../internal/interaction.js";
import {
  CommandMenu,
  CommandMenuInput,
  CommandMenuList,
} from "../command-menu.js";
import { MotionProvider } from "../motion.js";
import { MotionProvider as PackageMotionProvider } from "@gpuixui/motion/react";
import { motionLevels, motionTimingOf } from "@gpuixui/motion/timing";
import { renderComponent } from "../internal/test-root.js";
import {
  presenceStyle,
  useSurfacePresence,
  type SurfaceTiming,
} from "../internal/presence.js";
import { Popover, PopoverContent, PopoverTrigger } from "../popover.js";
import {
  PreviewCard,
  PreviewCardContent,
  PreviewCardTrigger,
} from "../preview-card.js";
import { Reveal } from "../reveal.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../tabs.js";
import { ToastProvider, ToastViewport, useToast } from "../toast.js";

const Page = ({
  reducedMotion = false,
  children,
}: {
  readonly reducedMotion?: boolean;
  readonly children: React.ReactNode;
}) => (
  <MotionProvider preference={reducedMotion ? "reduced" : "animated"}>
    <div style={{ display: "flex", padding: 40 }}>{children}</div>
  </MotionProvider>
);

const delay = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 30));

const painted = (renderer: TestRoot["renderer"], testId: string): boolean =>
  renderer.findByTestId(testId) !== undefined;

const tabWalk = (
  page: ReturnType<typeof renderComponent>,
  from: string,
  steps: number,
): ReadonlyArray<string> => {
  const start = page.renderer.findByTestId(from);
  if (start !== undefined) page.renderer.focusElement(start.id);
  return Arr.makeBy(steps, () => {
    page.renderer.focusNext();
    return Option.getOrElse(focusedTestId(page), () => "none");
  });
};

const where = (
  renderer: TestRoot["renderer"],
  testId: string,
  axis: "x" | "y",
): number => {
  const instance = renderer.findByTestId(testId);
  if (instance === undefined) {
    throw new Error(`behaviour: no element with testId "${testId}"`);
  }
  const bounds = renderer.getElementBounds(instance.id);
  if (bounds === null) {
    throw new Error(`behaviour: "${testId}" painted no box`);
  }
  return bounds[axis];
};

describe("a modal surface", () => {
  it("rises into place, and paints its resting frame at once when motion is reduced", async () => {
    const page = renderComponent(
      <Page>
        <Dialog>
          <DialogTrigger testId="open">Rename</DialogTrigger>
          <DialogContent label="Rename" testId="dialog" size="sm">
            <DialogFooter>
              <DialogClose testId="cancel">Cancel</DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Page>,
    );
    page.renderer.clockPause();
    clickCentreOf(page, "open");
    await delay();
    const entering = where(page.renderer, "dialog", "y");

    page.renderer.clockFastForward(400);
    await delay();
    const resting = where(page.renderer, "dialog", "y");
    expect(entering - resting).toBe(8);

    clickCentreOf(page, "cancel");
    await waitFor(() => expect(painted(page.renderer, "dialog")).toBe(false));
    page.unmount();
  });

  it("keeps a dismissed dialog's own close control out of the window's tab order", async () => {
    const page = renderComponent(
      <Page>
        <Button testId="before">Before</Button>
        <Dialog>
          <DialogTrigger testId="open">Rename</DialogTrigger>
          <DialogContent label="Rename" testId="dialog" size="sm">
            <DialogFooter>
              <DialogClose testId="cancel">Cancel</DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Page>,
    );
    try {
      clickCentreOf(page, "open");
      await waitFor(() => expect(painted(page.renderer, "dialog")).toBe(true));

      expect(tabWalk(page, "before", 5)).toContain("dialog-close");
      expect(tabWalk(page, "before", 5)).toContain("cancel");

      page.renderer.focusElement(
        page.renderer.findByTestId("cancel")?.id ?? -1,
      );
      page.renderer.simulateKeystrokes("escape");
      await delay();
      expect(painted(page.renderer, "dialog")).toBe(true);
      expect(Option.getOrElse(focusedTestId(page), () => "none")).toBe("open");

      expect(tabWalk(page, "before", 5)).not.toContain("dialog-close");

      expect(tabWalk(page, "before", 5)).not.toContain("cancel");
    } finally {
      page.unmount();
    }
  });

  it("keeps a dismissed drawer's own close controls out of the window's tab order", async () => {
    const page = renderComponent(
      <Page>
        <Button testId="before">Before</Button>
        <Drawer>
          <DrawerTrigger testId="open">Filters</DrawerTrigger>
          <DrawerContent label="Filters" testId="drawer">
            <DrawerClose testId="cancel">Cancel</DrawerClose>
          </DrawerContent>
        </Drawer>
      </Page>,
    );
    try {
      clickCentreOf(page, "open");
      await waitFor(() => expect(painted(page.renderer, "drawer")).toBe(true));
      expect(tabWalk(page, "before", 5)).toContain("drawer-close");
      expect(tabWalk(page, "before", 5)).toContain("cancel");

      page.renderer.focusElement(
        page.renderer.findByTestId("cancel")?.id ?? -1,
      );
      page.renderer.simulateKeystrokes("escape");
      await delay();
      expect(painted(page.renderer, "drawer")).toBe(true);

      expect(tabWalk(page, "before", 5)).not.toContain("drawer-close");
      expect(tabWalk(page, "before", 5)).not.toContain("cancel");
    } finally {
      page.unmount();
    }
  });

  it("keeps a dismissed command palette's field out of the window's tab order", async () => {
    const Palette = () => {
      const [open, setOpen] = useState(true);
      return (
        <Page>
          <Button testId="before">Before</Button>
          <CommandMenu
            open={open}
            onOpenChange={setOpen}
            actions={[{ id: "save", label: "Save", perform: () => undefined }]}
          >
            <CommandMenuInput />
            <CommandMenuList />
          </CommandMenu>
        </Page>
      );
    };
    const page = renderComponent(<Palette />);
    try {
      await waitFor(() =>
        expect(painted(page.renderer, "command-menu")).toBe(true),
      );

      expect(tabWalk(page, "before", 6)).toContain("command-input");

      page.renderer.focusElement(
        page.renderer.findByTestId("command-input")?.id ?? -1,
      );
      page.renderer.simulateKeystrokes("escape");
      await delay();
      expect(painted(page.renderer, "command-menu")).toBe(true);

      expect(tabWalk(page, "before", 6)).not.toContain("command-input");
    } finally {
      page.unmount();
    }
  });

  it("travels back out while it leaves", async () => {
    const page = renderComponent(
      <Page>
        <Dialog>
          <DialogTrigger testId="open">Rename</DialogTrigger>
          <DialogContent label="Rename" testId="dialog" size="sm">
            <DialogFooter>
              <DialogClose testId="cancel">Cancel</DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Page>,
    );
    page.renderer.clockPause();
    clickCentreOf(page, "open");
    await delay();
    page.renderer.clockFastForward(400);
    await delay();
    const resting = where(page.renderer, "dialog", "y");

    clickCentreOf(page, "cancel");
    await delay();
    expect(where(page.renderer, "dialog", "y")).toBe(resting);
    page.renderer.clockFastForward(250);
    await delay();
    const leaving = where(page.renderer, "dialog", "y");
    expect(leaving).toBeGreaterThan(resting);
    page.renderer.clockResume();
    await waitFor(() => expect(painted(page.renderer, "dialog")).toBe(false));
    page.unmount();
  });

  it("keeps the surface through its exit, and returns focus when it is dismissed", async () => {
    const page = renderComponent(
      <Page>
        <Dialog>
          <DialogTrigger testId="open">Rename</DialogTrigger>
          <DialogContent label="Rename" testId="dialog" size="sm">
            <DialogFooter>
              <DialogClose testId="cancel">Cancel</DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Page>,
    );
    clickCentreOf(page, "open");
    await waitFor(() => expect(painted(page.renderer, "dialog")).toBe(true));

    clickCentreOf(page, "cancel");
    await delay();

    expect(painted(page.renderer, "dialog")).toBe(true);

    expect(Option.getOrElse(focusedTestId(page), () => "none")).toBe("open");

    await waitFor(() => expect(painted(page.renderer, "dialog")).toBe(false));
    page.unmount();
  });

  it("lets a press through its veil while it leaves", async () => {
    const onBehind = vi.fn();
    const page = renderComponent(
      <Page>
        <div style={{ position: "relative", width: 700, height: 400 }}>
          <Button
            testId="behind"
            onClick={onBehind}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: 200,
              height: 60,
            }}
          >
            Behind
          </Button>
          <Dialog>
            <DialogTrigger
              testId="open"
              style={{ position: "absolute", left: 300, top: 0 }}
            >
              Rename
            </DialogTrigger>
            <DialogContent label="Rename" testId="dialog" size="sm">
              <DialogFooter>
                <DialogClose testId="cancel">Cancel</DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </Page>,
    );
    clickCentreOf(page, "open");
    await waitFor(() => expect(painted(page.renderer, "dialog")).toBe(true));

    page.renderer.simulateKeystrokes("escape");
    await delay();

    expect(painted(page.renderer, "dialog-backdrop")).toBe(true);

    clickCentreOf(page, "behind");
    expect(onBehind).toHaveBeenCalledTimes(1);

    await waitFor(() => expect(painted(page.renderer, "dialog")).toBe(false));
    page.unmount();
  });

  it("paints the resting frame with no travel under reduced motion", async () => {
    const page = renderComponent(
      <Page reducedMotion>
        <Dialog>
          <DialogTrigger testId="open">Rename</DialogTrigger>
          <DialogContent label="Rename" testId="dialog" size="sm">
            <DialogFooter>
              <DialogClose testId="cancel">Cancel</DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Page>,
    );
    page.renderer.clockPause();
    clickCentreOf(page, "open");
    await delay();
    const entering = where(page.renderer, "dialog", "y");
    page.renderer.clockFastForward(400);
    await delay();
    expect(where(page.renderer, "dialog", "y")).toBe(entering);
    page.unmount();
  });

  const ControlledDialog = ({ open }: { readonly open: boolean }) => (
    <Page>
      <Dialog open={open} onOpenChange={() => undefined}>
        <DialogTrigger testId="open">Rename</DialogTrigger>
        <DialogContent label="Rename" testId="dialog" size="sm">
          <DialogFooter>
            <DialogClose testId="cancel">Cancel</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );

  it("keeps the instance a re-open finds, and outlives the leave it cancelled", async () => {
    const page = renderComponent(<ControlledDialog open={false} />);
    page.rerender(<ControlledDialog open />);
    await waitFor(() => expect(painted(page.renderer, "dialog")).toBe(true));
    page.renderer.clockPause();
    page.renderer.clockFastForward(400);
    await delay();
    const rest = where(page.renderer, "dialog", "y");

    page.rerender(<ControlledDialog open={false} />);
    await delay();
    page.renderer.clockFastForward(100);
    await delay();
    const leaving = where(page.renderer, "dialog", "y");
    expect(leaving).toBeGreaterThan(rest);

    page.rerender(<ControlledDialog open />);
    await delay();

    expect(where(page.renderer, "dialog", "y")).toBe(leaving);

    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(painted(page.renderer, "dialog")).toBe(true);
    page.renderer.clockFastForward(400);
    await delay();
    expect(where(page.renderer, "dialog", "y")).toBe(rest);

    page.renderer.clockResume();
    page.rerender(<ControlledDialog open={false} />);
    await waitFor(() => expect(painted(page.renderer, "dialog")).toBe(false));
    page.unmount();
  });
});

describe("the preference", () => {
  it("is the motion package's provider, not one of this package's own", () => {
    const page = renderComponent(
      <PackageMotionProvider preference="reduced">
        <div
          testId="frame"
          style={{ display: "flex", flexDirection: "column" }}
        >
          <Reveal testId="reveal" distance={12} />
        </div>
      </PackageMotionProvider>,
    );
    try {
      page.renderer.clockPause();
      settle(page);
      expect(
        where(page.renderer, "reveal", "y") -
          where(page.renderer, "frame", "y"),
      ).toBeCloseTo(0, 1);
      expect(
        page.renderer.findByTestId("reveal")?.customProps?.motion,
      ).toMatchObject({ transition: { duration: 0 } });
    } finally {
      page.unmount();
    }
  });

  it("fails safe when the stored preference is not a name the library carries", () => {
    const tree = (preference: string | null) => (
      <PackageMotionProvider preference={preference}>
        <div
          testId="frame"
          style={{ display: "flex", flexDirection: "column" }}
        >
          <Reveal testId="reveal" distance={12} />
        </div>
      </PackageMotionProvider>
    );
    const page = renderComponent(tree("Reduced"));
    try {
      page.renderer.clockPause();
      settle(page);

      expect(
        where(page.renderer, "reveal", "y") -
          where(page.renderer, "frame", "y"),
      ).toBeCloseTo(0, 1);
      expect(
        page.renderer.findByTestId("reveal")?.customProps?.motion,
      ).toMatchObject({ transition: { duration: 0 } });
    } finally {
      page.unmount();
    }

    const absent = renderComponent(tree(null));
    try {
      absent.renderer.clockPause();
      settle(absent);
      expect(
        where(absent.renderer, "reveal", "y") -
          where(absent.renderer, "frame", "y"),
      ).toBeCloseTo(12, 1);
      expect(
        absent.renderer.findByTestId("reveal")?.customProps?.motion,
      ).toMatchObject({ transition: { duration: 0.2 } });
    } finally {
      absent.unmount();
    }
  });
});

describe("an edge panel", () => {
  it("keeps a dismissed drawer's own close control out of the window's tab order", async () => {
    const page = renderComponent(
      <Page>
        <Button testId="before">Before</Button>
        <Drawer>
          <DrawerTrigger testId="open">Filters</DrawerTrigger>
          <DrawerContent label="Filters" testId="drawer" side="right">
            <Button testId="done">Done</Button>
          </DrawerContent>
        </Drawer>
      </Page>,
    );
    try {
      clickCentreOf(page, "open");
      await waitFor(() => expect(painted(page.renderer, "drawer")).toBe(true));
      expect(tabWalk(page, "before", 5)).toContain("drawer-close");

      page.renderer.focusElement(page.renderer.findByTestId("done")?.id ?? -1);
      page.renderer.simulateKeystrokes("escape");
      await delay();
      expect(painted(page.renderer, "drawer")).toBe(true);

      expect(tabWalk(page, "before", 5)).not.toContain("drawer-close");
    } finally {
      page.unmount();
    }
  });

  it("slides in from the edge it is anchored to", async () => {
    const page = renderComponent(
      <Page>
        <Drawer>
          <DrawerTrigger testId="open">Filters</DrawerTrigger>
          <DrawerContent label="Filters" testId="drawer" side="right">
            <Button testId="close">Done</Button>
          </DrawerContent>
        </Drawer>
      </Page>,
    );
    page.renderer.clockPause();
    clickCentreOf(page, "open");
    await delay();
    const entering = where(page.renderer, "drawer", "x");

    page.renderer.clockFastForward(400);
    await delay();

    expect(entering - where(page.renderer, "drawer", "x")).toBe(400);
    page.unmount();
  });
});

describe("an anchored surface", () => {
  it("travels out from its trigger", async () => {
    const page = renderComponent(
      <Page>
        <Popover>
          <PopoverTrigger testId="open">Filters</PopoverTrigger>
          <PopoverContent testId="popover">Body</PopoverContent>
        </Popover>
      </Page>,
    );
    page.renderer.clockPause();
    clickCentreOf(page, "open");
    await delay();
    const entering = where(page.renderer, "popover", "y");

    page.renderer.clockFastForward(400);
    await delay();

    expect(where(page.renderer, "popover", "y") - entering).toBe(8);
    page.unmount();
  });

  it("does the same for a menu and for a preview card", async () => {
    const menu = renderComponent(
      <Page>
        <DropdownMenu>
          <DropdownMenuTrigger testId="open">Actions</DropdownMenuTrigger>
          <DropdownMenuContent testId="menu">
            <DropdownMenuItem>Rename</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Page>,
    );
    menu.renderer.clockPause();
    clickCentreOf(menu, "open");
    await delay();
    const entering = where(menu.renderer, "menu", "y");
    menu.renderer.clockFastForward(300);
    await delay();
    expect(where(menu.renderer, "menu", "y") - entering).toBe(4);
    menu.unmount();

    const CardPage = ({ open }: { readonly open: boolean }) => (
      <Page>
        <PreviewCard open={open} openDelay={0}>
          <PreviewCardTrigger testId="card-trigger">Ada</PreviewCardTrigger>
          <PreviewCardContent testId="card" label="Ada">
            Engineer
          </PreviewCardContent>
        </PreviewCard>
      </Page>
    );
    const card = renderComponent(<CardPage open={false} />);
    card.renderer.clockPause();
    card.rerender(<CardPage open />);
    await delay();
    const cardEntering = where(card.renderer, "card", "y");
    card.renderer.clockFastForward(300);
    await delay();
    expect(where(card.renderer, "card", "y") - cardEntering).toBe(4);
    card.unmount();
  });

  it("keeps a dismissed menu painted for its exit", async () => {
    const page = renderComponent(
      <Page>
        <DropdownMenu>
          <DropdownMenuTrigger testId="open">Actions</DropdownMenuTrigger>
          <DropdownMenuContent testId="menu">
            <DropdownMenuItem>Rename</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Page>,
    );
    clickCentreOf(page, "open");
    await waitFor(() => expect(painted(page.renderer, "menu")).toBe(true));
    clickCentreOf(page, "open");
    await delay();
    expect(painted(page.renderer, "menu")).toBe(true);
    await waitFor(() => expect(painted(page.renderer, "menu")).toBe(false));
    page.unmount();
  });
});

describe("a submenu", () => {
  const SubmenuPage = ({
    reducedMotion = false,
  }: {
    readonly reducedMotion?: boolean;
  }) => (
    <Page reducedMotion={reducedMotion}>
      <DropdownMenu>
        <DropdownMenuTrigger testId="open">Actions</DropdownMenuTrigger>
        <DropdownMenuContent testId="menu" label="File actions">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger testId="share">
              Share
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent testId="submenu" label="Share">
              <DropdownMenuItem>Copy link</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    </Page>
  );

  it("travels out from its row and keeps its box for the exit tween", async () => {
    const page = renderComponent(<SubmenuPage />);
    page.renderer.clockPause();
    clickCentreOf(page, "open");
    await delay();
    clickCentreOf(page, "share");
    await delay();
    const entering = where(page.renderer, "submenu", "x");

    page.renderer.clockFastForward(400);
    await delay();

    expect(where(page.renderer, "submenu", "x") - entering).toBe(4);

    page.renderer.simulateKeystrokes("left");
    await delay();

    expect(painted(page.renderer, "submenu")).toBe(true);
    expect(page.renderer.findByTestId("submenu")?.style.pointerEvents).toBe(
      "none",
    );

    await waitFor(() => expect(painted(page.renderer, "submenu")).toBe(false));
    page.unmount();
  });

  it("paints at rest and unmounts at once under reduced motion", async () => {
    const page = renderComponent(<SubmenuPage reducedMotion />);
    page.renderer.clockPause();
    clickCentreOf(page, "open");
    await delay();
    clickCentreOf(page, "share");
    await delay();
    const resting = where(page.renderer, "submenu", "x");

    page.renderer.clockFastForward(400);
    await delay();
    expect(where(page.renderer, "submenu", "x")).toBe(resting);

    page.renderer.simulateKeystrokes("left");
    await waitFor(() => expect(painted(page.renderer, "submenu")).toBe(false));
    page.unmount();
  });
});

describe("a context menu", () => {
  const OverlapPage = ({
    onBehind,
    onRow,
  }: {
    readonly onBehind: () => void;
    readonly onRow: () => void;
  }) => (
    <Page>
      <div style={{ position: "relative", width: 600, height: 400 }}>
        <Button
          testId="behind"
          onClick={onBehind}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 600,
            height: 400,
          }}
        >
          Behind
        </Button>
        <ContextMenu>
          <ContextMenuTrigger testId="row" style={{ width: 200, height: 32 }}>
            <text>Project</text>
          </ContextMenuTrigger>
          <ContextMenuContent testId="menu" label="Project actions">
            <ContextMenuItem onSelect={onRow}>Open</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </div>
    </Page>
  );

  const originOf = (
    page: ReturnType<typeof renderComponent>,
    testId: string,
  ): {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  } =>
    Option.getOrElse(boundsOf(page, testId), () => {
      throw new Error(`behaviour: "${testId}" painted no box`);
    });

  it("stays painted for its exit without any control answering", async () => {
    const onBehind = vi.fn();
    const onRow = vi.fn();
    const page = renderComponent(
      <OverlapPage onBehind={onBehind} onRow={onRow} />,
    );
    const row = originOf(page, "row");

    page.renderer.nativeSimulateClick(row.x + 10, row.y + row.height / 2, 2);
    await waitFor(() => expect(painted(page.renderer, "menu")).toBe(true));
    const menu = originOf(page, "menu");

    page.renderer.simulateKeystrokes("escape");
    await delay();

    const leaving = page.renderer.findByTestId("menu");
    expect(leaving).toBeDefined();
    expect(leaving?.style.pointerEvents).toBe("none");

    page.renderer.nativeSimulateClick(menu.x + menu.width / 2, menu.y + 20);
    expect(onRow).not.toHaveBeenCalled();
    expect(onBehind).not.toHaveBeenCalled();

    await waitFor(() => expect(painted(page.renderer, "menu")).toBe(false));

    page.renderer.nativeSimulateClick(menu.x + menu.width / 2, menu.y + 20);
    expect(onBehind).toHaveBeenCalledTimes(1);
    page.unmount();
  });
});

describe("a section", () => {
  it("grows from nothing to its measured height, and collapses again", async () => {
    const page = renderComponent(
      <Page>
        <Accordion type="single" collapsible>
          <AccordionItem value="shipping">
            <AccordionTrigger testId="trigger">Shipping</AccordionTrigger>
            <AccordionContent testId="body">
              <text>Ships in two days.</text>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Page>,
    );
    page.renderer.clockPause();
    clickCentreOf(page, "trigger");
    settle(page);
    await delay();
    expect(painted(page.renderer, "body")).toBe(true);
    expect(
      Option.getOrElse(
        Option.map(boundsOf(page, "body"), (box) => box.height),
        () => -1,
      ),
    ).toBe(0);

    page.renderer.clockFastForward(400);
    settle(page);
    await waitFor(() =>
      expect(
        Option.getOrElse(
          Option.map(boundsOf(page, "body"), (box) => box.height),
          () => 0,
        ),
      ).toBeGreaterThan(0),
    );

    clickCentreOf(page, "trigger");
    await delay();

    expect(painted(page.renderer, "body")).toBe(true);
    await waitFor(() => expect(painted(page.renderer, "body")).toBe(false));
    page.unmount();
  });
});

describe("a tab pill", () => {
  it("slides between triggers instead of jumping", async () => {
    const page = renderComponent(
      <Page>
        <Tabs defaultValue="one">
          <TabsList label="Views">
            <TabsTrigger testId="one" value="one">
              Overview
            </TabsTrigger>
            <TabsTrigger testId="two" value="two">
              Activity
            </TabsTrigger>
          </TabsList>
          <TabsContent value="one">Overview</TabsContent>
          <TabsContent value="two">Activity</TabsContent>
        </Tabs>
      </Page>,
    );
    settle(page);
    await waitFor(() =>
      expect(painted(page.renderer, "tabs-indicator")).toBe(true),
    );
    const from = where(page.renderer, "tabs-indicator", "x");
    const target = where(page.renderer, "two", "x");

    page.renderer.clockPause();
    clickCentreOf(page, "two");
    await delay();

    expect(where(page.renderer, "tabs-indicator", "x")).toBe(from);

    page.renderer.clockFastForward(400);
    await delay();

    expect(where(page.renderer, "tabs-indicator", "x")).toBe(target);
    page.unmount();
  });

  it("eases between two resting places instead of arriving", async () => {
    const page = renderComponent(
      <Page>
        <Tabs defaultValue="one">
          <TabsList label="Views">
            <TabsTrigger testId="one" value="one">
              Overview
            </TabsTrigger>
            <TabsTrigger testId="two" value="two">
              Activity
            </TabsTrigger>
          </TabsList>
          <TabsContent value="one">Overview</TabsContent>
          <TabsContent value="two">Activity</TabsContent>
        </Tabs>
      </Page>,
    );

    try {
      settle(page);
      await waitFor(() =>
        expect(painted(page.renderer, "tabs-indicator")).toBe(true),
      );
      const from = where(page.renderer, "tabs-indicator", "x");
      const target = where(page.renderer, "two", "x");

      page.renderer.clockPause();
      clickCentreOf(page, "two");
      await delay();
      page.renderer.clockFastForward(motionLevels.normal / 2);
      await delay();

      const share =
        (where(page.renderer, "tabs-indicator", "x") - from) / (target - from);
      expect(share).toBeGreaterThan(0.4);
      expect(share).toBeLessThan(0.6);
    } finally {
      page.unmount();
    }
  });
});

const FanPage = () => {
  const toast = useToast();
  return (
    <Page>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: 600,
          height: 500,
          position: "relative",
        }}
      >
        <Button
          testId="push-two"
          onClick={() => {
            toast.push({ title: "First" });
            toast.push({ title: "Second" });
          }}
        >
          Push two
        </Button>
        <ToastViewport />
      </div>
    </Page>
  );
};

const ToastPage = () => {
  const toast = useToast();
  return (
    <Page>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: 1200,
          height: 760,
          position: "relative",
        }}
      >
        <Button testId="push" onClick={() => toast.push({ title: "Saved" })}>
          Push
        </Button>
        <ToastViewport />
      </div>
    </Page>
  );
};

describe("a notice", () => {
  it("slides in from the right edge and slides away toward it", async () => {
    const page = renderComponent(
      <ToastProvider>
        <ToastPage />
      </ToastProvider>,
    );
    try {
      page.renderer.clockPause();
      clickCentreOf(page, "push");
      await delay();
      settle(page);
      const entering = where(page.renderer, "toast-1", "x");
      page.renderer.clockFastForward(700);
      await delay();
      settle(page);
      const resting = where(page.renderer, "toast-1", "x");
      expect(entering - resting).toBe(16);

      clickCentreOf(page, "toast-dismiss-1");
      await delay();
      expect(painted(page.renderer, "toast-1")).toBe(true);

      page.renderer.clockFastForward(1);
      await delay();
      page.renderer.clockFastForward(80);
      await delay();
      settle(page);
      const leavingX = where(page.renderer, "toast-1", "x");
      expect(leavingX).toBeGreaterThan(resting);
      expect(leavingX).toBeLessThan(resting + 16);

      await waitFor(() =>
        expect(painted(page.renderer, "toast-1")).toBe(false),
      );
    } finally {
      page.renderer.clockResume();
      page.unmount();
    }
  });

  it("unfolds the strips and folds them back on leave", async () => {
    const page = renderComponent(
      <ToastProvider>
        <FanPage />
      </ToastProvider>,
    );
    try {
      page.renderer.clockPause();
      clickCentreOf(page, "push-two");
      await waitFor(() => expect(painted(page.renderer, "toast-2")).toBe(true));
      settle(page);
      page.renderer.clockFastForward(700);
      settle(page);
      await delay();
      const folded = heightOf(page.renderer, "toast-1");

      hoverCentreOf(page, "toast-2");
      page.renderer.clockFastForward(400);
      settle(page);
      await delay();
      const unfolded = heightOf(page.renderer, "toast-1");
      expect(unfolded).toBeGreaterThan(folded);

      hoverCentreOf(page, "push-two");
      await new Promise((resolve) => setTimeout(resolve, 160));
      settle(page);
      page.renderer.clockFastForward(400);
      settle(page);
      await delay();
      expect(heightOf(page.renderer, "toast-1")).toBeCloseTo(folded, 0);
    } finally {
      page.renderer.clockResume();
      page.unmount();
    }
  });
});

const ControlledDialog = () => {
  const [open, setOpen] = useState(false);
  return (
    <Page>
      <Button testId="open" onClick={() => setOpen(true)}>
        Command
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent label="Command menu" testId="palette" size="md">
          <Button testId="cancel" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </DialogContent>
      </Dialog>
    </Page>
  );
};

describe("the command palette", () => {
  it("inherits the dialog's entry motion", async () => {
    const page = renderComponent(<ControlledDialog />);
    try {
      page.renderer.clockPause();
      clickCentreOf(page, "open");
      await delay();
      const entering = where(page.renderer, "palette", "y");
      page.renderer.clockFastForward(400);
      await delay();
      expect(entering - where(page.renderer, "palette", "y")).toBe(8);
    } finally {
      page.renderer.clockResume();
      page.unmount();
    }
  });
});

const PreferencePage = ({ reduced }: { readonly reduced: boolean }) => (
  <Page reducedMotion={reduced}>
    <Dialog>
      <DialogTrigger testId="open">Rename</DialogTrigger>
      <DialogContent label="Rename" testId="dialog" size="sm">
        <DialogFooter>
          <DialogClose testId="cancel">Cancel</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </Page>
);

const heightOf = (renderer: TestRoot["renderer"], testId: string): number => {
  const instance = renderer.findByTestId(testId);
  if (instance === undefined) {
    throw new Error(`behaviour: no element with testId "${testId}"`);
  }
  const bounds = renderer.getElementBounds(instance.id);
  if (bounds === null) {
    throw new Error(`behaviour: "${testId}" painted no box`);
  }
  return bounds.height;
};

const PreferenceToast = ({ reduced }: { readonly reduced: boolean }) => (
  <ToastProvider>
    <Page reducedMotion={reduced}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: 1200,
          height: 760,
          position: "relative",
        }}
      >
        <ToastPusher />
        <ToastViewport />
      </div>
    </Page>
  </ToastProvider>
);

const ToastPusher = () => {
  const toast = useToast();
  return (
    <Button testId="push-notice" onClick={() => toast.push({ title: "Saved" })}>
      Push
    </Button>
  );
};

describe("the preference", () => {
  it("settles a surface that is still moving when the setting turns on", async () => {
    const page = renderComponent(<PreferencePage reduced={false} />);
    try {
      page.renderer.clockPause();
      clickCentreOf(page, "open");
      await delay();
      const entering = where(page.renderer, "dialog", "y");

      page.rerender(<PreferencePage reduced />);
      await delay();
      const settled = where(page.renderer, "dialog", "y");

      expect(entering - settled).toBe(8);

      page.renderer.clockFastForward(400);
      await delay();
      expect(where(page.renderer, "dialog", "y")).toBe(settled);
    } finally {
      page.renderer.clockResume();
      page.unmount();
    }
  });

  it("paints a section at its measured height on the first frame", async () => {
    const page = renderComponent(
      <Page reducedMotion>
        <Accordion type="single" collapsible>
          <AccordionItem value="shipping">
            <AccordionTrigger testId="trigger">Shipping</AccordionTrigger>
            <AccordionContent testId="body">
              <text>Ships in two days.</text>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Page>,
    );
    try {
      page.renderer.clockPause();
      clickCentreOf(page, "trigger");
      settle(page);
      await delay();
      const first = heightOf(page.renderer, "body");

      page.renderer.clockFastForward(400);
      settle(page);
      await delay();
      expect(first).toBeGreaterThan(0);
      expect(heightOf(page.renderer, "body")).toBe(first);
    } finally {
      page.renderer.clockResume();
      page.unmount();
    }
  });

  it("removes a dismissed notice at once when the setting turns on", async () => {
    const page = renderComponent(<PreferenceToast reduced={false} />);
    try {
      page.renderer.clockPause();
      clickCentreOf(page, "push-notice");
      await waitFor(() => expect(painted(page.renderer, "toast-1")).toBe(true));

      settle(page);
      page.renderer.clockFastForward(700);
      settle(page);
      await delay();

      clickCentreOf(page, "toast-dismiss-1");
      await delay();
      expect(painted(page.renderer, "toast-1")).toBe(true);

      page.rerender(<PreferenceToast reduced />);
      await delay();
      await delay();

      expect(painted(page.renderer, "toast-1")).toBe(false);
    } finally {
      page.renderer.clockResume();
      page.unmount();
    }
  });

  it("removes a panel at once when the setting turns on while it leaves", async () => {
    const page = renderComponent(<PreferencePage reduced={false} />);
    try {
      clickCentreOf(page, "open");
      await waitFor(() => expect(painted(page.renderer, "dialog")).toBe(true));
      await delay();
      page.renderer.simulateKeystrokes("escape");
      await delay();
      expect(painted(page.renderer, "dialog")).toBe(true);

      page.rerender(<PreferencePage reduced />);
      await delay();
      await delay();

      expect(painted(page.renderer, "dialog")).toBe(false);
    } finally {
      page.unmount();
    }
  });
});

describe("a control inside a leaving surface", () => {
  it("does not answer a press in a dismissed dialog", async () => {
    const confirm = vi.fn();
    const page = renderComponent(
      <Page>
        <Dialog>
          <DialogTrigger testId="open">Rename</DialogTrigger>
          <DialogContent label="Rename" testId="dialog" size="sm">
            <DialogFooter>
              <Button testId="confirm" onClick={confirm}>
                Confirm
              </Button>
              <DialogClose testId="cancel">Cancel</DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Page>,
    );
    try {
      clickCentreOf(page, "open");
      await waitFor(() => expect(painted(page.renderer, "dialog")).toBe(true));

      clickCentreOf(page, "cancel");
      await delay();
      expect(painted(page.renderer, "dialog")).toBe(true);
      clickCentreOf(page, "confirm");
      expect(confirm).not.toHaveBeenCalled();
    } finally {
      page.unmount();
    }
  });

  it("does not answer a press in a dismissed drawer", async () => {
    const apply = vi.fn();
    const page = renderComponent(
      <Page>
        <Drawer>
          <DrawerTrigger testId="open">Filters</DrawerTrigger>
          <DrawerContent label="Filters" testId="drawer" side="right" size="sm">
            <Button testId="apply" onClick={apply}>
              Apply
            </Button>
            <DrawerClose testId="close">Close</DrawerClose>
          </DrawerContent>
        </Drawer>
      </Page>,
    );
    try {
      clickCentreOf(page, "open");
      await waitFor(() => expect(painted(page.renderer, "drawer")).toBe(true));

      clickCentreOf(page, "close");
      await delay();
      expect(painted(page.renderer, "drawer")).toBe(true);
      clickCentreOf(page, "apply");
      expect(apply).not.toHaveBeenCalled();
    } finally {
      page.unmount();
    }
  });

  it("paints the seam's shield over a dismissed notice", async () => {
    const NoticePage = () => {
      const toast = useToast();
      return (
        <Page>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <Button
              testId="push"
              onClick={() =>
                toast.push(
                  { title: "Saved", action: { label: "Undo" } },
                  { onAction: () => undefined },
                )
              }
            >
              Push
            </Button>
            <ToastViewport />
          </div>
        </Page>
      );
    };
    const page = renderComponent(
      <ToastProvider>
        <NoticePage />
      </ToastProvider>,
    );
    try {
      clickCentreOf(page, "push");
      await waitFor(() => expect(painted(page.renderer, "toast-1")).toBe(true));
      settle(page);
      settleMotion(page);
      expect(page.renderer.findByTestId("presence-shield")).toBeUndefined();

      clickCentreOf(page, "toast-dismiss-1");
      await delay();
      expect(painted(page.renderer, "toast-1")).toBe(true);
      expect(painted(page.renderer, "presence-shield")).toBe(true);

      await waitFor(() =>
        expect(painted(page.renderer, "toast-1")).toBe(false),
      );
      expect(page.renderer.findByTestId("presence-shield")).toBeUndefined();
    } finally {
      page.unmount();
    }
  });

  it("keeps the action a dismissed notice was thrown with", async () => {
    const onAction = vi.fn();
    const NoticePage = () => {
      const toast = useToast();
      return (
        <Page>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <Button
              testId="push"
              onClick={() =>
                toast.push(
                  {
                    title: "Saved",
                    description: "The file is on disk",
                    action: { label: "Undo" },
                  },
                  { onAction },
                )
              }
            >
              Push
            </Button>
            <ToastViewport />
          </div>
        </Page>
      );
    };
    const page = renderComponent(
      <ToastProvider>
        <NoticePage />
      </ToastProvider>,
    );
    try {
      clickCentreOf(page, "push");
      await waitFor(() =>
        expect(painted(page.renderer, "toast-action-1")).toBe(true),
      );
      settle(page);
      settleMotion(page);
      const resting = Option.getOrElse(boundsOf(page, "toast-action-1"), () => {
        throw new Error("behaviour: the action painted no box");
      });

      clickCentreOf(page, "toast-dismiss-1");
      await delay();
      expect(painted(page.renderer, "toast-1")).toBe(true);
      const leaving = Option.getOrElse(boundsOf(page, "toast-action-1"), () => {
        throw new Error("behaviour: the ghost lost its action");
      });
      expect([leaving.width, leaving.height]).toEqual([
        resting.width,
        resting.height,
      ]);

      clickCentreOf(page, "toast-action-1");
      expect(onAction).not.toHaveBeenCalled();

      await waitFor(() =>
        expect(painted(page.renderer, "toast-1")).toBe(false),
      );
    } finally {
      page.unmount();
    }
  });

  it("does not answer a press in a section that is collapsing", async () => {
    const inside = vi.fn();
    const page = renderComponent(
      <Page>
        <Accordion type="single" collapsible>
          <AccordionItem value="shipping">
            <AccordionTrigger testId="trigger">Shipping</AccordionTrigger>
            <AccordionContent testId="body">
              <Button testId="inside" onClick={inside}>
                Inside
              </Button>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Page>,
    );
    try {
      page.renderer.clockPause();
      clickCentreOf(page, "trigger");
      settle(page);
      page.renderer.clockFastForward(400);
      settle(page);
      await waitFor(() =>
        expect(
          Option.getOrElse(
            Option.map(boundsOf(page, "inside"), (box) => box.height),
            () => 0,
          ),
        ).toBeGreaterThan(0),
      );

      clickCentreOf(page, "trigger");
      settle(page);
      expect(painted(page.renderer, "body")).toBe(true);
      clickCentreOf(page, "inside");
      expect(inside).not.toHaveBeenCalled();
    } finally {
      page.renderer.clockResume();
      page.unmount();
    }
  });

  it("does not answer a press in a reveal that is leaving", async () => {
    const inside = vi.fn();
    const page = renderComponent(
      <Page>
        <Reveal open testId="reveal">
          <Button testId="inside" onClick={inside}>
            Inside
          </Button>
        </Reveal>
      </Page>,
    );
    try {
      settleMotion(page);
      page.rerender(
        <Page>
          <Reveal open={false} testId="reveal">
            <Button testId="inside" onClick={inside}>
              Inside
            </Button>
          </Reveal>
        </Page>,
      );
      settle(page);
      expect(painted(page.renderer, "inside")).toBe(true);
      clickCentreOf(page, "inside");
      expect(inside).not.toHaveBeenCalled();
    } finally {
      page.unmount();
    }
  });

  it("does not run a row inside a dismissed menu", async () => {
    const ghostPress = vi.fn();
    const behindPress = vi.fn();
    const page = renderComponent(
      <Page>
        <div style={{ position: "relative", width: 700, height: 400 }}>
          <Button
            testId="behind"
            onClick={behindPress}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: 300,
              height: 200,
            }}
          >
            Behind
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              testId="open"
              style={{ position: "absolute", left: 0, top: 240 }}
            >
              Actions
            </DropdownMenuTrigger>
            <DropdownMenuContent testId="menu" label="Actions">
              <DropdownMenuItem testId="ghost" onSelect={ghostPress}>
                Open
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Page>,
    );
    try {
      clickCentreOf(page, "open");
      await waitFor(() => expect(painted(page.renderer, "menu")).toBe(true));
      const ghost = Option.getOrElse(boundsOf(page, "ghost"), () => {
        throw new Error("behaviour: the row painted no box");
      });

      page.renderer.simulateKeystrokes("escape");
      await delay();
      expect(painted(page.renderer, "menu")).toBe(true);
      expect(page.renderer.findByTestId("menu")?.style.pointerEvents).toBe(
        "none",
      );

      page.renderer.nativeSimulateClick(
        ghost.x + ghost.width / 2,
        ghost.y + ghost.height / 2,
      );

      expect(ghostPress).not.toHaveBeenCalled();
      expect(behindPress).not.toHaveBeenCalled();

      await waitFor(() => expect(painted(page.renderer, "menu")).toBe(false));
    } finally {
      page.unmount();
    }
  });

  it("keeps a dismissed menu's rows out of the window's tab order", async () => {
    const page = renderComponent(
      <Page>
        <Button testId="before">Before</Button>
        <DropdownMenu>
          <DropdownMenuTrigger testId="open">Actions</DropdownMenuTrigger>
          <DropdownMenuContent testId="menu" label="Actions">
            <DropdownMenuItem testId="rename">Rename</DropdownMenuItem>
            <DropdownMenuItem testId="delete">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button testId="after">After</Button>
      </Page>,
    );
    try {
      clickCentreOf(page, "open");
      await waitFor(() => expect(painted(page.renderer, "menu")).toBe(true));
      settle(page);
      const live = tabWalk(page, "before", 4);
      expect(live).toEqual(expect.arrayContaining(["rename", "delete"]));

      page.renderer.simulateKeystrokes("escape");
      await delay();
      expect(Option.getOrElse(focusedTestId(page), () => "none")).toBe("open");
      expect(painted(page.renderer, "menu")).toBe(true);

      const ghost = tabWalk(page, "before", 6);
      expect(ghost).not.toContain("rename");
      expect(ghost).not.toContain("delete");
    } finally {
      page.unmount();
    }
  });

  it("does the same for a context menu, which paints the shared surface", async () => {
    const page = renderComponent(
      <Page>
        <Button testId="before">Before</Button>
        <ContextMenu>
          <ContextMenuTrigger testId="row" style={{ width: 200, height: 32 }}>
            <text>Project</text>
          </ContextMenuTrigger>
          <ContextMenuContent testId="menu" label="Project actions">
            <ContextMenuItem testId="open-project">Open</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
        <Button testId="after">After</Button>
      </Page>,
    );
    try {
      const row = Option.getOrElse(boundsOf(page, "row"), () => {
        throw new Error("behaviour: the trigger painted no box");
      });
      page.renderer.nativeSimulateClick(row.x + 10, row.y + row.height / 2, 2);
      await waitFor(() => expect(painted(page.renderer, "menu")).toBe(true));

      expect(tabWalk(page, "before", 3)).toContain("open-project");

      page.renderer.simulateKeystrokes("escape");
      await delay();
      expect(painted(page.renderer, "menu")).toBe(true);
      expect(page.renderer.findByTestId("menu")?.style.pointerEvents).toBe(
        "none",
      );
      expect(tabWalk(page, "before", 6)).not.toContain("open-project");
    } finally {
      page.unmount();
    }
  });
});

describe("a leaving subtree", () => {
  const leaving = (page: ReturnType<typeof renderComponent>) =>
    page.renderer.findByTestId("reveal")?.style.pointerEvents;

  it("paints the no-press guard while a reveal fades out", () => {
    const page = renderComponent(
      <Page>
        <Reveal open testId="reveal">
          <text>Notice</text>
        </Reveal>
      </Page>,
    );
    try {
      settleMotion(page);

      expect(leaving(page)).toBeUndefined();

      page.rerender(
        <Page>
          <Reveal open={false} testId="reveal">
            <text>Notice</text>
          </Reveal>
        </Page>,
      );
      settle(page);

      expect(painted(page.renderer, "reveal")).toBe(true);
      expect(leaving(page)).toBe("none");
    } finally {
      page.unmount();
    }
  });
});

const WindowProbe = ({
  open,
  waitMs,
}: {
  readonly open: boolean;
  readonly waitMs: number;
}) => {
  const timing: SurfaceTiming = {
    enter: { duration: 0.05 },
    exit: { duration: 0.05, delay: waitMs / 1000 },
  };
  const presence = useSurfacePresence(open, timing);
  return presence.mounted ? (
    <div
      testId="seam-window"
      style={{ width: 120, height: 60, ...presenceStyle(presence.present) }}
    />
  ) : null;
};

describe("the seam's mount window", () => {
  it("re-times a leave when the window changes, not only its duration", async () => {
    const page = renderComponent(<WindowProbe open waitMs={0} />);
    try {
      await delay();
      page.rerender(<WindowProbe open={false} waitMs={0} />);
      await delay();

      page.rerender(<WindowProbe open={false} waitMs={200} />);
      await new Promise((resolve) => setTimeout(resolve, 120));

      expect(painted(page.renderer, "seam-window")).toBe(true);
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(painted(page.renderer, "seam-window")).toBe(false);
    } finally {
      page.unmount();
    }
  });
});

const MotionProbe = ({
  testId,
  motion,
}: {
  readonly testId: string;
  readonly motion: MotionProps;
}) => (
  <div style={{ position: "relative", height: 40 }}>
    <div
      testId={testId}
      motion={motion}
      style={{ position: "absolute", left: 0, height: 10, width: 10 }}
    />
  </div>
);

const entering = (
  frames: PresenceFramesInput,
  timing: PresenceTiming = { enter: { duration: 10 }, exit: { duration: 10 } },
): MotionProps => motionOfPresence(frames, true, timing);

describe("a frame the renderer refuses", () => {
  it("drops the field, not the whole surface's motion", async () => {
    const page = renderComponent(
      <div>
        <MotionProbe
          testId="readable"
          motion={entering({
            initial: { opacity: 0, top: 8 },
            animate: { opacity: 1, top: 0 },
            exit: { opacity: 0 },
          })}
        />
        <MotionProbe
          testId="refused"
          motion={entering({
            initial: { opacity: 2, top: 8 },
            animate: { opacity: 1, top: 0 },
            exit: { opacity: 0 },
          })}
        />
      </div>,
    );
    try {
      page.renderer.clockPause();
      await delay();
      const readable = where(page.renderer, "readable", "y");
      const refused = where(page.renderer, "refused", "y");
      page.renderer.clockFastForward(20_000);
      await delay();

      expect(readable - where(page.renderer, "readable", "y")).toBe(8);
      expect(refused - where(page.renderer, "refused", "y")).toBe(8);
    } finally {
      page.unmount();
    }
  });
});

const storedDuration = (durationMs: number): MotionProps =>
  motionOfPresence(
    { initial: { top: 8 }, animate: { top: 0 }, exit: { top: 8 } },
    true,
    {
      enter: motionTimingOf(durationMs, { phase: "enter" }),
      exit: { duration: 0 },
    },
  );

describe("a duration the renderer refuses", () => {
  it("travels on a stored duration past the clock, read as the house arrival", async () => {
    const page = renderComponent(
      <div>
        <MotionProbe testId="scheduled" motion={storedDuration(220)} />
        <MotionProbe testId="past" motion={storedDuration(1e300)} />
      </div>,
    );
    try {
      page.renderer.clockPause();
      await delay();
      const scheduled = where(page.renderer, "scheduled", "y");
      const past = where(page.renderer, "past", "y");
      page.renderer.clockFastForward(20_000);
      await delay();

      expect(scheduled - where(page.renderer, "scheduled", "y")).toBe(8);
      expect(past - where(page.renderer, "past", "y")).toBe(8);
    } finally {
      page.unmount();
    }
  });
});
