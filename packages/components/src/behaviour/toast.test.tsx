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
 * behind, or let the toast expire while its action held keyboard focus.
 */

import { describe, expect, it, vi } from "vitest";
import { Duration } from "effect";
import * as Option from "effect/Option";
import { Button } from "../internal/button.js";
import {
  boundsOf,
  clickCentreOf,
  hoverCentreOf,
} from "../internal/interaction.js";
import { darkTheme, lightTheme } from "../internal/theme.js";
import {
  renderComponent,
  type ComponentTestRoot,
  type TestTheme,
} from "../internal/test-root.js";
import { ToastProvider, ToastViewport, useToast } from "../toast.js";

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
}: {
  readonly onElsewhere?: () => void;
  readonly onAction?: () => void;
  readonly duration?: Duration.Input;
}) => (
  // One root element: the native test renderer reports a single tree root, and a
  // provider's children are siblings of each other.
  <div style={{ width: 1200, height: 760 }}>
    <ToastProvider defaultDuration={duration}>
      <Controls
        onElsewhere={onElsewhere ?? (() => undefined)}
        onAction={onAction}
      />
      <ToastViewport />
    </ToastProvider>
  </div>
);

/** The store updates through its runtime, so let the microtask queue drain. */
const settle = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

/** The measured y of a toast card, or a broken-fixture failure. */
const toastY = (root: ComponentTestRoot, testId: string): number =>
  Option.getOrElse(boundsOf(root, testId), () => {
    throw new Error(`behaviour: no toast "${testId}"`);
  }).y;

describe("Toast", () => {
  it("shows a pushed toast and exposes the viewport as a status region", async () => {
    const page = renderComponent(<Harness />);
    expect(
      page.renderer.findByTestId("toast-viewport")?.customProps?.role,
    ).toBe("status");

    clickCentreOf(page, "push");
    await settle();

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

    clickCentreOf(page, "toast-dismiss");
    await settle();

    expect(page.renderer.getAllText()).not.toContain("Saved changes");
    expect(page.renderer.getAllText()).toContain("Disk nearly full");

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
    clickCentreOf(page, "toast-dismiss");
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

    expect(page.renderer.findByTestId("toast-1")).toBeUndefined();

    page.unmount();
  });

  it("pauses auto-dismiss while keyboard focus is on the dismiss control", async () => {
    const page = renderComponent(<Harness duration={Duration.millis(600)} />);

    clickCentreOf(page, "push");
    await settle();

    const dismiss = page.renderer.findByTestId("toast-dismiss");
    expect(dismiss).toBeDefined();
    page.renderer.focusElement(dismiss?.id ?? -1);

    await new Promise((resolve) => setTimeout(resolve, 900));
    await settle();

    expect(page.renderer.findByTestId("toast-1")).toBeDefined();

    page.renderer.focusElement(
      page.renderer.findByTestId("elsewhere")?.id ?? -1,
    );
    await new Promise((resolve) => setTimeout(resolve, 900));
    await settle();

    expect(page.renderer.findByTestId("toast-1")).toBeUndefined();

    page.unmount();
  });

  it("keeps the hold when the pointer leaves while focus stays inside", async () => {
    const page = renderComponent(<Harness duration={Duration.millis(600)} />);

    clickCentreOf(page, "push");
    await settle();

    hoverCentreOf(page, "toast-1");
    page.renderer.focusElement(
      page.renderer.findByTestId("toast-dismiss")?.id ?? -1,
    );
    hoverCentreOf(page, "elsewhere");

    await new Promise((resolve) => setTimeout(resolve, 900));
    await settle();

    expect(page.renderer.findByTestId("toast-1")).toBeDefined();

    page.renderer.focusElement(
      page.renderer.findByTestId("elsewhere")?.id ?? -1,
    );
    await new Promise((resolve) => setTimeout(resolve, 900));
    await settle();

    expect(page.renderer.findByTestId("toast-1")).toBeUndefined();

    page.unmount();
  });

  it("renders the labelled action, runs it once and dismisses the toast", async () => {
    const onAction = vi.fn();
    const page = renderComponent(<Harness onAction={onAction} />);

    clickCentreOf(page, "push-action");
    await settle();

    expect(page.renderer.getAllText()).toContain("Undo");

    clickCentreOf(page, "toast-action");
    await settle();

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(page.renderer.findByTestId("toast-1")).toBeUndefined();

    page.unmount();
  });

  it("renders no action control when the label has no handler", async () => {
    const page = renderComponent(<Harness />);

    clickCentreOf(page, "push-unhandled");
    await settle();

    expect(page.renderer.getAllText()).toContain("Archived, no handler");
    expect(page.renderer.findByTestId("toast-action")).toBeUndefined();

    page.unmount();
  });

  it("renders no action control for a toast without an action", async () => {
    const page = renderComponent(<Harness />);

    clickCentreOf(page, "push");
    await settle();

    expect(page.renderer.findByTestId("toast-1")).toBeDefined();
    expect(page.renderer.findByTestId("toast-action")).toBeUndefined();

    page.unmount();
  });

  it("pauses auto-dismiss while keyboard focus is on the action control", async () => {
    const page = renderComponent(
      <Harness duration={Duration.millis(600)} onAction={() => undefined} />,
    );

    clickCentreOf(page, "push-action");
    await settle();

    page.renderer.focusElement(
      page.renderer.findByTestId("toast-action")?.id ?? -1,
    );

    await new Promise((resolve) => setTimeout(resolve, 900));
    await settle();

    expect(page.renderer.findByTestId("toast-1")).toBeDefined();

    page.renderer.focusElement(
      page.renderer.findByTestId("elsewhere")?.id ?? -1,
    );
    await new Promise((resolve) => setTimeout(resolve, 900));
    await settle();

    expect(page.renderer.findByTestId("toast-1")).toBeUndefined();

    page.unmount();
  });
});
