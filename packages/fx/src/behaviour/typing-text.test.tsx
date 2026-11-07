import { describe, expect, it, vi } from "vitest";
import {
  a11yNodes,
  waitFor,
  renderComponent,
} from "@gpuixui/components/authoring/testing";
import { darkTheme, textStyle } from "@gpuixui/components/authoring";
import { MotionProvider } from "@gpuixui/components/motion";
import { TypingText } from "../typing-text.js";

const painted = (page: ReturnType<typeof renderComponent>): string =>
  page.renderer.getAllText().join("");

const parts = (page: ReturnType<typeof renderComponent>): number =>
  page.renderer.findByTestId("typing")?.children.length ?? 0;

describe("TypingText", () => {
  it("types a character at a time, and names the whole string from the first frame", async () => {
    const page = renderComponent(
      <TypingText testId="typing" text="Ship it" speed={30} />,
    );
    try {
      expect(painted(page)).not.toBe("Ship it");

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

      await waitFor(() => expect(complete).toHaveBeenCalledTimes(2));
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

  it("paints a caret for a stored role the type scale does not carry", () => {
    const page = renderComponent(
      <TypingText
        testId="typing"
        text="Hi"
        speed={30}
        caret
        // @ts-expect-error — the value a saved role actually carries
        role="banner"
      />,
    );
    try {
      expect(a11yNodes(page.renderer).map((node) => node.name)).toContain("Hi");
      const caret = page.renderer.getElement(
        page.renderer.findByTestId("typing")?.children[1] ?? -1,
      );
      expect(caret?.style.height).toBe(textStyle(darkTheme, "body").lineHeight);
      expect(caret?.style.width).toBe(2);
    } finally {
      page.unmount();
    }
  });

  it("paints nothing, and throws nothing, for a stored string that was not text", () => {
    const page = renderComponent(
      <TypingText testId="typing" text={null as unknown as string} speed={0} />,
    );
    try {
      expect(page.renderer.findByTestId("typing")).toBeDefined();
      expect(painted(page)).toBe("");
      expect(parts(page)).toBe(1);
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
