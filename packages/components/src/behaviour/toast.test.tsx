/**
 * Toast behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a pushed toast never reaching the viewport; the stack
 * painting in the wrong order (the newest must be below the oldest); dismissing
 * one toast removing another; `dismissAll` leaving a card behind; the viewport
 * swallowing clicks on the page behind it; and a toast painted with the wrong
 * theme surface. It also guards a toast that auto-dismissed while keyboard focus
 * was on its own dismiss control, dropping the user's focus with it. An action
 * could render with no handler (a dead button), run twice, leave its toast
 * behind, or let the toast expire while its action held keyboard focus. The
 * viewport could also ignore the corner it is given and always paint
 * bottom-right. A progress bar could keep shrinking through a hover hold, or
 * claim a total for a toast that never auto-dismisses.
 *
 * Plan 743: the keyboard hold used React `onFocus`, which 0.10.0 never sends for
 * a native focus change, so a card still expired under keyboard focus and the
 * 500 ms exit ghost made the old paint-only assertion pass anyway. The hold now
 * samples the renderer's focused host, and every hold case reads the queue and
 * its timer instead of the painted card.
 *
 * Plan 770: a card's controls shared one `testId` across cards, and dismissing a
 * card left focus on nothing while the other cards were still painted. Each
 * card's controls are now `toast-<id>-dismiss` / `toast-<id>-action`, and a
 * dismissal hands focus to the next live card's dismiss control.
 */

import { describe, expect, it, vi } from "vitest";
import { Duration } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { nodesWithRole } from "../internal/a11y.js";
import { Button } from "../internal/button.js";
import {
  boundsOf,
  clickCentreOf,
  finishMotion,
  hoverCentreOf,
} from "../internal/interaction.js";
import { darkTheme, lightTheme } from "../internal/theme.js";
import {
  renderComponent,
  type ComponentTestRoot,
  type TestTheme,
} from "../internal/test-root.js";
import {
  ToastProvider,
  ToastViewport,
  useToast,
  type ToastPosition,
} from "../toast.js";

/** A page with two push buttons, a dismiss-all and an unrelated control. */
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
        testId="push-persistent"
        onClick={() =>
          toast.push({ title: "Sticky", duration: Duration.infinity })
        }
      >
        Push persistent
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

/**
 * Toast 1's queue length and hold, so a hold test cannot pass on the exit ghost
 * a dismissed card keeps painted for 500 ms (plan 743).
 */
const Queue = () => {
  const toast = useToast();
  const held = Option.match(toast.timingFor("1"), {
    onNone: () => "none",
    onSome: (timing) => (timing.paused ? "held" : "running"),
  });
  return <text testId="queue-state">{`${toast.toasts.length}:${held}`}</text>;
};

const Harness = ({
  onElsewhere,
  onAction,
  duration,
  position,
}: {
  readonly onElsewhere?: () => void;
  readonly onAction?: () => void;
  readonly duration?: Duration.Input;
  readonly position?: ToastPosition;
}) => (
  // One root element: the native test renderer reports a single tree root, and a
  // provider's children are siblings of each other.
  <div style={{ width: 1200, height: 760 }}>
    <ToastProvider defaultDuration={duration}>
      <Controls
        onElsewhere={onElsewhere ?? (() => undefined)}
        onAction={onAction}
      />
      <ToastViewport position={position} />
      <Queue />
    </ToastProvider>
  </div>
);

/** The queue and hold a hold test must read instead of the painted card. */
const queueState = (root: ComponentTestRoot): string =>
  root.renderer
    .getAllText()
    .find((text) => /^\d+:(held|running|none)$/.test(text)) ?? "?";

/** The store updates through its runtime, so let the microtask queue drain. */
const settle = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

/** Complete the 500 ms toast exit and paint the result. */
const finishExit = (root: ComponentTestRoot): void => {
  finishMotion(root, 500);
};

/** The measured y of a toast card, or a broken-fixture failure. */
const toastY = (root: ComponentTestRoot, testId: string): number =>
  Option.getOrElse(boundsOf(root, testId), () => {
    throw new Error(`behaviour: no toast "${testId}"`);
  }).y;

/** The progress fill's authored width, in pixels. */
const progressWidth = (root: ComponentTestRoot): number => {
  const width = root.renderer.findByTestId("toast-1-progress")?.style.width;
  if (typeof width !== "number") {
    throw new Error("behaviour: no toast progress bar");
  }
  return width;
};

