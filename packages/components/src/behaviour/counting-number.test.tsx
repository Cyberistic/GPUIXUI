import { describe, expect, it } from "vitest";
import { a11yNodes } from "../internal/a11y.js";
import { waitFor } from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";
import { CountingNumber } from "../counting-number.js";
import { MotionProvider } from "../motion.js";

const painted = (page: ReturnType<typeof renderComponent>): string =>
  page.renderer.getAllText().join("");

describe("CountingNumber", () => {
  it("counts from the start value to the target on mount", async () => {
    const page = renderComponent(
      <CountingNumber testId="count" value={100} from={0} durationMs={120} />,
    );
    try {
      expect(painted(page)).toBe("0");
      await waitFor(() => expect(painted(page)).toBe("100"));
    } finally {
      page.unmount();
    }
  });

  it("paints the target at once when the caller gives no start value", () => {
    const page = renderComponent(<CountingNumber testId="count" value={100} />);
    try {
      expect(painted(page)).toBe("100");
    } finally {
      page.unmount();
    }
  });

  it("passes through an intermediate value instead of jumping", async () => {
    const page = renderComponent(
      <CountingNumber testId="count" value={100} from={0} durationMs={400} />,
    );
    try {
      await waitFor(() => {
        const text = painted(page);
        const value = Number(text);
        expect(value).toBeGreaterThan(0);
        expect(value).toBeLessThan(100);
      });
      await waitFor(() => expect(painted(page)).toBe("100"));
    } finally {
      page.unmount();
    }
  });

  it("retargets from the number on screen when the value changes", async () => {
    const page = renderComponent(
      <CountingNumber testId="count" value={100} from={0} durationMs={120} />,
    );
    try {
      await waitFor(() => expect(painted(page)).toBe("100"));

      page.rerender(
        <CountingNumber testId="count" value={200} durationMs={120} />,
      );
      expect(painted(page)).not.toBe("200");
      await waitFor(() => expect(painted(page)).toBe("200"));
    } finally {
      page.unmount();
    }
  });

  it("counts again after the number has rested, instead of jumping", async () => {
    const page = renderComponent(
      <CountingNumber testId="count" value={100} from={0} durationMs={120} />,
    );
    try {
      await waitFor(() => expect(painted(page)).toBe("100"));
      await new Promise((resolve) => setTimeout(resolve, 900));
      page.rerender(
        <CountingNumber testId="count" value={200} durationMs={400} />,
      );
      await waitFor(() => {
        const value = Number(painted(page));
        expect(value).toBeGreaterThan(100);
        expect(value).toBeLessThan(200);
      });
      await waitFor(() => expect(painted(page)).toBe("200"));
    } finally {
      page.unmount();
    }
  });

  it("paints the target on the first frame under the reduced preference", () => {
    const page = renderComponent(
      <MotionProvider preference="reduced">
        <CountingNumber testId="count" value={100} from={0} />
      </MotionProvider>,
    );
    try {
      expect(painted(page)).toBe("100");
    } finally {
      page.unmount();
    }
  });

  it("names the target, not the frame, and formats the painted text", async () => {
    const page = renderComponent(
      <CountingNumber
        testId="count"
        value={42}
        from={0}
        durationMs={120}
        format={(value) => `${Math.round(value)}%`}
      />,
    );
    try {
      expect(a11yNodes(page.renderer).map((node) => node.name)).toContain(
        "42%",
      );
      expect(painted(page)).toBe("0%");
      await waitFor(() => expect(painted(page)).toBe("42%"));
    } finally {
      page.unmount();
    }
  });
});
