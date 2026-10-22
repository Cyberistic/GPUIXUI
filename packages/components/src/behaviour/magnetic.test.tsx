/**
 * Magnetic in the real GPUix renderer.
 *
 * The bugs these guard: a surface that never feels the pointer because the move
 * lands on a child and does not reach the wrapper; a plate that moves the
 * surface's own box, so the cursor walks out of it; a lean that runs uncapped; a
 * plate that stays where the pointer left it instead of returning to rest; a
 * reduced-motion reader who is still pulled; and handlers the caller passed that
 * the component swallows.
 *
 * The motion clock is paused for the frame readings, so the plate's offset is
 * the declared target rather than wherever real time had got.
 */

import { describe, expect, it, vi } from "vitest";
import { requireBounds, settle } from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";
import { Magnetic, type MagneticProps } from "../magnetic.js";
import { magneticReach } from "../magnetic/logic.js";
import { MotionProvider } from "../motion.js";

/** The surface is 200 × 80, so a quarter of its width is 50 px from the centre. */
const surface = { width: 200, height: 80 };

const render = (props: Partial<MagneticProps> = {}) => {
  const page = renderComponent(
    <Magnetic testId="surface" style={surface} {...props}>
      <div testId="content" style={{ width: 120, height: 40 }}>
        <text>Lean</text>
      </div>
    </Magnetic>,
  );
  settle(page);
  return page;
};

/** Move the pointer to a fraction of the surface's box, then settle the frame. */
const moveTo = (
  page: ReturnType<typeof renderComponent>,
  across: number,
  down: number,
) => {
  const box = requireBounds(page, "surface");
  page.renderer.nativeSimulateMouseMove(
    box.x + box.width * across,
    box.y + box.height * down,
  );
  settle(page);
};

/** Advance past the retarget and read the plate's offset from where it started. */
const pullOf = (
  page: ReturnType<typeof renderComponent>,
  from: { readonly x: number; readonly y: number },
) => {
  page.renderer.clockFastForward(400);
  settle(page);
  const plate = requireBounds(page, "magnetic-plate");
  return { left: plate.x - from.x, top: plate.y - from.y };
};

describe("Magnetic", () => {
  it("leans the content toward the pointer and leaves the box where it was", () => {
    const page = render();
    try {
      const box = requireBounds(page, "surface");
      const plate = requireBounds(page, "magnetic-plate");
      page.renderer.clockPause();

      moveTo(page, 0.75, 0.5);
      const pull = pullOf(page, plate);

      // A quarter of the width from the centre, capped at the house reach.
      expect(pull.left).toBe(magneticReach);
      expect(pull.top).toBe(0);
      // The surface's own box is the fixed thing the pointer is pulling.
      expect(requireBounds(page, "surface")).toEqual(box);
    } finally {
      page.unmount();
    }
  });

  it("leans below the centre on the vertical axis too", () => {
    const page = render();
    try {
      const plate = requireBounds(page, "magnetic-plate");
      page.renderer.clockPause();

      moveTo(page, 0.5, 0.95);
      const pull = pullOf(page, plate);

      expect(pull.left).toBe(0);
      expect(pull.top).toBe(magneticReach);
    } finally {
      page.unmount();
    }
  });

  it("returns the content to rest when the pointer leaves", () => {
    const page = render();
    try {
      const plate = requireBounds(page, "magnetic-plate");
      page.renderer.clockPause();
      moveTo(page, 0.75, 0.5);
      expect(pullOf(page, plate).left).toBe(magneticReach);

      page.renderer.nativeSimulateMouseExit(1, 1);
      settle(page);

      expect(pullOf(page, plate)).toEqual({ left: 0, top: 0 });
    } finally {
      page.unmount();
    }
  });

  it("moves a fraction of a pointer that is still inside the box", () => {
    const page = render();
    try {
      const plate = requireBounds(page, "magnetic-plate");
      page.renderer.clockPause();

      // 20 px right of centre at the house share of 0.35.
      const box = requireBounds(page, "surface");
      page.renderer.nativeSimulateMouseMove(
        box.x + box.width / 2 + 20,
        box.y + box.height / 2,
      );
      settle(page);

      expect(pullOf(page, plate)).toEqual({ left: 7, top: 0 });
    } finally {
      page.unmount();
    }
  });

  it("leans from the box the surface is in now, not the one it first reported", () => {
    // A surface moved by a layout above it (a pane opening, a scroll) keeps the
    // box it last reported: `onLayout` fires on a size change, not a move. The
    // pull is then taken against a centre the surface no longer has, and leans
    // the opposite way from the pointer.
    const Shifted = ({ inset }: { readonly inset: number }) => (
      <div style={{ paddingLeft: inset, paddingTop: inset }}>
        <Magnetic testId="shifted-surface" style={surface}>
          <div testId="shifted-content" style={{ width: 120, height: 40 }}>
            <text>Lean</text>
          </div>
        </Magnetic>
      </div>
    );

    const page = renderComponent(<Shifted inset={0} />);
    settle(page);
    try {
      page.renderer.clockPause();

      page.rerender(<Shifted inset={120} />);
      settle(page);

      const shifted = requireBounds(page, "shifted-surface");
      const plate = requireBounds(page, "magnetic-plate");
      page.renderer.nativeSimulateMouseMove(
        shifted.x + shifted.width * 0.25,
        shifted.y + shifted.height / 2,
      );
      settle(page);

      // A quarter of the width to the left of the centre the surface has now.
      expect(pullOf(page, plate).left).toBe(-magneticReach);
    } finally {
      page.unmount();
    }
  });

  it("paints no lean under the reduced preference", () => {
    const page = renderComponent(
      <MotionProvider preference="reduced">
        <Magnetic testId="surface" style={surface}>
          <text>Lean</text>
        </Magnetic>
      </MotionProvider>,
    );
    settle(page);
    try {
      const plate = requireBounds(page, "magnetic-plate");
      page.renderer.clockPause();

      moveTo(page, 0.75, 0.5);

      expect(pullOf(page, plate)).toEqual({ left: 0, top: 0 });
    } finally {
      page.unmount();
    }
  });

  it("composes the caller's pointer and layout handlers", () => {
    const onMouseMove = vi.fn();
    const onMouseLeave = vi.fn();
    const onLayout = vi.fn();
    const page = render({ onMouseMove, onMouseLeave, onLayout });
    try {
      moveTo(page, 0.5, 0.5);
      page.renderer.nativeSimulateMouseExit(1, 1);
      settle(page);

      expect(onLayout).toHaveBeenCalled();
      expect(onMouseMove).toHaveBeenCalled();
      expect(onMouseLeave).toHaveBeenCalled();
    } finally {
      page.unmount();
    }
  });
});
