/**
 * PageTransition in the real GPUix renderer.
 *
 * The bugs these guard: a swap that mounts the incoming view beside the
 * outgoing one (two pages in the accessibility tree and in the focus order); an
 * exit that never finishes, so the old view is the page for good; a settle that
 * runs before the exit tween; a travel that points the wrong way for the
 * direction, or on the wrong axis; a reduced run that still travels; a key
 * changed mid-exit that paints the abandoned view; and a return to the view on
 * screen that leaves it and remounts the same content.
 *
 * The exit is a real timer while the arrival is a motion-clock tween, so the
 * swap itself polls and the travel is read on a paused clock. A headless tree
 * reports bounds and text, not paint, so the travel is the observable half of
 * the fade-and-offset pair.
 */

import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { requireBounds, settle, waitFor } from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";
import { MotionProvider } from "../motion.js";
import { PageTransition } from "../page-transition.js";
import type { PageTransitionProps } from "../page-transition.js";

/** One view inside a framed region, so a shifted child is measurable. */
const scene = (
  viewKey: string,
  props: Partial<PageTransitionProps> = {},
): ReactNode => (
  <div testId="frame" style={{ display: "flex", flexDirection: "column" }}>
    <PageTransition testId="page" viewKey={viewKey} {...props}>
      <div testId={`content-${viewKey}`} style={{ height: 40 }}>
        {viewKey}
      </div>
    </PageTransition>
  </div>
);

/** How far the mounted view sits from the region's own left edge. */
const offsetX = (page: ReturnType<typeof renderComponent>): number =>
  requireBounds(page, "page-view").x - requireBounds(page, "page").x;

/** The text of the one mounted view, `[]` when a view is missing. */
const shownText = (page: ReturnType<typeof renderComponent>): unknown =>
  page.renderer.getAllText();

describe("PageTransition", () => {
  it("holds the outgoing view for its exit, then mounts the incoming one", async () => {
    const page = renderComponent(scene("a"));
    try {
      expect(shownText(page)).toEqual(["a"]);

      page.rerender(scene("b"));
      settle(page);
      expect(shownText(page)).toEqual(["a"]);
      expect(page.renderer.findByTestId("content-b")).toBeUndefined();

      await waitFor(() => expect(shownText(page)).toEqual(["b"]));
      expect(page.renderer.findByTestId("content-a")).toBeUndefined();
    } finally {
      page.unmount();
    }
  });

  it("travels the incoming view in from the right when moving forward", async () => {
    const page = renderComponent(scene("a"));
    try {
      page.renderer.clockPause();
      page.rerender(scene("b"));
      settle(page);
      await waitFor(() =>
        expect(page.renderer.findByTestId("content-b")).toBeDefined(),
      );

      expect(offsetX(page)).toBeCloseTo(16, 1);

      page.renderer.clockFastForward(600);
      settle(page);
      expect(offsetX(page)).toBeCloseTo(0, 1);
    } finally {
      page.unmount();
    }
  });

  it("mirrors the travel when moving back", async () => {
    const page = renderComponent(scene("b", { direction: "back" }));
    try {
      page.renderer.clockPause();
      page.rerender(scene("a", { direction: "back" }));
      settle(page);
      await waitFor(() =>
        expect(page.renderer.findByTestId("content-a")).toBeDefined(),
      );

      expect(offsetX(page)).toBeCloseTo(-16, 1);
      expect(offsetX(page)).toBeLessThan(0);
    } finally {
      page.unmount();
    }
  });

  it("swaps in the frame it changes for none and the reduced preference", () => {
    const plain = renderComponent(scene("a"));
    try {
      plain.renderer.clockPause();
      plain.rerender(scene("b", { level: "none" }));
      settle(plain);

      expect(shownText(plain)).toEqual(["b"]);
      expect(offsetX(plain)).toBeCloseTo(0, 1);
    } finally {
      plain.unmount();
    }

    const reduced = renderComponent(
      <MotionProvider preference="reduced">{scene("a")}</MotionProvider>,
    );
    try {
      reduced.renderer.clockPause();
      reduced.rerender(
        <MotionProvider preference="reduced">{scene("b")}</MotionProvider>,
      );
      settle(reduced);

      expect(shownText(reduced)).toEqual(["b"]);
      expect(offsetX(reduced)).toBeCloseTo(0, 1);
      expect(
        reduced.renderer.findByTestId("page-view")?.customProps?.motion,
      ).toMatchObject({ transition: { duration: 0 } });
    } finally {
      reduced.unmount();
    }
  });

  it("replaces the waiting view when the key changes mid-exit", async () => {
    const page = renderComponent(scene("a"));
    try {
      page.rerender(scene("b"));
      settle(page);
      page.rerender(scene("c"));
      settle(page);

      // The abandoned view is never painted: one exit, one arrival.
      expect(shownText(page)).toEqual(["a"]);
      expect(page.renderer.findByTestId("content-b")).toBeUndefined();

      await waitFor(() => expect(shownText(page)).toEqual(["c"]));
      expect(page.renderer.findByTestId("content-b")).toBeUndefined();
    } finally {
      page.unmount();
    }
  });

  it("cancels the exit when the reader returns to the view on screen", async () => {
    const page = renderComponent(scene("a", { level: "slow" }));
    try {
      page.renderer.clockPause();
      page.rerender(scene("b", { level: "slow" }));
      settle(page);
      page.renderer.clockFastForward(100);
      settle(page);
      const midExit = offsetX(page);
      expect(midExit).toBeLessThan(0);

      page.rerender(scene("a", { level: "slow" }));
      settle(page);
      // A running exit would travel further out; a cancelled one returns home.
      page.renderer.clockFastForward(100);
      settle(page);
      expect(offsetX(page)).toBeGreaterThan(midExit);

      page.renderer.clockFastForward(600);
      settle(page);

      // It came back instead of leaving and mounting a second copy.
      expect(shownText(page)).toEqual(["a"]);
      expect(offsetX(page)).toBeCloseTo(0, 1);
      expect(page.renderer.findByTestId("content-b")).toBeUndefined();
    } finally {
      page.unmount();
    }
  });
});
