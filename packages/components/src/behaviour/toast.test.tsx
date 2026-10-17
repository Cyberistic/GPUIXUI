/**
 * Toast behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a pushed toast never reaching the viewport; the stack
 * painting in the wrong order (the newest must be below the oldest); dismissing
 * one toast removing another; `dismissAll` leaving a card behind; the viewport
 * swallowing clicks on the page behind it; and a toast painted with the wrong
 * theme surface.
 */

import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import { Button } from "../internal/button.js";
import { boundsOf, clickCentreOf } from "../internal/interaction.js";
import { darkTheme, lightTheme } from "../internal/theme.js";
import {
  renderComponent,
  type ComponentTestRoot,
  type TestTheme,
} from "../internal/test-root.js";
import { ToastProvider, ToastViewport, useToast } from "../toast.js";

/** A page with two push buttons, a dismiss-all and an unrelated control. */
const Controls = ({ onElsewhere }: { readonly onElsewhere: () => void }) => {
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

const Harness = ({ onElsewhere }: { readonly onElsewhere?: () => void }) => (
  // One root element: the native test renderer reports a single tree root, and a
  // provider's children are siblings of each other.
  <div style={{ width: 1200, height: 760 }}>
    <ToastProvider>
      <Controls onElsewhere={onElsewhere ?? (() => undefined)} />
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
});
