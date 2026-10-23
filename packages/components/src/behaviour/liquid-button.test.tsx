/**
 * LiquidButton in the real GPUix renderer.
 *
 * The bugs these guard: a flood that never appears on hover; a fill that is born
 * across the control instead of growing in from the pointer's edge; a right-edge
 * entry that grows the wrong way; a drain that empties toward the edge the
 * pointer came in by; a layer that outlives its drain; a reduced-motion or
 * disabled reader who still gets the wash; and a wash painted in the action's own
 * fill, where it would vanish.
 *
 * The motion clock is paused for the frame readings, so the layer's box is the
 * declared fraction rather than wherever real time had got. Its removal is a real
 * timer, so that half polls.
 */

import { describe, expect, it, vi } from "vitest";
import { actionOnColor } from "../internal/button.js";
import {
  hoverCentreOf,
  requireBounds,
  settle,
  waitFor,
} from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";
import { alpha, darkTheme } from "../internal/theme.js";
import { LiquidButton, type LiquidButtonProps } from "../liquid-button.js";
import { liquidOpacity } from "../liquid-button/logic.js";
import { MotionProvider } from "../motion.js";

/** A wide primary action, so a fraction of its width is visible. */
const width = 240;

const render = (props: Partial<LiquidButtonProps> = {}) => {
  const onClick = vi.fn();
  const page = renderComponent(
    <LiquidButton
      testId="action"
      variant="primary"
      style={{ width }}
      onClick={onClick}
      {...props}
    >
      Save
    </LiquidButton>,
  );
  settle(page);
  return { page, onClick };
};

/**
 * One mounted action whose preference the case can change.
 *
 * The provider's `preference` prop is what moves; the button below it keeps its
 * state, so a flip is the reader's setting changing rather than a remount.
 */
const Hoverable = ({ reduced }: { readonly reduced: boolean }) => (
  <MotionProvider preference={reduced ? "reduced" : "animated"}>
    <LiquidButton testId="action" style={{ width }}>
      Save
    </LiquidButton>
  </MotionProvider>
);

/**
 * One mounted action whose `disabled` prop the case can change.
 *
 * The button keeps its identity across the rerender, so the flood it is wearing
 * is the one this case has to test — a fresh tree would have no wash to drop.
 */
const Disableable = ({ disabled }: { readonly disabled: boolean }) => (
  <LiquidButton testId="action" style={{ width }} disabled={disabled}>
    Save
  </LiquidButton>
);

/** The painted flood layer, or undefined before one is mounted. */
const flood = (page: ReturnType<typeof renderComponent>) =>
  page.renderer
    .findByType("div")
    .find((element) => element.testId === "liquid");

/** The flood's painted box; a missing layer is a broken suite. */
const floodBox = (page: ReturnType<typeof renderComponent>) => {
  const element = flood(page);
  if (element === undefined) {
    throw new Error("behaviour: no liquid layer is painted");
  }
  const box = page.renderer.getElementBounds(element.id);
  if (box === null) {
    throw new Error("behaviour: the liquid layer was not laid out");
  }
  return box;
};

/** Move the pointer to a fraction of the action's width, then settle the frame. */
const moveTo = (page: ReturnType<typeof renderComponent>, across: number) => {
  const box = requireBounds(page, "action");
  page.renderer.nativeSimulateMouseMove(
    box.x + box.width * across,
    box.y + box.height / 2,
  );
  settle(page);
};

/** Advance the motion clock and settle. */
const advance = (page: ReturnType<typeof renderComponent>, ms: number) => {
  page.renderer.clockFastForward(ms);
  settle(page);
};

