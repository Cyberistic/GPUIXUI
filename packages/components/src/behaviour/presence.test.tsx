/**
 * The motion seam, in the real GPUix renderer.
 *
 * The bugs these guard: a surface that pops into place instead of travelling
 * from its edge; a surface that vanishes on dismiss instead of running its exit
 * (and focus that leaves a duration late because the surface stayed mounted); a
 * reduced-motion run that still animates; an accordion that mounts its body
 * instantly; a tab pill that jumps between triggers although both boxes
 * were measured; and a context menu whose exit tween still swallowed a press
 * meant for the control underneath it.
 *
 * A headless assertion can read **geometry** (the native tree reports bounds, not
 * the painted opacity), so every case moves the surface on purpose: the offset
 * is the observable half of the fade-and-offset pair, and the live probes prove
 * the fade in a window. The motion clock is paused before each interaction, so
 * the entry frame is exact rather than however far the frame loop had got.
 */

import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import { useState } from "react";
import type { TestRoot } from "@gpuix/react/testing";
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
import { MotionProvider } from "../motion.js";
import { MotionProvider as PackageMotionProvider } from "@gpuixui/motion/react";
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

/** A page under one motion preference, with room for a floating surface. */
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

/** Let the renderer's frame loop publish what the last commit queued. */
const delay = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 30));

/** Whether `testId` is painted at all. */
const painted = (renderer: TestRoot["renderer"], testId: string): boolean =>
  renderer.findByTestId(testId) !== undefined;

/** The painted y (or x) of `testId`, failing when nothing was painted. */
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
    // The exit tween is running: the surface is still painted...
    expect(painted(page.renderer, "dialog")).toBe(true);
    // ...but it no longer owns focus, which is back on the opener.
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
    // The veil is still painted for the exit tween...
    expect(painted(page.renderer, "dialog-backdrop")).toBe(true);
    // ...but the press belongs to the page, not to the fading modal.
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
});

describe("the preference", () => {
  it("is the motion package's provider, not one of this package's own", () => {
    // The bug this guards: the preference context lived here, so a tree wrapped
    // in `@gpuixui/motion/react`'s provider still animated every surface below
    // it — the reveal mounted at its distance and named the animated transition.
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
});

describe("an edge panel", () => {
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
    // A right-hand panel starts to the right of its resting place.
    expect(entering - where(page.renderer, "drawer", "x")).toBe(12);
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
    // Below its trigger, the surface enters from the trigger's side.
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
  /** A menu with one secondary level, so the submenu's own motion is measured. */
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
    // Opened to its row's right, the surface enters from the row's side.
    expect(where(page.renderer, "submenu", "x") - entering).toBe(4);

    page.renderer.simulateKeystrokes("left");
    await delay();
    // Still painted while it leaves, and no longer a target...
    expect(painted(page.renderer, "submenu")).toBe(true);
    expect(page.renderer.findByTestId("submenu")?.style.pointerEvents).toBe(
      "none",
    );
    // ...then unmounted when the tween's duration has elapsed.
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
  /** A menu over a full-surface control, so a press into the ghost is visible. */
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
    // The bug this guards: the row a dismissed menu keeps painted for its exit
    // kept its own hitbox — `pointerEvents` does not inherit — so a press
    // aimed at what the menu uncovered ran the ghost row instead. The seam's
    // shield covers the box for the exit window.
    const onBehind = vi.fn();
    const onRow = vi.fn();
    const page = renderComponent(
      <OverlapPage onBehind={onBehind} onRow={onRow} />,
    );
    const row = originOf(page, "row");
    // The pointer sits inside the row's lower half, so the menu hangs below it.
    page.renderer.nativeSimulateClick(row.x + 10, row.y + row.height / 2, 2);
    await waitFor(() => expect(painted(page.renderer, "menu")).toBe(true));
    const menu = originOf(page, "menu");

    page.renderer.simulateKeystrokes("escape");
    await delay();

    // The box is still painted while it fades, but it is no longer a target...
    const leaving = page.renderer.findByTestId("menu");
    expect(leaving).toBeDefined();
    expect(leaving?.style.pointerEvents).toBe("none");
    // ...and its rows do not answer a press either: the ghost takes the press
    // rather than running one of its own controls.
    page.renderer.nativeSimulateClick(menu.x + menu.width / 2, menu.y + 20);
    expect(onRow).not.toHaveBeenCalled();
    expect(onBehind).not.toHaveBeenCalled();

    await waitFor(() => expect(painted(page.renderer, "menu")).toBe(false));
    // Once the exit window has elapsed the page answers again.
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
    // Still painted while it collapses...
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
    // One frame into the move the pill is still where it was...
    expect(where(page.renderer, "tabs-indicator", "x")).toBe(from);

    page.renderer.clockFastForward(400);
    await delay();
    // ...and it settles exactly on the trigger's own box.
    expect(where(page.renderer, "tabs-indicator", "x")).toBe(target);
    page.unmount();
  });
});

