import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { boundsOf, settle, waitFor } from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";
import { AutoHeight } from "../auto-height.js";
import { MotionProvider } from "../motion.js";

const height = (page: ReturnType<typeof renderComponent>): number =>
  Option.getOrElse(
    Option.map(boundsOf(page, "box"), (box) => box.height),
    () => -1,
  );

const motionOf = (
  page: ReturnType<typeof renderComponent>,
  testId: string,
): unknown => page.renderer.findByTestId(testId)?.customProps?.motion;

const Reveal = ({
  open,
  body = 80,
}: {
  readonly open: boolean;
  readonly body?: number;
}) => (
  <AutoHeight open={open} testId="box">
    <div testId="body" style={{ height: body }} />
  </AutoHeight>
);

const opened = (page: ReturnType<typeof renderComponent>): void => {
  page.rerender(<Reveal open />);
  settle(page);
  page.renderer.clockFastForward(400);
  settle(page);
};

describe("AutoHeight", () => {
  it("hands the runtime the measured height on the frame it opens", () => {
    const page = renderComponent(<Reveal open={false} />);
    try {
      page.renderer.clockPause();
      page.rerender(<Reveal open />);

      expect(motionOf(page, "box")).toMatchObject({
        initial: { height: 0 },
        animate: { height: 80 },
      });
    } finally {
      page.unmount();
    }
  });

  it("fades the content in after the box starts to grow, and out with it", () => {
    const page = renderComponent(<Reveal open={false} />);
    try {
      page.renderer.clockPause();
      page.rerender(<Reveal open />);
      expect(motionOf(page, "box-measured")).toMatchObject({
        animate: { opacity: 1 },
        transition: { duration: 0.2, delay: 0.02, ease: "easeOut" },
      });

      page.rerender(<Reveal open={false} />);
      settle(page);
      expect(motionOf(page, "box-measured")).toMatchObject({
        animate: { opacity: 0 },
        transition: { duration: 0.2, ease: "easeIn" },
      });
    } finally {
      page.unmount();
    }
  });

  it("grows from nothing to the height its content reports", async () => {
    const page = renderComponent(<Reveal open={false} />);
    try {
      expect(height(page)).toBe(-1);

      page.renderer.clockPause();
      page.rerender(<Reveal open />);
      settle(page);
      expect(height(page)).toBe(0);

      page.renderer.clockFastForward(400);
      settle(page);
      await waitFor(() => expect(height(page)).toBe(80));
    } finally {
      page.unmount();
    }
  });

  it("stays painted through the collapse, then unmounts the subtree", async () => {
    const page = renderComponent(<Reveal open={false} />);
    try {
      page.renderer.clockPause();
      opened(page);
      await waitFor(() => expect(height(page)).toBe(80));

      page.rerender(<Reveal open={false} />);
      settle(page);

      expect(page.renderer.findByTestId("box")).toBeDefined();
      await waitFor(() =>
        expect(page.renderer.findByTestId("box")).toBeUndefined(),
      );
    } finally {
      page.unmount();
    }
  });

  it("paints the measured height on the first frame under the reduced preference", () => {
    const page = renderComponent(
      <MotionProvider preference="reduced">
        <Reveal open={false} />
      </MotionProvider>,
    );
    try {
      page.renderer.clockPause();
      page.rerender(
        <MotionProvider preference="reduced">
          <Reveal open />
        </MotionProvider>,
      );
      settle(page);
      settle(page);

      expect(height(page)).toBe(80);
    } finally {
      page.unmount();
    }
  });

  it("re-measures when the content grows while it is open", async () => {
    const page = renderComponent(<Reveal open={false} />);
    try {
      page.renderer.clockPause();
      opened(page);
      await waitFor(() => expect(height(page)).toBe(80));

      page.rerender(<Reveal open body={160} />);
      settle(page);
      page.renderer.clockFastForward(400);
      settle(page);

      await waitFor(() => expect(height(page)).toBe(160));
    } finally {
      page.unmount();
    }
  });

  it("starts a reopened reveal from nothing, not the height it closed with", async () => {
    const heights: number[] = [];
    const Box = ({
      open,
      body,
    }: {
      readonly open: boolean;
      readonly body: number;
    }) => (
      <AutoHeight
        open={open}
        testId="box"
        style={(state) => {
          heights.push(state.height);
          return {};
        }}
      >
        <div testId="body" style={{ height: body }} />
      </AutoHeight>
    );
    const page = renderComponent(<Box open={false} body={80} />);
    try {
      page.renderer.clockPause();
      page.rerender(<Box open body={80} />);
      settle(page);
      page.renderer.clockFastForward(400);
      settle(page);
      await waitFor(() => expect(height(page)).toBe(80));

      page.rerender(<Box open={false} body={80} />);
      settle(page);
      await waitFor(() =>
        expect(page.renderer.findByTestId("box")).toBeUndefined(),
      );

      heights.length = 0;
      page.rerender(<Box open body={160} />);
      settle(page);
      expect(heights[0]).toBe(0);

      page.renderer.clockFastForward(400);
      settle(page);
      await waitFor(() => expect(height(page)).toBe(160));
    } finally {
      page.renderer.clockResume();
      page.unmount();
    }
  });
});

describe("the press a close uncovers", () => {
  const guard = (page: ReturnType<typeof renderComponent>) =>
    page.renderer.findByTestId("box")?.style.pointerEvents;

  it("paints the no-press guard while the section collapses", async () => {
    const page = renderComponent(<Reveal open={false} />);
    try {
      page.renderer.clockPause();
      opened(page);
      await waitFor(() => expect(height(page)).toBe(80));

      expect(guard(page)).toBeUndefined();

      page.rerender(<Reveal open={false} />);
      settle(page);

      expect(page.renderer.findByTestId("box")).toBeDefined();
      expect(guard(page)).toBe("none");
    } finally {
      page.unmount();
    }
  });
});
