/**
 * Toast behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a pushed toast never reaching the viewport; the stack
 * painting every card at one size (so a reader could not tell which card the
 * corner owned); a hover that folded before the pointer finished moving between
 * two cards; a swipe that dismissed on the first pixel or never; an action that
 * ran twice or outlived its card; a promise that queued a second card instead of
 * settling the loading one; a dismissed card that stayed a Tab stop while it
 * faded; and a viewport that moved the page when the stack unfolded.
 */

import { describe, expect, it, vi } from "vitest";
import { Duration } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Button } from "../internal/button.js";
import {
  boundsOf,
  clickCentreOf,
  focusedTestId,
  hoverCentreOf,
  requireBounds,
  settle,
  settleMotion,
  waitFor,
} from "../internal/interaction.js";
import { MotionProvider } from "../internal/presence.js";
import { darkTheme, lightTheme } from "../internal/theme.js";
import {
  renderComponent,
  type ComponentTestRoot,
  type TestTheme,
} from "../internal/test-root.js";
import { ToastProvider, ToastViewport, useToast } from "../toast.js";
import { STACK_GAP, STACK_PEEK } from "../toast/stack.js";
import { SWIPE_THRESHOLD } from "../toast/swipe.js";

/** A page with the controls every case drives, plus an unrelated sibling. */
const Controls = ({
  onElsewhere,
  onAction,
}: {
  readonly onElsewhere: () => void;
  readonly onAction?: () => void;
}) => {
  const toast = useToast();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 12,
        padding: 40,
      }}
    >
      <Button
        testId="push"
        onClick={() =>
          toast.push({ title: "Saved changes", description: "3 files" })
        }
      >
        Push
      </Button>
      <Button
        testId="push-three"
        onClick={() => {
          toast.push({ title: "First", description: "The oldest card" });
          toast.push({ title: "Second", description: "The middle card" });
          toast.push({ title: "Third", description: "The newest card" });
        }}
      >
        Push three
      </Button>
      <Button
        testId="push-action"
        onClick={() =>
          toast.push(
            { title: "Message archived", action: { label: "Undo" } },
            onAction === undefined ? undefined : { onAction },
          )
        }
      >
        Push with action
      </Button>
      <Button
        testId="push-unhandled"
        onClick={() =>
          toast.push({
            title: "Archived, no handler",
            action: { label: "Undo" },
          })
        }
      >
        Push label only
      </Button>
      <Button
        testId="push-warning"
        onClick={() =>
          toast.push({ title: "Disk nearly full", tone: "warning" })
        }
      >
        Push warning
      </Button>
      <Button
        testId="push-danger"
        onClick={() =>
          toast.push({ title: "Upload failed", tone: "danger", duration: 0 })
        }
      >
        Push danger
      </Button>
      <Button
        testId="push-promise"
        onClick={() => {
          void toast
            .promise(
              new Promise<string>((resolve) => {
                setTimeout(() => resolve("12 rows"), 150);
              }),
              {
                loading: {
                  title: "Importing",
                  description: "Reading the file",
                },
                success: (rows) => ({
                  title: `Imported ${rows}`,
                  description: "The table is up to date.",
                  tone: "success",
                }),
                error: (cause) => ({
                  title: "Import failed",
                  description: String(cause),
                  tone: "danger",
                }),
              },
            )
            .catch(() => undefined);
        }}
      >
        Push promise
      </Button>
      <Button
        testId="push-rejected"
        onClick={() => {
          void toast
            .promise(Promise.reject(new Error("network down")), {
              loading: { title: "Importing" },
              success: { title: "Imported", tone: "success" },
              error: (cause) => ({
                title: "Import failed",
                description: String(cause),
                tone: "danger",
              }),
            })
            .catch(() => undefined);
        }}
      >
        Push rejected promise
      </Button>
      <Button
        testId="push-later"
        onClick={() => {
          setTimeout(
            () =>
              toast.push({ title: "Later", description: "Queued by a timer" }),
            400,
          );
        }}
      >
        Push later
      </Button>
      <Button testId="dismiss-all" onClick={toast.dismissAll}>
        Dismiss all
      </Button>
      <Button testId="elsewhere" onClick={onElsewhere}>
        Elsewhere
      </Button>
    </div>
  );
};

