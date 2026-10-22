/**
 * ImageZoom in the real GPUix renderer.
 *
 * The bugs these guard: a picture that never grows because the pointer lands on
 * the image instead of the frame; a zoom that jumps instead of travelling; a pan
 * that drifts the spot the reader points at, or slides the picture off its frame
 * and shows the page behind it; a frame that re-lays out as the picture grows; a
 * reduced-motion reader losing the magnification instead of its journey; and a
 * picture with no accessible name.
 *
 * The motion clock is paused for the frame readings, so a box is the target the
 * runtime was handed rather than wherever real time had got.
 */

import { describe, expect, it, vi } from "vitest";
import { ImageZoom, type ImageZoomProps } from "../image-zoom.js";
import { nodesWithRole } from "../internal/a11y.js";
import { requireBounds, settle } from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";
import { MotionProvider } from "../motion.js";

/** A 200 × 120 frame: at 1.6× the picture is 320 × 192, so 120 px and 72 px pan. */
const frame = { width: 200, height: 120 };

const render = (props: Partial<ImageZoomProps> = {}) => {
  const page = renderComponent(
    <ImageZoom
      testId="frame"
      src="/photos/harbour.png"
      alt="The harbour at dusk"
      width={frame.width}
      height={frame.height}
      {...props}
    />,
  );
  settle(page);
  return page;
};

/** The picture's box relative to the frame, and the frame's own box. */
const painted = (page: ReturnType<typeof renderComponent>) => {
  const outer = requireBounds(page, "frame");
  const picture = requireBounds(page, "image-zoom-image");
  return {
    frame: outer,
    picture: {
      left: picture.x - outer.x,
      top: picture.y - outer.y,
      width: picture.width,
      height: picture.height,
    },
  };
};

/** Point at a fraction of the frame, then settle the frame the runtime paints. */
const pointAt = (
  page: ReturnType<typeof renderComponent>,
  across: number,
  down: number,
) => {
  const outer = requireBounds(page, "frame");
  page.renderer.nativeSimulateMouseMove(
    outer.x + outer.width * across,
    outer.y + outer.height * down,
  );
  settle(page);
};

/** Advance the paused motion clock and settle the frame it delivers. */
const advance = (page: ReturnType<typeof renderComponent>, ms: number) => {
  page.renderer.clockFastForward(ms);
  settle(page);
};

const rest = { left: 0, top: 0, width: 200, height: 120 };

describe("ImageZoom", () => {
  it("covers its frame exactly at rest", () => {
    const page = render();
    try {
      expect(painted(page).picture).toEqual(rest);
    } finally {
      page.unmount();
    }
  });

  it("magnifies under the pointer and keeps the pointed spot in place", () => {
    const page = render();
    try {
      const outer = requireBounds(page, "frame");
      page.renderer.clockPause();

      pointAt(page, 0.75, 0.5);
      advance(page, 400);

      // Three quarters across a 320 px picture is 240 px in, so the picture
      // starts 90 px to the left; half way down leaves 36 px above the frame.
      expect(painted(page).picture).toEqual({
        left: -90,
        top: -36,
        width: 320,
        height: 192,
      });
      // The frame is the fixed thing the picture moves inside.
      expect(requireBounds(page, "frame")).toEqual(outer);
    } finally {
      page.unmount();
    }
  });

  it("travels to the new box instead of jumping to it", () => {
    const page = render();
    try {
      page.renderer.clockPause();

      pointAt(page, 0.5, 0.5);
      expect(painted(page).picture).toEqual(rest);

      advance(page, 80);
      const moving = painted(page).picture;
      expect(moving.width).toBeGreaterThan(rest.width);
      expect(moving.width).toBeLessThan(320);
      expect(moving.left).toBeLessThan(0);

      advance(page, 400);
      expect(painted(page).picture).toEqual({
        left: -60,
        top: -36,
        width: 320,
        height: 192,
      });
    } finally {
      page.unmount();
    }
  });

  it("pins the edge it points at, so the picture still covers the frame", () => {
    const page = render();
    try {
      page.renderer.clockPause();

      pointAt(page, 0.001, 0.001);
      advance(page, 400);
      const near = painted(page).picture;
      expect(near.left).toBeGreaterThanOrEqual(-0.2);
      expect(near.top).toBeGreaterThanOrEqual(-0.2);

      pointAt(page, 0.999, 0.999);
      advance(page, 400);
      const far = painted(page).picture;
      expect(far.left).toBeLessThanOrEqual(-119.5);
      expect(far.top).toBeLessThanOrEqual(-71.5);
      // The far edge of the picture is still at or past the frame's, so the pan
      // never pulls the picture away and shows the page behind it.
      expect(far.left + far.width).toBeGreaterThanOrEqual(frame.width);
      expect(far.top + far.height).toBeGreaterThanOrEqual(frame.height);
    } finally {
      page.unmount();
    }
  });

  it("returns the picture to its frame when the pointer leaves", () => {
    const page = render();
    try {
      page.renderer.clockPause();
      pointAt(page, 0.75, 0.5);
      advance(page, 400);
      expect(painted(page).picture.width).toBe(320);

      page.renderer.nativeSimulateMouseExit(1, 1);
      settle(page);
      advance(page, 400);

      expect(painted(page).picture).toEqual(rest);
    } finally {
      page.unmount();
    }
  });

  it("keeps the magnification but drops the journey under the reduced preference", () => {
    const page = renderComponent(
      <MotionProvider preference="reduced">
        <ImageZoom
          testId="frame"
          src="/photos/harbour.png"
          alt="The harbour at dusk"
          width={frame.width}
          height={frame.height}
        />
      </MotionProvider>,
    );
    try {
      settle(page);
      page.renderer.clockPause();

      pointAt(page, 0.5, 0.5);

      // No clock advanced: the resting frame is already the magnified box.
      expect(painted(page).picture).toEqual({
        left: -60,
        top: -36,
        width: 320,
        height: 192,
      });
    } finally {
      page.unmount();
    }
  });

  it("stays at rest when the magnification is one", () => {
    const page = render({ scale: 1 });
    try {
      page.renderer.clockPause();

      pointAt(page, 0.75, 0.5);
      advance(page, 400);

      expect(painted(page).picture).toEqual(rest);
    } finally {
      page.unmount();
    }
  });

  it("names the picture for assistive technology", () => {
    const page = render();
    try {
      const images = nodesWithRole(page.renderer, "image").map(
        (node) => node.name,
      );

      expect(images).toEqual(["The harbour at dusk"]);
    } finally {
      page.unmount();
    }
  });

  it("composes the pointer and layout handlers a caller passes", () => {
    const onMouseMove = vi.fn();
    const onMouseLeave = vi.fn();
    const onLayout = vi.fn();
    const page = render({ onMouseMove, onMouseLeave, onLayout });
    try {
      expect(onLayout).toHaveBeenCalled();

      pointAt(page, 0.5, 0.5);
      expect(onMouseMove).toHaveBeenCalled();

      page.renderer.nativeSimulateMouseExit(1, 1);
      settle(page);
      expect(onMouseLeave).toHaveBeenCalled();
    } finally {
      page.unmount();
    }
  });
});
