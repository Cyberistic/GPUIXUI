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
import { Drawer, DrawerContent, DrawerTrigger } from "../drawer.js";
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
  settle,
  settleMotion,
  waitFor,
} from "../internal/interaction.js";
import { MotionProvider } from "../motion.js";
import { renderComponent } from "../internal/test-root.js";
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
  /** A row over a full-surface control, so a press through the ghost lands. */
  const OverlapPage = ({ onBehind }: { readonly onBehind: () => void }) => (
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
            <ContextMenuItem>Open</ContextMenuItem>
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

  it("stays painted for its exit without taking the pointer", async () => {
    const onBehind = vi.fn();
    const page = renderComponent(<OverlapPage onBehind={onBehind} />);
    const row = originOf(page, "row");
    // The pointer sits inside the row's lower half, so the menu hangs below it.
    page.renderer.nativeSimulateClick(row.x + 10, row.y + row.height / 2, 2);
    await waitFor(() => expect(painted(page.renderer, "menu")).toBe(true));
    const menu = originOf(page, "menu");
    const presses = onBehind.mock.calls.length;

    page.renderer.simulateKeystrokes("escape");
    await delay();

    // The box is still painted while it fades, but it is no longer a target...
    const leaving = page.renderer.findByTestId("menu");
    expect(leaving).toBeDefined();
    expect(leaving?.style.pointerEvents).toBe("none");
    // ...so a press inside its box belongs to the control underneath.
    page.renderer.nativeSimulateClick(menu.x + menu.width / 2, menu.y + 20);
    expect(onBehind.mock.calls.length).toBe(presses + 1);

    await waitFor(() => expect(painted(page.renderer, "menu")).toBe(false));
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
  it("slides in from the edge and stays painted while it leaves", async () => {
    const page = renderComponent(
      <ToastProvider>
        <ToastPage />
      </ToastProvider>,
    );
    page.renderer.clockPause();
    clickCentreOf(page, "push");
    await delay();
    const entering = where(page.renderer, "toast-1", "x");
    page.renderer.clockFastForward(700);
    await delay();
    const resting = where(page.renderer, "toast-1", "x");
    // The stack is anchored to the right edge, so the card starts right of it.
    expect(entering - resting).toBe(16);

    clickCentreOf(page, "toast-dismiss");
    await delay();
    expect(painted(page.renderer, "toast-1")).toBe(true);
    await waitFor(() => expect(painted(page.renderer, "toast-1")).toBe(false));
    page.unmount();
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
    page.renderer.clockPause();
    clickCentreOf(page, "open");
    await delay();
    const entering = where(page.renderer, "palette", "y");
    page.renderer.clockFastForward(400);
    await delay();
    expect(entering - where(page.renderer, "palette", "y")).toBe(8);
    page.unmount();
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
    page.unmount();
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
    page.unmount();
  });

  it("removes a dismissed notice at once when the setting turns on", async () => {
    // A dismissed card is kept painted for its `notice` window (500 ms) so its
    // exit can run. A reader who turns Reduce Motion on while it leaves asked
    // not to watch that journey: the stack rescales the window it already
    // scheduled instead of finishing it.
    const page = renderComponent(<PreferenceToast reduced={false} />);
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
    // Well inside the 500 ms the animated window would still be running.
    expect(painted(page.renderer, "toast-1")).toBe(false);
    page.unmount();
  });
});

describe("a leaving subtree", () => {
  /**
   * The bug this guards: `Reveal` stayed mounted for its exit tween without the
   * no-press guard every overlay paints, so its box kept a hitbox while it
   * faded. The measured limit is the runtime's: `pointerEvents` does not
   * inherit and inserts no hitbox for the element that declares it only, so a
   * control *inside* a leaving box keeps its own hitbox (GPUix `AGENTS.md`, and
   * measured in this renderer: a simulated click is dispatched by bounds, so a
   * headless suite cannot measure routing at all). What this case can hold is
   * the guard itself; the live probes measure where a press lands.
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
      expect(leaving(page)).toBe("auto");

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
