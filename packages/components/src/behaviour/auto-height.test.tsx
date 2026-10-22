/**
 * AutoHeight in the real GPUix renderer.
 *
 * The bugs these guard: a reveal that mounts at its full height instead of
 * growing from the measurement; a collapse that unmounts before its exit tween
 * runs, or never unmounts at all; a reduced-motion reveal that still needs the
 * clock; and a measured height that is captured once and never refreshed when
 * the content changes.
 *
 * The motion clock is paused before each interaction, so the entry frame is the
 * declared zero rather than however far real time had got; the exit's unmount is
 * a real timer, so that half polls.
 */

import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { boundsOf, settle, waitFor } from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";
import { AutoHeight } from "../auto-height.js";
import { MotionProvider } from "../motion.js";

/** The painted height of the reveal, `-1` when nothing was painted. */
const height = (page: ReturnType<typeof renderComponent>): number =>
  Option.getOrElse(
    Option.map(boundsOf(page, "box"), (box) => box.height),
    () => -1,
  );

/** A reveal over a body of `height` pixels. */
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

/** An opened reveal, settled on the motion clock. */
const opened = (page: ReturnType<typeof renderComponent>): void => {
  page.rerender(<Reveal open />);
  settle(page);
  page.renderer.clockFastForward(400);
  settle(page);
};

describe("AutoHeight", () => {
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
      // The collapse tweens, so the body is still in the tree for a moment.
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

      // The clock never advanced: a duration of zero did the work.
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
});
