/**
 * SlidingText in the real GPUix renderer.
 *
 * The bugs these guard: a clip box that does not clip (the outgoing and the
 * incoming value would paint together); a swap at the moment the value changes,
 * so the slide has nothing to travel; an entry that starts at rest, or travels
 * the wrong way; a travel measured from anything but the box's own width (the
 * runtime keeps insets as numbers, so a guessed distance is the wrong one); a
 * swap before the width is known reaching the runtime as `NaN`; and a reduced
 * run that still waits for the clock.
 *
 * The motion clock is paused for the frame readings, so the entering value's
 * offset is the declared edge rather than wherever real time had got. The swap
 * itself is a real timer between two tweens, so that half polls.
 */

import type { TestElement } from "@gpuix/react/testing";
import { describe, expect, it } from "vitest";
import { a11yNodes } from "../internal/a11y.js";
import { after, settle, waitFor } from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";
import { darkTheme } from "../internal/theme.js";
import { MotionProvider } from "../motion.js";
import { SlidingText } from "../sliding-text.js";

const lineHeight = darkTheme.typography.body.lineHeight;

/** The width the clip is given, so the travel is a known number. */
const width = 200;

/** A sliding value in a clip of `width` pixels. */
const slide = (text: string, extra: { readonly back?: boolean } = {}) => (
  <SlidingText
    testId="slide"
    text={text}
    direction={extra.back === true ? "back" : "forward"}
    style={{ width }}
  />
);

/** Every painted string: the value on screen. */
const painted = (page: ReturnType<typeof renderComponent>): string =>
  page.renderer.getAllText().join("");

/** The value's host — the runtime paints a styled host and its run. */
const host = (page: ReturnType<typeof renderComponent>): TestElement => {
  const found = page.renderer
    .findByType("text")
    .find((element) => element.text === null);
  if (found === undefined) {
    throw new Error("behaviour: the slide painted no text host");
  }
  return found;
};

/** One element by test id, failing rather than casting. */
const byTestId = (
  page: ReturnType<typeof renderComponent>,
  testId: string,
): TestElement => {
  const element = page.renderer.findByTestId(testId);
  if (element === undefined) {
    throw new Error(`behaviour: no element with testId "${testId}"`);
  }
  return element;
};

/** Change the value and let the effect that starts the slide run. */
const change = async (
  page: ReturnType<typeof renderComponent>,
  node: React.ReactNode,
): Promise<void> => {
  page.rerender(node);
  await after(0);
  settle(page);
};

/** How far the value sits from the clip's left edge. */
const offsetOf = (page: ReturnType<typeof renderComponent>): number => {
  const box = page.renderer.getElementBounds(byTestId(page, "slide").id);
  const value = page.renderer.getElementBounds(host(page).id);
  if (box === null || value === null) {
    throw new Error("behaviour: the slide painted no box");
  }
  return value.x - box.x;
};

describe("SlidingText", () => {
  it("clips the value to one line of its role and the width it is given", () => {
    const page = renderComponent(slide("42"));
    try {
      settle(page);
      const box = byTestId(page, "slide");
      expect(box.style.overflow).toBe("hidden");
      expect(box.style.height).toBe(lineHeight);
      expect(box.style.width).toBe(width);
      expect(page.renderer.getAllText()).toEqual(["42"]);
    } finally {
      page.unmount();
    }
  });

  it("keeps the outgoing value for the exit half, then paints the new one", async () => {
    const page = renderComponent(slide("first"));
    try {
      settle(page);
      page.renderer.clockPause();
      await change(page, slide("second"));

      expect(painted(page)).toBe("first");
      await waitFor(() => expect(painted(page)).toBe("second"));
    } finally {
      page.unmount();
    }
  });

  it("travels the outgoing value out of the clip before the swap", async () => {
    const page = renderComponent(slide("first"));
    try {
      settle(page);
      page.renderer.clockPause();
      await change(page, slide("second"));

      expect(host(page).customProps?.motion).toMatchObject({
        animate: { opacity: 0, left: -width },
      });
    } finally {
      page.unmount();
    }
  });

  it("starts the incoming value beyond the far edge and slides it home", async () => {
    const page = renderComponent(slide("first"));
    try {
      settle(page);
      page.renderer.clockPause();
      await change(page, slide("second"));
      await waitFor(() => expect(painted(page)).toBe("second"));

      expect(host(page).customProps?.motion).toMatchObject({
        initial: { opacity: 0, left: width },
      });
      expect(offsetOf(page)).toBeCloseTo(width, 1);

      page.renderer.clockFastForward(400);
      settle(page);
      expect(offsetOf(page)).toBeCloseTo(0, 1);
    } finally {
      page.unmount();
    }
  });

  it("reverses the travel for a back slide", async () => {
    const page = renderComponent(slide("first", { back: true }));
    try {
      settle(page);
      page.renderer.clockPause();
      await change(page, slide("second", { back: true }));

      expect(host(page).customProps?.motion).toMatchObject({
        animate: { left: width },
      });
    } finally {
      page.unmount();
    }
  });

  it("fades in place before the box has reported its width", async () => {
    const page = renderComponent(slide("first"));
    try {
      // No `settle`: the layout event that carries the width is never delivered.
      page.renderer.clockPause();
      page.rerender(slide("second"));
      await after(0);
      page.renderer.flush();

      expect(host(page).customProps?.motion).toMatchObject({
        animate: { opacity: 0, left: 0 },
      });
    } finally {
      page.unmount();
    }
  });

  it("paints the new value at once under the reduced preference", async () => {
    const page = renderComponent(
      <MotionProvider preference="reduced">{slide("first")}</MotionProvider>,
    );
    try {
      settle(page);
      page.renderer.clockPause();
      await change(
        page,
        <MotionProvider preference="reduced">{slide("second")}</MotionProvider>,
      );

      expect(painted(page)).toBe("second");
      expect(host(page).customProps?.motion).toMatchObject({
        transition: { duration: 0 },
      });
    } finally {
      page.unmount();
    }
  });

  it("lands on the newest value when the value changes mid-exit", async () => {
    const page = renderComponent(slide("first"));
    try {
      settle(page);
      await change(page, slide("second"));
      await after(20);
      await change(page, slide("third"));

      await waitFor(() => expect(painted(page)).toBe("third"));

      // One value is mounted, not a queue: the superseded one never paints and
      // the tree holds one name.
      const names = a11yNodes(page.renderer).map((node) => node.name);
      expect(names).toContain("third");
      expect(names).not.toContain("second");
      expect(names).not.toContain("first");
    } finally {
      page.unmount();
    }
  });
});