describe("LiquidButton", () => {
  it("floods across from the left edge when the pointer enters on the left", () => {
    const { page } = render();
    try {
      const box = requireBounds(page, "action");
      page.renderer.clockPause();
      moveTo(page, 0.25);

      advance(page, 100);
      const midway = floodBox(page);
      expect(midway.x).toBeCloseTo(box.x, 0);
      expect(midway.width).toBeGreaterThan(0);
      expect(midway.width).toBeLessThan(width);

      advance(page, 300);
      const across = floodBox(page);
      expect(across.x).toBeCloseTo(box.x, 0);
      expect(across.width).toBeCloseTo(width, 0);
    } finally {
      page.unmount();
    }
  });

  it("floods from the right edge when the pointer enters on the right", () => {
    const { page } = render();
    try {
      const box = requireBounds(page, "action");
      page.renderer.clockPause();
      moveTo(page, 0.9);

      advance(page, 100);
      const midway = floodBox(page);
      expect(midway.x).toBeGreaterThan(box.x);
      expect(midway.width).toBeGreaterThan(0);
      expect(midway.width).toBeLessThan(width);

      advance(page, 300);
      const across = floodBox(page);
      expect(across.x).toBeCloseTo(box.x, 0);
      expect(across.width).toBeCloseTo(width, 0);
    } finally {
      page.unmount();
    }
  });

  it("drains toward the edge the pointer left through", () => {
    const { page } = render();
    try {
      const box = requireBounds(page, "action");
      page.renderer.clockPause();
      moveTo(page, 0.25);
      advance(page, 400);
      expect(floodBox(page).width).toBeCloseTo(width, 0);

      // A move inside a filled control keeps the flood; only leaving ends it.
      moveTo(page, 0.85);
      expect(floodBox(page).width).toBeCloseTo(width, 0);

      // Leave through the right edge: the fill's left side runs right.
      page.renderer.nativeSimulateMouseExit(box.x + box.width + 20, box.y + 4);
      settle(page);
      advance(page, 100);

      const draining = floodBox(page);
      expect(draining.x).toBeGreaterThan(box.x);
      expect(draining.width).toBeLessThan(width);
    } finally {
      page.unmount();
    }
  });

  it("drains toward the left edge when the pointer leaves that way", () => {
    const { page } = render();
    try {
      const box = requireBounds(page, "action");
      page.renderer.clockPause();
      moveTo(page, 0.75);
      advance(page, 400);
      moveTo(page, 0.15);

      page.renderer.nativeSimulateMouseExit(box.x - 20, box.y + 4);
      settle(page);
      advance(page, 100);

      const draining = floodBox(page);
      expect(draining.x).toBeCloseTo(box.x, 0);
      expect(draining.width).toBeLessThan(width);
    } finally {
      page.unmount();
    }
  });

  it("removes the layer when the drain is over", async () => {
    const { page } = render();
    try {
      page.renderer.clockPause();
      hoverCentreOf(page, "action");
      settle(page);
      page.renderer.nativeSimulateMouseExit(1, 1);
      settle(page);
      expect(flood(page)).toBeDefined();

      await waitFor(() => expect(flood(page)).toBeUndefined());
    } finally {
      page.unmount();
    }
  });

  it("paints no flood under the reduced preference", () => {
    const page = renderComponent(
      <MotionProvider preference="reduced">
        <LiquidButton testId="action" style={{ width }}>
          Save
        </LiquidButton>
      </MotionProvider>,
    );
    settle(page);
    try {
      hoverCentreOf(page, "action");
      settle(page);

      expect(flood(page)).toBeUndefined();
    } finally {
      page.unmount();
    }
  });

  it("drops a flood already crossing when the setting turns on", async () => {
    // A wash is pure journey. The preference is read on every render, so the
    // layer a hovered action is wearing goes with the travel the setting
    // removed instead of staying at its final frame for the rest of the level.
    // The provider's prop changes under one mounted action, so the flip is a
    // re-render rather than a fresh tree.
    const page = renderComponent(<Hoverable reduced={false} />);
    try {
      page.renderer.clockPause();
      hoverCentreOf(page, "action");
      settle(page);
      page.renderer.clockFastForward(400);
      settle(page);
      expect(flood(page)).toBeDefined();

      page.rerender(<Hoverable reduced />);
      settle(page);

      // Well inside the 200 ms window the animated drain would still be running.
      await waitFor(() => expect(flood(page)).toBeUndefined(), 80);
    } finally {
      page.unmount();
    }
  });

  it("drops a flood already crossing when the action is disabled", async () => {
    // A disabled action paints none, and the wash marks a pointer on a control
    // that refuses one. The flood here is already at its final frame and has no
    // drain timer, so only a reader of `disabled` can remove it.
    const page = renderComponent(<Disableable disabled={false} />);
    try {
      page.renderer.clockPause();
      hoverCentreOf(page, "action");
      settle(page);
      page.renderer.clockFastForward(400);
      settle(page);
      expect(flood(page)).toBeDefined();

      page.rerender(<Disableable disabled />);
      settle(page);

      await waitFor(() => expect(flood(page)).toBeUndefined(), 80);
    } finally {
      page.unmount();
    }
  });

  it("paints no flood on a disabled action", () => {
    const { page } = render({ disabled: true });
    try {
      hoverCentreOf(page, "action");
      settle(page);

      expect(flood(page)).toBeUndefined();
    } finally {
      page.unmount();
    }
  });

  it("paints the label's ink, not the action's fill", () => {
    const { page } = render();
    try {
      hoverCentreOf(page, "action");
      settle(page);

      const wash = alpha(actionOnColor(darkTheme, "primary"), liquidOpacity);
      expect(flood(page)?.style.backgroundColor).toBe(wash);
      expect(wash).not.toBe(darkTheme.colors.primary);
    } finally {
      page.unmount();
    }
  });
});