const Harness = ({
  onElsewhere,
  onAction,
  duration,
  swipe,
  reduced,
}: {
  readonly onElsewhere?: () => void;
  readonly onAction?: () => void;
  readonly duration?: Duration.Input;
  readonly swipe?: boolean;
  readonly reduced?: boolean;
}) => (
  // One root element: the native test renderer reports a single tree root, and a
  // provider's children are siblings of each other.
  <div style={{ width: 1200, height: 760 }}>
    <MotionProvider preference={reduced === true ? "reduced" : "animated"}>
      <ToastProvider defaultDuration={duration}>
        <Controls
          onElsewhere={onElsewhere ?? (() => undefined)}
          onAction={onAction}
        />
        <ToastViewport swipe={swipe} />
      </ToastProvider>
    </MotionProvider>
  </div>
);

/** The store updates through its runtime, so let the microtask queue drain. */
const drain = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

/** Drain the store, deliver the layout reports, and land every entry tween. */
const sync = async (root: ComponentTestRoot): Promise<void> => {
  await drain();
  settle(root);
  root.renderer.clockFastForward(1_000);
  settle(root);
  await drain();
};

/** A measured height, or a broken-fixture failure. */
const heightOf = (root: ComponentTestRoot, testId: string): number =>
  Option.getOrElse(boundsOf(root, testId), () => {
    throw new Error(`behaviour: no box for "${testId}"`);
  }).height;

/** The measured x of a card, or a broken-fixture failure. */
const xOf = (root: ComponentTestRoot, testId: string): number =>
  Option.getOrElse(boundsOf(root, testId), () => {
    throw new Error(`behaviour: no box for "${testId}"`);
  }).x;

/** Walk the window's Tab order: focus `from`, then take `steps` stops. */
const tabWalk = (
  root: ComponentTestRoot,
  from: string,
  steps: number,
): ReadonlyArray<string> => {
  const start = root.renderer.findByTestId(from);
  if (start !== undefined) root.renderer.focusElement(start.id);
  return Arr.makeBy(steps, () => {
    root.renderer.focusNext();
    return Option.getOrElse(focusedTestId(root), () => "none");
  });
};

/** Press a card and drag it `dx` pixels sideways, then release. */
const swipe = async (
  root: ComponentTestRoot,
  testId: string,
  dx: number,
  holdMs = 0,
): Promise<void> => {
  const box = requireBounds(root, testId);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  root.renderer.nativeSimulateMouseDown(x, y);
  root.renderer.nativeSimulateMouseMove(x + dx / 2, y, 0);
  root.renderer.nativeSimulateMouseMove(x + dx, y, 0);
  if (holdMs > 0) await new Promise((resolve) => setTimeout(resolve, holdMs));
  root.renderer.nativeSimulateMouseUp(x + dx, y);
};

