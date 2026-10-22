/**
 * RotatingText in the real GPUix renderer.
 *
 * The bugs these guard: a line that never advances; an interval that fires
 * forever for a single phrase; a step that drops the callback; a rotation that
 * stops under the reduced preference even though the phrase is content; and a
 * fade that still runs when the reader asked for less motion.
 */

import { describe, expect, it, vi } from "vitest";
import { a11yNodes } from "../internal/a11y.js";
import { after, waitFor } from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";
import { MotionProvider } from "../motion.js";
import { RotatingText } from "../rotating-text.js";

/** Every painted string, joined: the phrase at the frame just painted. */
const painted = (page: ReturnType<typeof renderComponent>): string =>
  page.renderer.getAllText().join("");

describe("RotatingText", () => {
  it("advances through the phrases on its interval and wraps", async () => {
    const page = renderComponent(
      <RotatingText
        testId="rotating"
        phrases={["Faster", "Safer"]}
        intervalMs={60}
      />,
    );
    try {
      expect(painted(page)).toBe("Faster");
      await waitFor(() => expect(painted(page)).toBe("Safer"));
      await waitFor(() => expect(painted(page)).toBe("Faster"));
    } finally {
      page.unmount();
    }
  });

  it("reports each step and starts where the caller says", async () => {
    const onIndexChange = vi.fn();
    const page = renderComponent(
      <RotatingText
        testId="rotating"
        phrases={["One", "Two", "Three"]}
        intervalMs={60}
        defaultIndex={1}
        onIndexChange={onIndexChange}
      />,
    );
    try {
      expect(painted(page)).toBe("Two");
      await waitFor(() => expect(onIndexChange).toHaveBeenCalledWith(2));
      await waitFor(() => expect(onIndexChange).toHaveBeenCalledWith(0));
    } finally {
      page.unmount();
    }
  });

  it("keeps a single phrase still and schedules no step", async () => {
    const onIndexChange = vi.fn();
    const page = renderComponent(
      <RotatingText
        testId="rotating"
        phrases={["Only"]}
        intervalMs={60}
        onIndexChange={onIndexChange}
      />,
    );
    try {
      await after(150);
      expect(painted(page)).toBe("Only");
      expect(onIndexChange).not.toHaveBeenCalled();
    } finally {
      page.unmount();
    }
  });

  it("rotates under the reduced preference, with no fade", async () => {
    const page = renderComponent(
      <MotionProvider preference="reduced">
        <RotatingText
          testId="rotating"
          phrases={["Faster", "Safer"]}
          intervalMs={60}
        />
      </MotionProvider>,
    );
    try {
      const step = page.renderer.findByTestId("rotating");
      expect(step?.customProps?.motion).toMatchObject({
        transition: { duration: 0 },
      });

      await waitFor(() => expect(painted(page)).toBe("Safer"));
    } finally {
      page.unmount();
    }
  });

  it("names the phrase on screen, and the caller's label when given", () => {
    const page = renderComponent(
      <RotatingText
        testId="rotating"
        phrases={["Faster", "Safer"]}
        label="Why teams pick us"
      />,
    );
    try {
      expect(a11yNodes(page.renderer).map((node) => node.name)).toContain(
        "Why teams pick us",
      );
    } finally {
      page.unmount();
    }
  });
});