describe("Toast", () => {
  it("exposes a pushed toast's message as the status region", async () => {
    const page = renderComponent(<Harness />);
    expect(
      page.renderer.findByTestId("toast-viewport")?.customProps?.role,
    ).toBe("group");

    clickCentreOf(page, "push");
    await settle();

    const statuses = nodesWithRole(page.renderer, "status");
    expect(statuses.map((node) => node.name)).toEqual([
      "Saved changes: 3 files",
    ]);
    expect(page.renderer.getAllText()).toContain("Saved changes");
    expect(page.renderer.getAllText()).toContain("3 files");
    expect(page.renderer.findByType("svg")).toHaveLength(2);

    page.unmount();
  });

  it("stacks a newer toast below the older one", async () => {
    const page = renderComponent(<Harness />);

    clickCentreOf(page, "push");
    await settle();
    clickCentreOf(page, "push-warning");
    await settle();

    expect(toastY(page, "toast-2")).toBeGreaterThan(toastY(page, "toast-1"));

    page.unmount();
  });

  it("dismisses only the toast whose control was pressed", async () => {
    const page = renderComponent(<Harness />);

    clickCentreOf(page, "push");
    await settle();
    clickCentreOf(page, "push-warning");
    await settle();

    clickCentreOf(page, "toast-1-dismiss");
    await settle();
    finishExit(page);

    expect(page.renderer.getAllText()).not.toContain("Saved changes");
    expect(page.renderer.getAllText()).toContain("Disk nearly full");

    page.unmount();
  });

  it("names each card's controls after the card", async () => {
    const page = renderComponent(<Harness onAction={() => undefined} />);

    clickCentreOf(page, "push");
    await settle();
    clickCentreOf(page, "push-action");
    await settle();

    // Two cards on screen shared one handle before plan 770, so neither a
    // consumer nor this suite could address one card's control.
    expect(page.renderer.findByTestId("toast-1-dismiss")).toBeDefined();
    expect(page.renderer.findByTestId("toast-2-dismiss")).toBeDefined();
    expect(page.renderer.findByTestId("toast-2-action")).toBeDefined();
    expect(page.renderer.findByTestId("toast-1-action")).toBeUndefined();

    page.unmount();
  });

  it("hands focus to the next card when a dismiss control removes its card", async () => {
    // Written against host ids, so the case fails on the old source for the
    // focus reason and not because the control names changed (plan 770).
    const page = renderComponent(<Harness />);

    clickCentreOf(page, "push");
    await settle();
    clickCentreOf(page, "push-warning");
    await settle();

    const dismisses = page.renderer
      .findByType("div")
      .filter(
        (element) =>
          element.testId?.startsWith("toast-") === true &&
          element.testId.endsWith("-dismiss"),
      );
    expect(dismisses).toHaveLength(2);
    const first = dismisses[0];
    const second = dismisses[1];
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    if (first === undefined || second === undefined) return;

    page.renderer.focusElement(first.id);
    page.renderer.nativeSimulateKeyDown(first.id, "enter");
    await settle();

    expect(page.renderer.getFocusedElementId()).toBe(second.id);

    finishExit(page);
    expect(page.renderer.getFocusedElementId()).toBe(second.id);

    page.unmount();
  });

  it("hands focus to the card above when the last card is dismissed", async () => {
    const page = renderComponent(<Harness />);

    clickCentreOf(page, "push");
    await settle();
    clickCentreOf(page, "push-warning");
    await settle();
    clickCentreOf(page, "push-persistent");
    await settle();

    const dismisses = page.renderer
      .findByType("div")
      .filter(
        (element) =>
          element.testId?.startsWith("toast-") === true &&
          element.testId.endsWith("-dismiss"),
      );
    expect(dismisses).toHaveLength(3);
    const middle = dismisses[1];
    const last = dismisses[2];
    expect(middle).toBeDefined();
    expect(last).toBeDefined();
    if (middle === undefined || last === undefined) return;

    page.renderer.focusElement(last.id);
    page.renderer.nativeSimulateKeyDown(last.id, "enter");
    await settle();
    finishExit(page);

    expect(page.renderer.getFocusedElementId()).toBe(middle.id);

    page.unmount();
  });

  it("hands focus to the neighbouring card when an action removes its card", async () => {
    const onAction = vi.fn();
    const page = renderComponent(<Harness onAction={onAction} />);

    clickCentreOf(page, "push-action");
    await settle();
    clickCentreOf(page, "push-warning");
    await settle();

    const actions = page.renderer
      .findByType("div")
      .filter(
        (element) =>
          element.testId?.startsWith("toast-") === true &&
          element.testId.endsWith("-action"),
      );
    const dismisses = page.renderer
      .findByType("div")
      .filter(
        (element) =>
          element.testId?.startsWith("toast-") === true &&
          element.testId.endsWith("-dismiss"),
      );
    expect(actions).toHaveLength(1);
    expect(dismisses).toHaveLength(2);
    const action = actions[0];
    const neighbour = dismisses[1];
    expect(action).toBeDefined();
    expect(neighbour).toBeDefined();
    if (action === undefined || neighbour === undefined) return;

    page.renderer.focusElement(action.id);
    page.renderer.nativeSimulateKeyDown(action.id, "enter");
    await settle();
    finishExit(page);

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(page.renderer.getFocusedElementId()).toBe(neighbour.id);

    page.unmount();
  });

  it("clears the stack with dismissAll", async () => {
    const page = renderComponent(<Harness />);

    clickCentreOf(page, "push");
    await settle();
    clickCentreOf(page, "push-warning");
    await settle();

    clickCentreOf(page, "dismiss-all");
    await settle();
    finishExit(page);

    expect(page.renderer.findByTestId("toast-1")).toBeUndefined();
    expect(page.renderer.findByTestId("toast-2")).toBeUndefined();

    page.unmount();
  });

  it("does not block a click on the page behind the viewport", async () => {
    const onElsewhere = vi.fn();
    const page = renderComponent(<Harness onElsewhere={onElsewhere} />);

    clickCentreOf(page, "push");
    await settle();

    clickCentreOf(page, "elsewhere");

    expect(onElsewhere).toHaveBeenCalledTimes(1);

    page.unmount();
  });

  it("paints the toast surface from whichever theme is active", async () => {
    const assertTheme = async (
      theme: TestTheme,
      popover: string,
    ): Promise<void> => {
      const page = renderComponent(<Harness />, theme);
      clickCentreOf(page, "push");
      await settle();

      expect(page.renderer.findByTestId("toast-1")?.style.backgroundColor).toBe(
        popover,
      );

      page.unmount();
    };

    await assertTheme("dark", darkTheme.colors.popover);
    await assertTheme("light", lightTheme.colors.popover);
  });

  it("keeps the queue working after a dismiss", async () => {
    const page = renderComponent(<Harness />);

    clickCentreOf(page, "push");
    await settle();
    clickCentreOf(page, "toast-1-dismiss");
    await settle();
    clickCentreOf(page, "push-warning");
    await settle();

    expect(page.renderer.getAllText()).toContain("Disk nearly full");

    page.unmount();
  });

  it("pauses auto-dismiss while the pointer rests on the toast", async () => {
    const page = renderComponent(<Harness duration={Duration.millis(600)} />);

    clickCentreOf(page, "push");
    await settle();

    hoverCentreOf(page, "toast-1");
    await new Promise((resolve) => setTimeout(resolve, 900));
    await settle();

    expect(page.renderer.findByTestId("toast-1")).toBeDefined();

    hoverCentreOf(page, "elsewhere");
    await new Promise((resolve) => setTimeout(resolve, 900));
    await settle();
    finishExit(page);

    expect(page.renderer.findByTestId("toast-1")).toBeUndefined();

    page.unmount();
  });

  it("pauses auto-dismiss while keyboard focus is on the dismiss control", async () => {
    const page = renderComponent(<Harness duration={Duration.millis(600)} />);

    clickCentreOf(page, "push");
    await settle();

    const dismiss = page.renderer.findByTestId("toast-1-dismiss");
    expect(dismiss).toBeDefined();
    page.renderer.focusElement(dismiss?.id ?? -1);

    await new Promise((resolve) => setTimeout(resolve, 900));
    await settle();

    // The card is still queued: a dismissed card stays painted for its exit.
    expect(queueState(page)).toBe("1:held");

    page.renderer.focusElement(
      page.renderer.findByTestId("elsewhere")?.id ?? -1,
    );
    await new Promise((resolve) => setTimeout(resolve, 900));
    await settle();
    finishExit(page);

    expect(queueState(page)).toBe("0:none");
    expect(page.renderer.findByTestId("toast-1")).toBeUndefined();

    page.unmount();
  });

  it("keeps the hold when the pointer leaves while focus stays inside", async () => {
    const page = renderComponent(<Harness duration={Duration.millis(600)} />);

    clickCentreOf(page, "push");
    await settle();

    hoverCentreOf(page, "toast-1");
    page.renderer.focusElement(
      page.renderer.findByTestId("toast-1-dismiss")?.id ?? -1,
    );
    hoverCentreOf(page, "elsewhere");

    await new Promise((resolve) => setTimeout(resolve, 900));
    await settle();

    // Focus alone keeps the card queued after the pointer has left it.
    expect(queueState(page)).toBe("1:held");

    page.renderer.focusElement(
      page.renderer.findByTestId("elsewhere")?.id ?? -1,
    );
    await new Promise((resolve) => setTimeout(resolve, 900));
    await settle();
    finishExit(page);

    expect(queueState(page)).toBe("0:none");
    expect(page.renderer.findByTestId("toast-1")).toBeUndefined();

    page.unmount();
  });

  it("holds the auto-dismiss clock while the pointer is on the toast's action", async () => {
    const page = renderComponent(
      <Harness duration={Duration.seconds(2)} onAction={() => undefined} />,
    );

    clickCentreOf(page, "push-action");
    await settle();
    await new Promise((resolve) => setTimeout(resolve, 50));
    await settle();

    hoverCentreOf(page, "toast-1-action");
    await new Promise((resolve) => setTimeout(resolve, 150));
    await settle();
    const held = progressWidth(page);

    await new Promise((resolve) => setTimeout(resolve, 400));
    await settle();

    expect(progressWidth(page)).toBe(held);

    page.unmount();
  });

  it("holds the auto-dismiss clock while the pointer is on the dismiss control", async () => {
    const page = renderComponent(<Harness duration={Duration.seconds(2)} />);

    clickCentreOf(page, "push");
    await settle();
    await new Promise((resolve) => setTimeout(resolve, 50));
    await settle();

    hoverCentreOf(page, "toast-1-dismiss");
    await new Promise((resolve) => setTimeout(resolve, 150));
    await settle();
    const held = progressWidth(page);

    await new Promise((resolve) => setTimeout(resolve, 400));
    await settle();

    expect(progressWidth(page)).toBe(held);

    page.unmount();
  });

  it("resumes the auto-dismiss clock after the pointer leaves the action", async () => {
    const page = renderComponent(
      <Harness duration={Duration.seconds(2)} onAction={() => undefined} />,
    );

    clickCentreOf(page, "push-action");
    await settle();
    await new Promise((resolve) => setTimeout(resolve, 50));
    await settle();

    hoverCentreOf(page, "toast-1-action");
    await new Promise((resolve) => setTimeout(resolve, 150));
    await settle();
    const held = progressWidth(page);

    hoverCentreOf(page, "elsewhere");
    await new Promise((resolve) => setTimeout(resolve, 400));
    await settle();

    expect(progressWidth(page)).toBeLessThan(held);

    page.unmount();
  });

  it("paints a shrinking bar that holds while the pointer rests on the card", async () => {
    const page = renderComponent(<Harness duration={Duration.seconds(2)} />);

    clickCentreOf(page, "push");
    await settle();
    await new Promise((resolve) => setTimeout(resolve, 50));
    await settle();

    const start = progressWidth(page);
    await new Promise((resolve) => setTimeout(resolve, 300));
    await settle();
    const later = progressWidth(page);
    expect(later).toBeLessThan(start);

    hoverCentreOf(page, "toast-1");
    await settle();
    const held = progressWidth(page);
    await new Promise((resolve) => setTimeout(resolve, 300));
    await settle();
    expect(progressWidth(page)).toBe(held);

    hoverCentreOf(page, "elsewhere");
    await settle();
    await new Promise((resolve) => setTimeout(resolve, 300));
    await settle();
    expect(progressWidth(page)).toBeLessThan(held);

    page.unmount();
  });

  it("draws no progress bar for a toast that never auto-dismisses", async () => {
    const page = renderComponent(<Harness />);

    clickCentreOf(page, "push-persistent");
    await settle();

    expect(page.renderer.findByTestId("toast-1")).toBeDefined();
    expect(page.renderer.findByTestId("toast-1-progress")).toBeUndefined();

    page.unmount();
  });

  it("renders the labelled action, runs it once and dismisses the toast", async () => {
    const onAction = vi.fn();
    const page = renderComponent(<Harness onAction={onAction} />);

    clickCentreOf(page, "push-action");
    await settle();

    expect(page.renderer.getAllText()).toContain("Undo");

    clickCentreOf(page, "toast-1-action");
    await settle();
    finishExit(page);

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(page.renderer.findByTestId("toast-1")).toBeUndefined();

    page.unmount();
  });

  it("renders no action control when the label has no handler", async () => {
    const page = renderComponent(<Harness />);

    clickCentreOf(page, "push-unhandled");
    await settle();

    expect(page.renderer.getAllText()).toContain("Archived, no handler");
    expect(page.renderer.findByTestId("toast-1-action")).toBeUndefined();

    page.unmount();
  });

  it("renders no action control for a toast without an action", async () => {
    const page = renderComponent(<Harness />);

    clickCentreOf(page, "push");
    await settle();

    expect(page.renderer.findByTestId("toast-1")).toBeDefined();
    expect(page.renderer.findByTestId("toast-1-action")).toBeUndefined();

    page.unmount();
  });

  it("pauses auto-dismiss while keyboard focus is on the action control", async () => {
    const page = renderComponent(
      <Harness duration={Duration.millis(600)} onAction={() => undefined} />,
    );

    clickCentreOf(page, "push-action");
    await settle();

    page.renderer.focusElement(
      page.renderer.findByTestId("toast-1-action")?.id ?? -1,
    );

    await new Promise((resolve) => setTimeout(resolve, 900));
    await settle();

    expect(queueState(page)).toBe("1:held");

    page.renderer.focusElement(
      page.renderer.findByTestId("elsewhere")?.id ?? -1,
    );
    await new Promise((resolve) => setTimeout(resolve, 900));
    await settle();
    finishExit(page);

    expect(queueState(page)).toBe("0:none");
    expect(page.renderer.findByTestId("toast-1")).toBeUndefined();

    page.unmount();
  });

  it("resumes the clock when native focus leaves the card", async () => {
    const page = renderComponent(
      <Harness duration={Duration.seconds(2)} onAction={() => undefined} />,
    );

    clickCentreOf(page, "push-action");
    await settle();
    await new Promise((resolve) => setTimeout(resolve, 60));
    await settle();

    page.renderer.focusElement(
      page.renderer.findByTestId("toast-1-action")?.id ?? -1,
    );
    await new Promise((resolve) => setTimeout(resolve, 150));
    await settle();
    const held = progressWidth(page);

    await new Promise((resolve) => setTimeout(resolve, 300));
    await settle();
    expect(progressWidth(page)).toBe(held);

    page.renderer.focusElement(
      page.renderer.findByTestId("elsewhere")?.id ?? -1,
    );
    await new Promise((resolve) => setTimeout(resolve, 300));
    await settle();
    expect(progressWidth(page)).toBeLessThan(held);

    page.unmount();
  });

  it("enters with the 500 ms toast motion", async () => {
    const page = renderComponent(<Harness />);

    clickCentreOf(page, "push");
    await settle();

    const animated = page.renderer
      .findByType("div")
      .filter((element) => element.customProps?.motion !== undefined);

    expect(animated).toHaveLength(1);
    expect(animated[0]?.customProps?.motion).toEqual(
      expect.objectContaining({
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
      }),
    );

    page.unmount();
  });

  it("keeps a dismissed card for its exit, then removes it", async () => {
    const page = renderComponent(<Harness />);

    clickCentreOf(page, "push");
    await settle();
    clickCentreOf(page, "toast-1-dismiss");
    await settle();

    // The store has dropped it, but the animated card is still on screen.
    expect(page.renderer.findByTestId("toast-1")).toBeDefined();

    finishExit(page);

    expect(page.renderer.findByTestId("toast-1")).toBeUndefined();

    page.unmount();
  });

  it("paints the default bottom-right corner", () => {
    const page = renderComponent(<Harness />);

    const style = page.renderer.findByTestId("toast-viewport")?.style;
    expect(style?.bottom).toBe(darkTheme.spacing.xl);
    expect(style?.right).toBe(darkTheme.spacing.xl);
    expect(style?.top).toBeUndefined();
    expect(style?.left).toBeUndefined();

    page.unmount();
  });

  it("pins the corner the caller names on both axes", () => {
    const offsets = Arr.map(
      ["top-left", "top-right", "bottom-left"] as const,
      (position) => {
        const page = renderComponent(<Harness position={position} />);
        const style = page.renderer.findByTestId("toast-viewport")?.style;
        const result = [
          style?.top,
          style?.bottom,
          style?.left,
          style?.right,
          style?.alignItems,
        ];
        page.unmount();
        return result;
      },
    );

    expect(offsets).toEqual([
      [
        darkTheme.spacing.xl,
        undefined,
        darkTheme.spacing.xl,
        undefined,
        "flex-start",
      ],
      [
        darkTheme.spacing.xl,
        undefined,
        undefined,
        darkTheme.spacing.xl,
        "flex-end",
      ],
      [
        undefined,
        darkTheme.spacing.xl,
        darkTheme.spacing.xl,
        undefined,
        "flex-start",
      ],
    ]);
  });
});