describe("Toast", () => {
  it("shows a pushed toast in a labelled group, as a named status", async () => {
    const page = renderComponent(<Harness />);
    try {
      const viewport = page.renderer.findByTestId("toast-viewport");
      expect(viewport?.customProps?.role).toBe("group");
      expect(viewport?.customProps?.["aria-label"]).toBe("Notifications");

      clickCentreOf(page, "push");
      await sync(page);

      expect(page.renderer.getAllText()).toContain("Saved changes");
      expect(page.renderer.getAllText()).toContain("3 files");
      expect(page.renderer.findByTestId("toast-1")?.customProps?.role).toBe(
        "status",
      );
      expect(
        page.renderer.findByTestId("toast-1")?.customProps?.["aria-label"],
      ).toBe("Saved changes");
    } finally {
      page.unmount();
    }
  });

  it("announces a destructive card as an alert", async () => {
    const page = renderComponent(<Harness />);
    try {
      clickCentreOf(page, "push-danger");
      await sync(page);

      expect(page.renderer.findByTestId("toast-1")?.customProps?.role).toBe(
        "alert",
      );
    } finally {
      page.unmount();
    }
  });

  it("paints the newest card full and the two older cards as peeking strips", async () => {
    const page = renderComponent(<Harness />);
    try {
      clickCentreOf(page, "push-three");
      await sync(page);
      settleMotion(page);

      const newest = requireBounds(page, "toast-3");
      const middle = requireBounds(page, "toast-2");
      const oldest = requireBounds(page, "toast-1");

      // The newest card is the corner's card: full width and readable height.
      expect(newest.height).toBeGreaterThan(STACK_PEEK * 2);
      expect(middle.height).toBeCloseTo(STACK_PEEK, 0);
      expect(oldest.height).toBeCloseTo(STACK_PEEK, 0);

      // Each older card is inset from the right and sits above the one below.
      expect(middle.x).toBeGreaterThan(newest.x);
      expect(oldest.x).toBeGreaterThan(middle.x);
      expect(oldest.y + oldest.height).toBeLessThanOrEqual(middle.y + 1);
      expect(middle.y + middle.height).toBeLessThanOrEqual(newest.y + 1);
      expect(oldest.width).toBeLessThan(middle.width);
      expect(middle.width).toBeLessThan(newest.width);
    } finally {
      page.unmount();
    }
  });

  it("unfolds into full cards on hover and folds back on leave", async () => {
    const page = renderComponent(<Harness />);
    try {
      clickCentreOf(page, "push-three");
      await sync(page);
      settleMotion(page);
      const folded = heightOf(page, "toast-1");

      hoverCentreOf(page, "toast-3");
      page.renderer.clockFastForward(400);
      await sync(page);

      expect(heightOf(page, "toast-1")).toBeGreaterThan(folded * 2);
      const oldest = requireBounds(page, "toast-1");
      const middle = requireBounds(page, "toast-2");
      const newest = requireBounds(page, "toast-3");
      expect(oldest.width).toBeCloseTo(newest.width, 0);
      expect(newest.y - (middle.y + middle.height)).toBeCloseTo(STACK_GAP, 0);
      expect(middle.y - (oldest.y + oldest.height)).toBeCloseTo(STACK_GAP, 0);

      hoverCentreOf(page, "elsewhere");
      // The release waits out the hold's grace before the stack folds.
      await new Promise((resolve) => setTimeout(resolve, 160));
      page.renderer.clockFastForward(800);
      await sync(page);

      expect(heightOf(page, "toast-1")).toBeCloseTo(STACK_PEEK, 0);
    } finally {
      page.unmount();
    }
  });

  it("does not move the page when the stack unfolds", async () => {
    const page = renderComponent(<Harness />);
    try {
      clickCentreOf(page, "push-three");
      await sync(page);
      settleMotion(page);
      const before = requireBounds(page, "elsewhere");

      hoverCentreOf(page, "toast-3");
      page.renderer.clockFastForward(400);
      await sync(page);
      const after = requireBounds(page, "elsewhere");

      expect(after).toEqual(before);
    } finally {
      page.unmount();
    }
  });

  it("pauses every clock while the pointer rests and resumes with the remaining time", async () => {
    const page = renderComponent(<Harness duration={Duration.millis(600)} />);
    try {
      clickCentreOf(page, "push");
      await sync(page);

      hoverCentreOf(page, "toast-1");
      await new Promise((resolve) => setTimeout(resolve, 900));
      await sync(page);

      expect(page.renderer.findByTestId("toast-1")).toBeDefined();

      hoverCentreOf(page, "elsewhere");
      await new Promise((resolve) => setTimeout(resolve, 900));
      await sync(page);

      await waitFor(() =>
        expect(page.renderer.findByTestId("toast-1")).toBeUndefined(),
      );
    } finally {
      page.unmount();
    }
  });

  it("keeps a card pushed during a hold until the stack is released", async () => {
    // The bug this guards: a card queued while the pointer rested on the stack
    // was scheduled with a running timer, so it expired under the pointer that
    // had asked for time to read it. The second push is queued by a timer, so
    // the pointer never leaves the stack between the two cards.
    const page = renderComponent(<Harness duration={Duration.millis(300)} />);
    try {
      clickCentreOf(page, "push-later");
      clickCentreOf(page, "push");
      await sync(page);
      hoverCentreOf(page, "toast-1");

      await new Promise((resolve) => setTimeout(resolve, 900));
      await sync(page);

      expect(page.renderer.findByTestId("toast-2")).toBeDefined();

      hoverCentreOf(page, "elsewhere");
      await new Promise((resolve) => setTimeout(resolve, 900));
      await sync(page);

      await waitFor(() =>
        expect(page.renderer.findByTestId("toast-2")).toBeUndefined(),
      );
    } finally {
      page.unmount();
    }
  });

  it("keeps a toast whose duration has not elapsed on a frozen motion clock", async () => {
    const page = renderComponent(<Harness duration={Duration.seconds(300)} />);
    try {
      page.renderer.clockPause();
      clickCentreOf(page, "push");
      await sync(page);

      await new Promise((resolve) => setTimeout(resolve, 200));
      await sync(page);

      expect(page.renderer.findByTestId("toast-1")).toBeDefined();
    } finally {
      page.renderer.clockResume();
      page.unmount();
    }
  });

  it("dismisses on its own while the motion clock is frozen", async () => {
    const page = renderComponent(<Harness duration={Duration.millis(120)} />);
    try {
      page.renderer.clockPause();
      clickCentreOf(page, "push");
      await sync(page);
      expect(page.renderer.findByTestId("toast-1")).toBeDefined();

      await new Promise((resolve) => setTimeout(resolve, 400));
      await sync(page);

      await waitFor(() =>
        expect(page.renderer.findByTestId("toast-1")).toBeUndefined(),
      );
    } finally {
      page.renderer.clockResume();
      page.unmount();
    }
  });

  it("keeps a sticky toast past every duration", async () => {
    const page = renderComponent(<Harness />);
    try {
      clickCentreOf(page, "push-danger");
      await sync(page);

      await new Promise((resolve) => setTimeout(resolve, 900));
      await sync(page);

      expect(page.renderer.findByTestId("toast-1")).toBeDefined();
    } finally {
      page.unmount();
    }
  });

  it("dismisses only the card whose control was pressed", async () => {
    const page = renderComponent(<Harness duration={Duration.seconds(300)} />);
    try {
      clickCentreOf(page, "push");
      await sync(page);
      clickCentreOf(page, "push-warning");
      await sync(page);

      // The front card is the newest one.
      clickCentreOf(page, "toast-dismiss-2");
      await waitFor(() =>
        expect(page.renderer.findByTestId("toast-2")).toBeUndefined(),
      );

      expect(page.renderer.getAllText()).not.toContain("Disk nearly full");
      expect(page.renderer.getAllText()).toContain("Saved changes");
    } finally {
      page.unmount();
    }
  });

  it("keeps a dismissed card's controls out of the window's tab order", async () => {
    // The bug this guards: a dismissed card stays painted for its 180 ms exit
    // and the shield takes the presses, but the runtime decides the Tab order
    // element by element — neither `pointerEvents` nor the shield reaches a
    // descendant's stop. A reader Tab-browsing while a card expired could land
    // on its dismiss control and have it unmount under the keyboard.
    const page = renderComponent(<Harness duration={Duration.millis(600)} />);
    try {
      clickCentreOf(page, "push-action");
      await sync(page);

      expect(tabWalk(page, "push", 20)).toContain("toast-dismiss-1");

      page.renderer.focusElement(
        page.renderer.findByTestId("elsewhere")?.id ?? -1,
      );
      clickCentreOf(page, "toast-dismiss-1");
      await waitFor(() =>
        expect(page.renderer.findByTestId("toast-1")?.style.pointerEvents).toBe(
          "none",
        ),
      );

      const ghost = tabWalk(page, "push", 20);
      expect(ghost).not.toContain("toast-action-1");
      expect(ghost).not.toContain("toast-dismiss-1");

      await waitFor(() =>
        expect(page.renderer.findByTestId("toast-1")).toBeUndefined(),
      );
    } finally {
      page.unmount();
    }
  });

  it("clears the stack with dismissAll", async () => {
    const page = renderComponent(<Harness duration={Duration.seconds(300)} />);
    try {
      clickCentreOf(page, "push-three");
      await sync(page);

      clickCentreOf(page, "dismiss-all");
      await sync(page);

      await waitFor(() =>
        expect(page.renderer.findByTestId("toast-1")).toBeUndefined(),
      );
      await waitFor(() =>
        expect(page.renderer.findByTestId("toast-3")).toBeUndefined(),
      );
    } finally {
      page.unmount();
    }
  });

  it("does not block a click on the page behind the viewport", async () => {
    const onElsewhere = vi.fn();
    const page = renderComponent(<Harness onElsewhere={onElsewhere} />);
    try {
      clickCentreOf(page, "push");
      await sync(page);

      clickCentreOf(page, "elsewhere");

      expect(onElsewhere).toHaveBeenCalledTimes(1);
    } finally {
      page.unmount();
    }
  });

  it("paints the toast surface from whichever theme is active", async () => {
    const assertTheme = async (
      theme: TestTheme,
      popover: string,
    ): Promise<void> => {
      const page = renderComponent(<Harness />, theme);
      try {
        clickCentreOf(page, "push");
        await sync(page);

        expect(
          page.renderer.findByTestId("toast-1")?.style.backgroundColor,
        ).toBe(popover);
      } finally {
        page.unmount();
      }
    };

    await assertTheme("dark", darkTheme.colors.popover);
    await assertTheme("light", lightTheme.colors.popover);
  });

  it("returns every card to its strip after dismissing the front", async () => {
    const page = renderComponent(<Harness duration={Duration.seconds(300)} />);
    try {
      clickCentreOf(page, "push-three");
      await sync(page);
      settleMotion(page);

      clickCentreOf(page, "toast-dismiss-3");
      await waitFor(() =>
        expect(page.renderer.findByTestId("toast-3")).toBeUndefined(),
      );
      // Leaving the stack folds it; the pointer is on the close that just went.
      hoverCentreOf(page, "elsewhere");
      await new Promise((resolve) => setTimeout(resolve, 160));
      page.renderer.clockFastForward(800);
      await sync(page);

      // Two cards remain; the middle card is now the full one.
      expect(heightOf(page, "toast-2")).toBeGreaterThan(STACK_PEEK * 2);
      expect(heightOf(page, "toast-1")).toBeCloseTo(STACK_PEEK, 0);
    } finally {
      page.unmount();
    }
  });

  it("runs an action once and dismisses its toast", async () => {
    const onAction = vi.fn();
    const page = renderComponent(<Harness onAction={onAction} />);
    try {
      clickCentreOf(page, "push-action");
      await sync(page);

      expect(page.renderer.getAllText()).toContain("Undo");

      clickCentreOf(page, "toast-action-1");
      clickCentreOf(page, "toast-action-1");
      await sync(page);

      expect(onAction).toHaveBeenCalledTimes(1);
      await waitFor(() =>
        expect(page.renderer.findByTestId("toast-1")).toBeUndefined(),
      );
    } finally {
      page.unmount();
    }
  });

  it("renders no action control when the label has no handler", async () => {
    const page = renderComponent(<Harness />);
    try {
      clickCentreOf(page, "push-unhandled");
      await sync(page);

      expect(page.renderer.getAllText()).toContain("Archived, no handler");
      await waitFor(() =>
        expect(page.renderer.findByTestId("toast-action-1")).toBeUndefined(),
      );
    } finally {
      page.unmount();
    }
  });

  it("dismisses the card a swipe past the threshold travelled with", async () => {
    const page = renderComponent(<Harness />);
    try {
      clickCentreOf(page, "push");
      await sync(page);
      settleMotion(page);

      await swipe(page, "toast-1", -(SWIPE_THRESHOLD + 40));
      await sync(page);

      await waitFor(() =>
        expect(page.renderer.findByTestId("toast-1")).toBeUndefined(),
      );
      expect(page.renderer.getAllText()).not.toContain("3 files");
    } finally {
      page.unmount();
    }
  });

  it("springs a short swipe back to its resting place", async () => {
    const page = renderComponent(<Harness />);
    try {
      clickCentreOf(page, "push");
      await sync(page);
      settleMotion(page);
      const rest = xOf(page, "toast-1");

      // A slow drag under the distance threshold: 20px over 120ms is a
      // deliberate movement, not a flick, so the card springs back.
      await swipe(page, "toast-1", -(SWIPE_THRESHOLD - 20), 120);
      page.renderer.clockFastForward(400);
      await sync(page);

      expect(page.renderer.findByTestId("toast-1")).toBeDefined();
      expect(xOf(page, "toast-1")).toBeCloseTo(rest, 0);
    } finally {
      page.unmount();
    }
  });

  it("leaves swipe off for a viewport that asks", async () => {
    const page = renderComponent(<Harness swipe={false} />);
    try {
      clickCentreOf(page, "push");
      await sync(page);
      settleMotion(page);

      await swipe(page, "toast-1", -(SWIPE_THRESHOLD + 80));
      await new Promise((resolve) => setTimeout(resolve, 400));
      await sync(page);

      expect(page.renderer.findByTestId("toast-1")).toBeDefined();
    } finally {
      page.unmount();
    }
  });

  it("moves a promise toast from loading to success in place", async () => {
    const page = renderComponent(<Harness duration={Duration.seconds(300)} />);
    try {
      clickCentreOf(page, "push-promise");
      await sync(page);

      expect(page.renderer.getAllText()).toContain("Importing");
      expect(page.renderer.getAllText()).toContain("Reading the file");

      await waitFor(() =>
        expect(page.renderer.getAllText()).toContain("Imported 12 rows"),
      );
      await sync(page);

      // One row changed state; it did not queue a second card.
      expect(page.renderer.findByTestId("toast-2")).toBeUndefined();
      expect(page.renderer.findByTestId("toast-1")?.customProps?.role).toBe(
        "status",
      );
    } finally {
      page.unmount();
    }
  });

  it("settles a rejected promise on the same row in the danger tone", async () => {
    const page = renderComponent(<Harness duration={Duration.seconds(300)} />);
    try {
      clickCentreOf(page, "push-rejected");
      await sync(page);

      await waitFor(() =>
        expect(page.renderer.getAllText()).toContain("Import failed"),
      );
      await sync(page);

      expect(page.renderer.findByTestId("toast-1")?.customProps?.role).toBe(
        "alert",
      );
      expect(page.renderer.findByTestId("toast-2")).toBeUndefined();
    } finally {
      page.unmount();
    }
  });

  it("unfolds at once under the reduced preference", async () => {
    const page = renderComponent(<Harness reduced />);
    try {
      clickCentreOf(page, "push-three");
      await sync(page);
      settleMotion(page);

      hoverCentreOf(page, "toast-3");
      await sync(page);

      // No fast-forward: the reduced policy is an instant assignment.
      expect(heightOf(page, "toast-1")).toBeGreaterThan(STACK_PEEK * 2);
    } finally {
      page.unmount();
    }
  });
});
