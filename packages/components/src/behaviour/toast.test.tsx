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
      <Button
        testId="dismiss-front"
        onClick={() => {
          const front = toast.toasts[toast.toasts.length - 1];
          if (front !== undefined) toast.dismiss(front.id);
        }}
      >
        Dismiss front
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

const drain = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

const sync = async (root: ComponentTestRoot): Promise<void> => {
  await drain();
  settle(root);
  root.renderer.clockFastForward(1_000);
  settle(root);
  await drain();
};

const heightOf = (root: ComponentTestRoot, testId: string): number =>
  Option.getOrElse(boundsOf(root, testId), () => {
    throw new Error(`behaviour: no box for "${testId}"`);
  }).height;

const xOf = (root: ComponentTestRoot, testId: string): number =>
  Option.getOrElse(boundsOf(root, testId), () => {
    throw new Error(`behaviour: no box for "${testId}"`);
  }).x;

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

      expect(newest.height).toBeGreaterThan(STACK_PEEK * 2);
      expect(middle.height).toBeCloseTo(STACK_PEEK, 0);
      expect(oldest.height).toBeCloseTo(STACK_PEEK, 0);

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
          page.renderer.findByTestId("toast-surface-1")?.style.backgroundColor,
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

      hoverCentreOf(page, "elsewhere");
      await new Promise((resolve) => setTimeout(resolve, 160));
      page.renderer.clockFastForward(800);
      await sync(page);

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

      expect(heightOf(page, "toast-1")).toBeGreaterThan(STACK_PEEK * 2);
    } finally {
      page.unmount();
    }
  });

  it("keeps an evicted card the box it faded with", async () => {
    const page = renderComponent(<Harness duration={Duration.seconds(300)} />);
    try {
      clickCentreOf(page, "push-three");
      await sync(page);
      settleMotion(page);
      const oldest = requireBounds(page, "toast-1");

      clickCentreOf(page, "push");
      await drain();
      settle(page);

      expect(page.renderer.findByTestId("toast-1")).toBeDefined();
      const ghost = requireBounds(page, "toast-1");
      expect(ghost.x).toBeCloseTo(oldest.x, 0);
      expect(ghost.width).toBeCloseTo(oldest.width, 0);
    } finally {
      page.unmount();
    }
  });

  it("moves the cards behind a push by a tween, never by their inset", async () => {
    const page = renderComponent(<Harness duration={Duration.seconds(300)} />);
    try {
      clickCentreOf(page, "push-three");
      await sync(page);
      settleMotion(page);
      const before = [1, 2, 3].map((id) => requireBounds(page, `toast-${id}`));

      clickCentreOf(page, "push");
      await drain();
      settle(page);
      page.renderer.clockFastForward(16);
      settle(page);
      const after = [1, 2, 3].map((id) => requireBounds(page, `toast-${id}`));

      Arr.forEach(after, (box, index) => {
        const previous = before[index];
        if (previous === undefined) return;
        expect(Math.abs(box.x - previous.x)).toBeLessThan(6);
        expect(Math.abs(box.width - previous.width)).toBeLessThan(6);
      });
    } finally {
      page.unmount();
    }
  });

  it("closes the stack while the front card leaves, not after it is gone", async () => {
    const page = renderComponent(<Harness duration={Duration.seconds(300)} />);
    try {
      clickCentreOf(page, "push-three");
      await sync(page);
      settleMotion(page);

      clickCentreOf(page, "dismiss-front");
      await drain();
      settle(page);
      page.renderer.clockFastForward(120);
      settle(page);

      expect(page.renderer.findByTestId("toast-3")).toBeDefined();
      expect(heightOf(page, "toast-2")).toBeGreaterThan(STACK_PEEK * 2);
    } finally {
      page.unmount();
    }
  });
});
