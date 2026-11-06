import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";
import { requireBounds, settle, waitFor } from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";
import { MotionProvider } from "../motion.js";
import { Reveal } from "../reveal.js";

const framed = (node: ReactNode): ReactNode => (
  <div testId="frame" style={{ display: "flex", flexDirection: "column" }}>
    {node}
  </div>
);

const offsetOf = (
  page: ReturnType<typeof renderComponent>,
  axis: "x" | "y",
): number =>
  requireBounds(page, "reveal")[axis] - requireBounds(page, "frame")[axis];

describe("Reveal", () => {
  it("starts the content below and rises it home", () => {
    const page = renderComponent(
      framed(<Reveal testId="reveal" distance={12} />),
    );
    try {
      page.renderer.clockPause();
      page.rerender(framed(<Reveal testId="reveal" distance={12} />));
      settle(page);
      expect(offsetOf(page, "y")).toBeCloseTo(12, 1);

      page.renderer.clockFastForward(400);
      settle(page);
      expect(offsetOf(page, "y")).toBeCloseTo(0, 1);
    } finally {
      page.unmount();
    }
  });

  it("arrives from the right edge on the horizontal axis", () => {
    const page = renderComponent(
      framed(<Reveal testId="reveal" from="right" distance={10} />),
    );
    try {
      page.renderer.clockPause();
      page.rerender(
        framed(<Reveal testId="reveal" from="right" distance={10} />),
      );
      settle(page);
      expect(offsetOf(page, "x")).toBeCloseTo(10, 1);
      expect(offsetOf(page, "y")).toBeCloseTo(0, 1);
    } finally {
      page.unmount();
    }
  });

  it("drops from above", () => {
    const page = renderComponent(
      framed(<Reveal testId="reveal" from="above" distance={10} />),
    );
    try {
      page.renderer.clockPause();
      page.rerender(
        framed(<Reveal testId="reveal" from="above" distance={10} />),
      );
      settle(page);
      expect(offsetOf(page, "y")).toBeCloseTo(-10, 1);
    } finally {
      page.unmount();
    }
  });

  it("fades without travelling for none", () => {
    const page = renderComponent(
      framed(<Reveal testId="reveal" from="none" />),
    );
    try {
      page.renderer.clockPause();
      page.rerender(framed(<Reveal testId="reveal" from="none" />));
      settle(page);
      expect(offsetOf(page, "x")).toBeCloseTo(0, 1);
      expect(offsetOf(page, "y")).toBeCloseTo(0, 1);
    } finally {
      page.unmount();
    }
  });

  it("paints at rest at once under the reduced preference", () => {
    const page = renderComponent(
      <MotionProvider preference="reduced">
        {framed(<Reveal testId="reveal" distance={12} />)}
      </MotionProvider>,
    );
    try {
      page.renderer.clockPause();
      page.rerender(
        <MotionProvider preference="reduced">
          {framed(<Reveal testId="reveal" distance={12} />)}
        </MotionProvider>,
      );
      settle(page);

      expect(offsetOf(page, "y")).toBeCloseTo(0, 1);
      const motion = page.renderer.findByTestId("reveal")?.customProps?.motion;
      expect(motion).toMatchObject({ transition: { duration: 0 } });
    } finally {
      page.unmount();
    }
  });

  it("drops the stagger with the journey under the reduced preference", () => {
    const shown = (
      <MotionProvider preference="reduced">
        {framed(<Reveal testId="reveal" distance={12} delayMs={300} />)}
      </MotionProvider>
    );
    const page = renderComponent(shown);
    try {
      page.renderer.clockPause();
      page.rerender(shown);
      settle(page);

      expect(offsetOf(page, "y")).toBeCloseTo(0, 1);
      const motion = page.renderer.findByTestId("reveal")?.customProps?.motion;
      expect(motion).toMatchObject({ transition: { duration: 0 } });
      expect(motion).not.toHaveProperty("transition.delay");
    } finally {
      page.unmount();
    }
  });

  it("paints nothing while closed, and unmounts after the exit", async () => {
    const page = renderComponent(
      framed(<Reveal testId="reveal" open={false} />),
    );
    try {
      expect(page.renderer.findByTestId("reveal")).toBeUndefined();

      page.rerender(framed(<Reveal testId="reveal" open />));
      settle(page);
      expect(page.renderer.findByTestId("reveal")).toBeDefined();

      page.rerender(framed(<Reveal testId="reveal" open={false} />));
      settle(page);

      expect(page.renderer.findByTestId("reveal")).toBeDefined();
      await waitFor(() =>
        expect(page.renderer.findByTestId("reveal")).toBeUndefined(),
      );
    } finally {
      page.unmount();
    }
  });

  it("delays the entry by the milliseconds it was given, in seconds", () => {
    const page = renderComponent(
      framed(<Reveal testId="reveal" delayMs={50} />),
    );
    try {
      const motion = page.renderer.findByTestId("reveal")?.customProps?.motion;
      expect(motion).toMatchObject({ transition: { delay: 0.05 } });
    } finally {
      page.unmount();
    }
  });
});