/** Two cards from one press, so a hover can fan a real stack. */
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

/** A page that pushes one stays-put toast, so a dismissal can be observed. */
const ToastPage = () => {
  const toast = useToast();
  return (
    <Page>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <Button testId="push" onClick={() => toast.push({ title: "Saved" })}>
          Push
        </Button>
        <ToastViewport />
      </div>
    </Page>
  );
};

describe("a notice", () => {
  it("rises into the stack and slides away to its right edge", async () => {
    // The toast moves on its own timing (`motionTimingOf`), not a shared level:
    // it arrives from 16 px below its slot on a 220 ms `top` travel and leaves
    // by fading while it slides 16 px to the right on a 180 ms `left` one. Both
    // halves are measured on the painted box, because the fade itself is a paint
    // value the native tree does not report (`surface-fade` proves it in a
    // window). The bug this guards: a suite that asserts the direction the card
    // no longer travels — the toast was rewritten to sonner's look and this case
    // still read an `x` entry offset, so it failed at rest and then reported
    // every later case in the file as a leaked root.
    const page = renderComponent(
      <ToastProvider>
        <ToastPage />
      </ToastProvider>,
    );
    try {
      page.renderer.clockPause();
      clickCentreOf(page, "push");
      await delay();
      const entering = where(page.renderer, "toast-1", "y");
      page.renderer.clockFastForward(700);
      await delay();
      const resting = where(page.renderer, "toast-1", "y");
      // The card starts a rise below the slot it settles in.
      expect(entering - resting).toBe(16);
      const restX = where(page.renderer, "toast-1", "x");

      clickCentreOf(page, "toast-dismiss");
      await delay();
      expect(painted(page.renderer, "toast-1")).toBe(true);
      // Start the exit under the paused clock, then advance half of its 180 ms:
      // the ghost has begun to move right, and has not covered the whole 16 px.
      page.renderer.clockFastForward(1);
      await delay();
      page.renderer.clockFastForward(80);
      await delay();
      const leavingX = where(page.renderer, "toast-1", "x");
      expect(leavingX).toBeGreaterThan(restX);
      expect(leavingX).toBeLessThan(restX + 16);

      await waitFor(() =>
        expect(painted(page.renderer, "toast-1")).toBe(false),
      );
    } finally {
      page.renderer.clockResume();
      page.unmount();
    }
  });

  it("fans the older cards while the pointer rests on the stack", async () => {
    // The bug this guards: every card painted at one spacing, so the reader
    // could not see which stack a hover would hold. Hovering lifts each card
    // that is not the newest by one step, and leaving puts the stack back.
    const page = renderComponent(
      <ToastProvider>
        <FanPage />
      </ToastProvider>,
    );
    try {
      page.renderer.clockPause();
      clickCentreOf(page, "push-two");
      await waitFor(() => expect(painted(page.renderer, "toast-2")).toBe(true));
      page.renderer.clockFastForward(700);
      await delay();
      const older = where(page.renderer, "toast-1", "y");
      const newest = where(page.renderer, "toast-2", "y");

      hoverCentreOf(page, "toast-2");
      page.renderer.clockFastForward(400);
      await delay();
      // The older card rises one step; the newest stays where it arrived.
      expect(where(page.renderer, "toast-1", "y")).toBe(older - 8);
      expect(where(page.renderer, "toast-2", "y")).toBe(newest);

      hoverCentreOf(page, "push-two");
      page.renderer.clockFastForward(400);
      await delay();
      expect(where(page.renderer, "toast-1", "y")).toBe(older);
      expect(where(page.renderer, "toast-2", "y")).toBe(newest);
    } finally {
      page.renderer.clockResume();
      page.unmount();
    }
  });
});

/** Controlled state, so the page itself decides when the palette is open. */
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

/** A page whose motion preference the test can change while a surface moves. */
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

