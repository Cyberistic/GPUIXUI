/**
 * RollingText in the real GPUix renderer.
 *
 * The bugs these guard: a clip box that does not clip (the outgoing and the
 * incoming value would paint together); a swap at the moment the value changes,
 * so the roll has nothing to travel; an entry that starts at rest, or travels the
 * wrong way; a reduced run that still waits for the clock; a value that changes
 * mid-exit and lands on the superseded one; and both halves left in the
 * accessibility tree.
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
import { RollingText } from "../rolling-text.js";

const lineHeight = darkTheme.typography.body.lineHeight;

/** Every painted string: the value on screen. */
const painted = (page: ReturnType<typeof renderComponent>): string =>
  page.renderer.getAllText().join("");

/** The value's host — the runtime paints a styled host and its run. */
const host = (page: ReturnType<typeof renderComponent>): TestElement => {
  const found = page.renderer
    .findByType("text")
    .find((element) => element.text === null);
  if (found === undefined) {
    throw new Error("behaviour: the roll painted no text host");
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

/** Change the value and let the effect that starts the roll run. */
const change = async (
  page: ReturnType<typeof renderComponent>,
  node: React.ReactNode,
): Promise<void> => {
  page.rerender(node);
  await after(0);
  settle(page);
};

/** How far the value sits below the top of its clip. */
const offsetOf = (
  page: ReturnType<typeof renderComponent>,
  id: string,
): number => {
  const box = page.renderer.getElementBounds(byTestId(page, id).id);
  const value = page.renderer.getElementBounds(host(page).id);
  if (box === null || value === null) {
    throw new Error("behaviour: the roll painted no box");
  }
  return value.y - box.y;
};

describe("RollingText", () => {
  it("clips the value to one line of its role", () => {
    const page = renderComponent(<RollingText testId="roll" text="42" />);
    try {
      const box = byTestId(page, "roll");
      expect(box.style.overflow).toBe("hidden");
      expect(box.style.height).toBe(lineHeight);
      expect(page.renderer.getA11yTree).toBeTypeOf("function");
      expect(page.renderer.getAllText()).toEqual(["42"]);
    } finally {
      page.unmount();
    }
  });

  it("keeps the outgoing value for the exit half, then paints the new one", async () => {
    const page = renderComponent(<RollingText testId="roll" text="first" />);
    try {
      page.renderer.clockPause();
      await change(page, <RollingText testId="roll" text="second" />);

      expect(painted(page)).toBe("first");
      await waitFor(() => expect(painted(page)).toBe("second"));
    } finally {
      page.unmount();
    }
  });

  it("travels the outgoing value out of the clip before the swap", async () => {
    const page = renderComponent(<RollingText testId="roll" text="first" />);
    try {
      page.renderer.clockPause();
      await change(page, <RollingText testId="roll" text="second" />);

      expect(host(page).customProps?.motion).toMatchObject({
        animate: { opacity: 0, top: -lineHeight },
      });
    } finally {
      page.unmount();
    }
  });

  it("starts the incoming value beyond the far edge and rises it home", async () => {
    const page = renderComponent(<RollingText testId="roll" text="first" />);
    try {
      page.renderer.clockPause();
      await change(page, <RollingText testId="roll" text="second" />);
      await waitFor(() => expect(painted(page)).toBe("second"));

      expect(host(page).customProps?.motion).toMatchObject({
        initial: { opacity: 0, top: lineHeight },
      });
      expect(offsetOf(page, "roll")).toBeCloseTo(lineHeight, 1);

      page.renderer.clockFastForward(400);
      settle(page);
      expect(offsetOf(page, "roll")).toBeCloseTo(0, 1);
    } finally {
      page.unmount();
    }
  });

  it("reverses the travel for a downward roll", async () => {
    const page = renderComponent(
      <RollingText testId="roll" text="first" direction="down" />,
    );
    try {
      page.renderer.clockPause();
      await change(
        page,
        <RollingText testId="roll" text="second" direction="down" />,
      );

      expect(host(page).customProps?.motion).toMatchObject({
        animate: { top: lineHeight },
      });
    } finally {
      page.unmount();
    }
  });

  it("paints the new value at once under the reduced preference", async () => {
    const page = renderComponent(
      <MotionProvider preference="reduced">
        <RollingText testId="roll" text="first" />
      </MotionProvider>,
    );
    try {
      page.renderer.clockPause();
      await change(
        page,
        <MotionProvider preference="reduced">
          <RollingText testId="roll" text="second" />
        </MotionProvider>,
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
    const page = renderComponent(<RollingText testId="roll" text="first" />);
    try {
      await change(page, <RollingText testId="roll" text="second" />);
      await after(20);
      await change(page, <RollingText testId="roll" text="third" />);

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
