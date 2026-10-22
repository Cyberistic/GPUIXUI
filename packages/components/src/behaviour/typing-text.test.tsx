/**
 * TypingText in the real GPUix renderer.
 *
 * The bugs these guard: a string that paints whole instead of a character at a
 * time; a reveal that restarts because the parent re-rendered; a changed string
 * that keeps the previous count and flashes the old progress; a reveal that
 * still waits under the reduced preference; a completion callback that runs
 * more than once; and a caret that is never dropped once the text is complete.
 *
 * The reveal is real time, so each claim polls (`waitFor`) rather than sleeping
 * a fixed span; the "not yet" half is a synchronous read before any timer runs.
 */

import { describe, expect, it, vi } from "vitest";
import { a11yNodes } from "../internal/a11y.js";
import { waitFor } from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";
import { MotionProvider } from "../motion.js";
import { TypingText } from "../typing-text.js";

/** Every painted string, joined: the reveal at the frame just painted. */
const painted = (page: ReturnType<typeof renderComponent>): string =>
  page.renderer.getAllText().join("");

/** How many children the root host paints: the text, plus a caret while typing. */
const parts = (page: ReturnType<typeof renderComponent>): number =>
  page.renderer.findByTestId("typing")?.children.length ?? 0;

describe("TypingText", () => {
  it("types a character at a time, and names the whole string from the first frame", async () => {
    const page = renderComponent(
      <TypingText testId="typing" text="Ship it" speed={30} />,
    );
    try {
      // The first character arrives on a timer, so nothing is painted yet.
      expect(painted(page)).not.toBe("Ship it");
      // The accessible name is the whole string immediately: assistive tech is
      // never fed a partial word.
      expect(a11yNodes(page.renderer).map((node) => node.name)).toContain(
        "Ship it",
      );

      await waitFor(() => expect(painted(page)).toBe("Ship it"));
    } finally {
      page.unmount();
    }
  });

  it("does not replay the reveal when the parent re-renders with the same string", async () => {
    const page = renderComponent(<TypingText text="Stay" speed={20} />);
    try {
      await waitFor(() => expect(painted(page)).toBe("Stay"));

      page.rerender(<TypingText text="Stay" speed={20} />);
      expect(painted(page)).toBe("Stay");
    } finally {
      page.unmount();
    }
  });

  it("retypes from the first character when the string changes", async () => {
    const complete = vi.fn();
    const page = renderComponent(
      <TypingText text="First" speed={20} onComplete={complete} />,
    );
    try {
      await waitFor(() => expect(painted(page)).toBe("First"));

      page.rerender(
        <TypingText text="Second" speed={20} onComplete={complete} />,
      );
      expect(painted(page)).toBe("");
      await waitFor(() => expect(painted(page)).toBe("Second"));
      expect(complete).toHaveBeenCalledTimes(2);
    } finally {
      page.unmount();
    }
  });

  it("paints the whole string on the first frame under the reduced preference", async () => {
    const complete = vi.fn();
    const page = renderComponent(
      <MotionProvider preference="reduced">
        <TypingText text="Ship it" speed={500} onComplete={complete} />
      </MotionProvider>,
    );
    try {
      expect(painted(page)).toBe("Ship it");
      await waitFor(() => expect(complete).toHaveBeenCalledTimes(1));
      expect(painted(page)).toBe("Ship it");
    } finally {
      page.unmount();
    }
  });

  it("paints the whole string at once at a zero speed, and completes once", async () => {
    const complete = vi.fn();
    const page = renderComponent(
      <TypingText text="Instant" speed={0} onComplete={complete} />,
    );
    try {
      expect(painted(page)).toBe("Instant");
      await waitFor(() => expect(complete).toHaveBeenCalledTimes(1));
    } finally {
      page.unmount();
    }
  });

  it("paints a caret while it types and drops it once the text is complete", async () => {
    const page = renderComponent(
      <TypingText testId="typing" text="Hi" speed={30} caret />,
    );
    try {
      expect(parts(page)).toBe(2);

      await waitFor(() => expect(painted(page)).toBe("Hi"));
      expect(parts(page)).toBe(1);
    } finally {
      page.unmount();
    }
  });
});