/** The painted height of `testId`, failing when nothing was painted. */
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

/** A toast stack whose motion preference the test can change mid-flight. */
const PreferenceToast = ({ reduced }: { readonly reduced: boolean }) => (
  <ToastProvider>
    <Page reducedMotion={reduced}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <ToastPusher />
        <ToastViewport />
      </div>
    </Page>
  </ToastProvider>
);

/** Pushes one toast; it sits under the provider so it can reach the store. */
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
    // The reader turns Reduce Motion on mid-entry. The seam reads the preference
    // on every render, so the in-flight run's duration becomes zero and the
    // resting frame is what is left — the journey does not finish.
    const page = renderComponent(<PreferencePage reduced={false} />);
    try {
      page.renderer.clockPause();
      clickCentreOf(page, "open");
      await delay();
      const entering = where(page.renderer, "dialog", "y");

      page.rerender(<PreferencePage reduced />);
      await delay();
      const settled = where(page.renderer, "dialog", "y");
      // Nothing is left to run: the frozen clock has not moved the surface since.
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
    // The reveal's target is a measurement that arrives after a paint, so under
    // the reduced preference the section must already be at its full height in
    // the frame it opens rather than growing from zero.
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
    // A dismissed card is kept painted for its exit window (180 ms, the toast's
    // own `left` travel) so that leave can run. A reader who turns Reduce Motion
    // on while it leaves asked not to watch that journey: the stack rescales the
    // window it already scheduled instead of finishing it.
    const page = renderComponent(<PreferenceToast reduced={false} />);
    try {
      page.renderer.clockPause();
      clickCentreOf(page, "push-notice");
      await waitFor(() => expect(painted(page.renderer, "toast-1")).toBe(true));
      // Let the card land, so its dismiss control is where the pointer is.
      page.renderer.clockFastForward(700);
      settle(page);
      await delay();

      clickCentreOf(page, "toast-dismiss");
      await delay();
      expect(painted(page.renderer, "toast-1")).toBe(true);

      page.rerender(<PreferenceToast reduced />);
      await delay();
      await delay();
      // Well inside the 180 ms the animated window would still be running.
      expect(painted(page.renderer, "toast-1")).toBe(false);
    } finally {
      page.renderer.clockResume();
      page.unmount();
    }
  });

  it("removes a panel at once when the setting turns on while it leaves", async () => {
    // The same rule for the seam itself, which a panel uses rather than the
    // toast stack: a dismissed dialog is kept painted for its `slow` window
    // (320 ms) and the window is read from the timing on every render, so the
    // preference must rescale the leave already in flight — not only the next
    // one. The bug this guards: a window read once at the start of the leave,
    // which would keep the panel on screen for the journey the reader removed.
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
      // Well inside the 320 ms the animated window would still be running.
      expect(painted(page.renderer, "dialog")).toBe(false);
    } finally {
      page.unmount();
    }
  });
});

describe("a control inside a leaving surface", () => {
  /**
   * The bug these guard: `presenceStyle` removes only a surface's **own**
   * hitbox, and `pointerEvents` does not inherit in `@gpuix/native@0.11.0`, so a
   * control a surface keeps mounted for its exit kept its own box and answered
   * a press. Measured: a dismissed `Dialog` still painted for its tween ran its
   * confirm action once.
   *
   * Every surface that keeps its controls mounted for an exit paints the seam's
   * `PresenceShield`: the modal pair, the anchored family (popover, dropdown and
   * context menu, the submenu, the navigation menu, the preview card) and the
   * toast card. The shield is a handler-less layer over the surface's own
   * positioned box, so a press inside a fading box stops there instead of
   * running a control the reader can no longer see — and instead of falling
   * through to whatever the box covers, which is what the press would otherwise
   * reach once the surface's own hitbox is gone.
   */
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
    // A dismiss is idempotent, so a press on the dismiss ghost is invisible; the
    // card still keeps its controls mounted for its exit, so the shield is what
    // stops them being targets. Its action is the non-idempotent one — the case
    // below measures that press — and this one measures the layer itself.
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
      settleMotion(page);
      expect(page.renderer.findByTestId("presence-shield")).toBeUndefined();

      clickCentreOf(page, "toast-dismiss");
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
    // The bug this guards: the provider prunes a toast's action handler when the
    // toast leaves the queue, and the viewport keeps the card painted for its
    // exit — so in the frame the card was dismissed its action vanished, the
    // description reflowed into the freed width, and the ghost stopped being the
    // box the reader dismissed. A leaving card keeps the content it was thrown
    // with, in the box it had, and the shield makes that content inert.
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
        expect(painted(page.renderer, "toast-action")).toBe(true),
      );
      settleMotion(page);
      const resting = Option.getOrElse(boundsOf(page, "toast-action"), () => {
        throw new Error("behaviour: the action painted no box");
      });

      clickCentreOf(page, "toast-dismiss");
      await delay();
      expect(painted(page.renderer, "toast-1")).toBe(true);
      const leaving = Option.getOrElse(boundsOf(page, "toast-action"), () => {
        throw new Error("behaviour: the ghost lost its action");
      });
      expect([leaving.width, leaving.height]).toEqual([
        resting.width,
        resting.height,
      ]);

      // A ghost answers nothing: the shield, not the action, takes the press.
      clickCentreOf(page, "toast-action");
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

      // The clock stays paused, so the body is still at its measured height
      // when the press lands in the frame the collapse starts.
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
      // The row the reader can still see is a ghost: its host has left the hit
      // test, so the press never reaches its action.
      expect(ghostPress).not.toHaveBeenCalled();
      expect(behindPress).not.toHaveBeenCalled();

      await waitFor(() => expect(painted(page.renderer, "menu")).toBe(false));
    } finally {
      page.unmount();
    }
  });
});

