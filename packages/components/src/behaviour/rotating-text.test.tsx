/**
 * RotatingText in the real GPUix renderer.
 *
 * The bugs these guard: a line that never advances; an interval that fires
 * forever for a single phrase; a step that drops the callback; a rotation that
 * stops under the reduced preference even though the phrase is content; a fade
 * that still runs when the reader asked for less motion; and a phrase list or a
 * name that arrived from a saved record as something other than text.
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

  // The bug guarded: a page restored from storage carries `null` where it kept
  // no copy, so `phrases` reached the render as a record's shape rather than a
  // list and `phrases.length` threw before a single frame painted.
  it("keeps the frame when a saved phrase list is absent", () => {
    const page = renderComponent(
      <RotatingText
        testId="rotating"
        phrases={null as unknown as ReadonlyArray<string>}
        intervalMs={60}
      />,
    );
    try {
      expect(page.renderer.findByTestId("rotating")).toBeDefined();
      expect(painted(page)).toBe("");
    } finally {
      page.unmount();
    }
  });

  // The bug guarded: an i18n row that lost its key is `null` inside an
  // otherwise good list, and the rotation painted that hole as a blank frame
  // with no name instead of stepping over it.
  it("steps over an entry a stored record left empty", async () => {
    const onIndexChange = vi.fn();
    const page = renderComponent(
      <RotatingText
        testId="rotating"
        phrases={["Faster", null as unknown as string, "Safer"]}
        intervalMs={60}
        onIndexChange={onIndexChange}
      />,
    );
    try {
      expect(painted(page)).toBe("Faster");
      await waitFor(() => expect(onIndexChange).toHaveBeenCalledWith(1));
      // The callback fires before the frame that paints the new phrase, so a
      // fast machine passed this on the same tick and a loaded one read the
      // previous phrase. Waiting for the paint still fails if the blank entry is
      // the one that reaches the surface.
      await waitFor(() => expect(painted(page)).toBe("Safer"));
    } finally {
      page.unmount();
    }
  });

  // The bug guarded: a label restored blank painted a text node whose name was
  // a run of spaces, so assistive technology met an unnamed phrase.
  it("names the phrase when the stored label arrived blank", () => {
    const page = renderComponent(
      <RotatingText
        testId="rotating"
        phrases={["Faster", "Safer"]}
        label="  "
      />,
    );
    try {
      expect(a11yNodes(page.renderer).map((node) => node.name)).toContain(
        "Faster",
      );
    } finally {
      page.unmount();
    }
  });
});