describe("a leaving subtree", () => {
  /**
   * The bug this guards: a reveal is a **wrapper**, not a surface. `auto` on it
   * inserts the runtime's blocking hitbox between the control that paints under
   * it and the content it wraps (`press-routing-lifecycle` measured the rule:
   * a hitbox from the topmost down to the first painted fill), so a wrapped
   * glyph would stop the press that belongs to its action — and a leaving
   * reveal that kept the hitbox did the same while it faded. The wrapper
   * therefore paints nothing at rest and `none` while it leaves. The measured
   * limit is the runtime's: `pointerEvents` does not inherit and inserts no
   * hitbox for the element that declares it only, so a control *inside* a
   * leaving box keeps its own hitbox (GPUix `AGENTS.md`; the headless renderer
   * dispatches a simulated click by bounds, so routing is the live probes'
   * claim, not this one). What this case can hold is the guard itself.
   */
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
      // At rest the wrapper adds no hitbox over the content it wraps.
      expect(leaving(page)).toBeUndefined();

      page.rerender(
        <Page>
          <Reveal open={false} testId="reveal">
            <text>Notice</text>
          </Reveal>
        </Page>,
      );
      settle(page);
      // Still painted for the tween, and no longer a target.
      expect(painted(page.renderer, "reveal")).toBe(true);
      expect(leaving(page)).toBe("none");
    } finally {
      page.unmount();
    }
  });
});

/**
 * A bare surface that owns only the seam's mount window.
 *
 * The two windows a shipped surface reads are fixed by its level, so the case
 * below drives the seam directly: it is the one way to change a wait without
 * changing the duration, which is the half the timer used to ignore.
 */
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
  /**
   * The bug this guards: `useSurfacePresence` holds a leaving box for
   * `exitWindowMs(timing)` — the tween plus the wait it sits out first — but the
   * effect that schedules the unmount listened to `timing.exit.duration` alone.
   * A leave already timed therefore kept its old window when the wait changed,
   * so a delayed journey could lose its box before it started. `PageTransition`
   * had the same shape and was closed on its own window; this is the seam's
   * half, and the toast stack's timers now read the same value.
   */
  it("re-times a leave when the window changes, not only its duration", async () => {
    const page = renderComponent(<WindowProbe open waitMs={0} />);
    try {
      await delay();
      page.rerender(<WindowProbe open={false} waitMs={0} />);
      await delay();
      // Same 50 ms duration, a 200 ms longer window.
      page.rerender(<WindowProbe open={false} waitMs={200} />);
      await new Promise((resolve) => setTimeout(resolve, 120));
      // The 50 ms window has passed; the re-timed one has not.
      expect(painted(page.renderer, "seam-window")).toBe(true);
      await new Promise((resolve) => setTimeout(resolve, 200));
      // The longer window still ends, so the timer was re-armed rather than lost.
      expect(painted(page.renderer, "seam-window")).toBe(false);
    } finally {
      page.unmount();
    }
  });
});
