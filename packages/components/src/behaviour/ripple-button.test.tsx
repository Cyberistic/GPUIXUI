/**
 * RippleButton in the real GPUix renderer.
 *
 * The bugs these guard: a disc that starts at the window origin rather than the
 * press; a tween that grows the box away from the point instead of around it; a
 * disc too small for an edge press; a layer that stays in the tree after its
 * tween; a keyboard activation that ripples from a corner; a reduced-motion
 * reader who still gets a journey; a disabled action that still paints feedback;
 * a disc that blocks the press it marks; and a wash painted in the action's own
 * fill, where it would disappear.
 *
 * The motion clock is paused for the frame readings, so the disc's radius is the
 * declared fraction rather than wherever real time had got. Its removal is a
 * real timer, so that half polls.
 */

import { describe, expect, it, vi } from "vitest";
import { actionOnColor } from "../internal/button.js";
import {
  pressKey,
  requireBounds,
  settle,
  waitFor,
} from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";
import { alpha, darkTheme } from "../internal/theme.js";
import { MotionProvider } from "../motion.js";
import { RippleButton, type RippleButtonProps } from "../ripple-button.js";
import { rippleOpacity } from "../ripple-button/logic.js";

/** A primary action with the props a case needs. */
const render = (props: Partial<RippleButtonProps> = {}) => {
  const onClick = vi.fn();
  const page = renderComponent(
    <RippleButton
      testId="action"
      variant="primary"
      onClick={onClick}
      {...props}
    >
      Ship
    </RippleButton>,
  );
  settle(page);
  return { page, onClick };
};

/** The disc painted now, if any. */
const disc = (page: ReturnType<typeof renderComponent>) =>
  page.renderer.findByTestId("ripple");

/**
 * One mounted action whose preference the case can change, so a flip keeps the
 * button and the disc it is spreading rather than remounting them.
 */
const Pressable = ({ reduced }: { readonly reduced: boolean }) => (
  <MotionProvider preference={reduced ? "reduced" : "animated"}>
    <RippleButton testId="action" variant="primary">
      Ship
    </RippleButton>
  </MotionProvider>
);

/** Every disc in the tree, for a burst of presses. */
const discs = (page: ReturnType<typeof renderComponent>) =>
  page.renderer
    .findByType("div")
    .filter((element) => element.testId === "ripple");

describe("RippleButton", () => {
  it("spreads a disc from the corner that was pressed, centred on it", () => {
    const { page } = render();
    try {
      const box = requireBounds(page, "action");
      page.renderer.clockPause();
      page.renderer.nativeSimulateClick(box.x + 4, box.y + 4);
      settle(page);

      page.renderer.clockFastForward(250);
      settle(page);
      const grown = requireBounds(page, "ripple");
      expect(grown.width).toBeGreaterThan(0);
      expect(grown.x + grown.width / 2).toBeCloseTo(box.x + 4, 0);
      expect(grown.y + grown.height / 2).toBeCloseTo(box.y + 4, 0);

      page.renderer.clockFastForward(400);
      settle(page);
      const full = requireBounds(page, "ripple");
      expect(full.width).toBe(
        2 * Math.ceil(Math.hypot(box.width - 4, box.height - 4)),
      );
    } finally {
      page.unmount();
    }
  });

  it("removes the disc when its tween is over", async () => {
    const { page } = render();
    try {
      const box = requireBounds(page, "action");
      page.renderer.nativeSimulateClick(box.x + 4, box.y + 4);
      settle(page);
      expect(disc(page)).toBeDefined();

      await waitFor(() => expect(disc(page)).toBeUndefined());
    } finally {
      page.unmount();
    }
  });

  it("ripples from the centre of a keyboard activation", () => {
    const { page, onClick } = render();
    try {
      const box = requireBounds(page, "action");
      page.renderer.clockPause();
      page.renderer.focusElement(
        page.renderer.findByTestId("action")?.id ?? -1,
      );
      pressKey(page, "enter");
      settle(page);

      expect(onClick).toHaveBeenCalledTimes(1);
      const born = requireBounds(page, "ripple");
      expect(born.x + born.width / 2).toBeCloseTo(box.x + box.width / 2, 0);
      expect(born.y + born.height / 2).toBeCloseTo(box.y + box.height / 2, 0);
    } finally {
      page.unmount();
    }
  });

  it("paints no ripple under the reduced preference, but still acts", () => {
    const onClick = vi.fn();
    const page = renderComponent(
      <MotionProvider preference="reduced">
        <RippleButton testId="action" onClick={onClick}>
          Ship
        </RippleButton>
      </MotionProvider>,
    );
    settle(page);
    try {
      const box = requireBounds(page, "action");
      page.renderer.nativeSimulateClick(box.x + 4, box.y + 4);
      settle(page);

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(disc(page)).toBeUndefined();
    } finally {
      page.unmount();
    }
  });

  it("ripples again while the first disc paints, without blocking the press", () => {
    const { page, onClick } = render();
    try {
      const box = requireBounds(page, "action");
      page.renderer.clockPause();
      page.renderer.nativeSimulateClick(box.x + 4, box.y + 4);
      settle(page);
      page.renderer.clockFastForward(100);
      settle(page);

      const first = disc(page);
      const firstId = first?.id ?? -1;
      expect(page.renderer.getElementsAt(box.x + 4, box.y + 4)).toContain(
        page.renderer.findByTestId("action")?.id ?? -2,
      );
      expect(page.renderer.getElementsAt(box.x + 4, box.y + 4)).not.toContain(
        firstId,
      );

      page.renderer.nativeSimulateClick(box.x + 4, box.y + 4);
      settle(page);
      expect(onClick).toHaveBeenCalledTimes(2);
      expect(discs(page)).toHaveLength(2);
    } finally {
      page.unmount();
    }
  });

  it("drops a disc already spreading when the setting turns on", async () => {
    // A disc is pure journey. The preference is read on every render, so the
    // layer a press mounted goes with the travel the setting removed instead
    // of staying in the tree for the rest of the level.
    const page = renderComponent(<Pressable reduced={false} />);
    try {
      const box = requireBounds(page, "action");
      page.renderer.clockPause();
      page.renderer.nativeSimulateClick(box.x + 4, box.y + 4);
      settle(page);
      page.renderer.clockFastForward(100);
      settle(page);
      expect(disc(page)).toBeDefined();

      page.rerender(<Pressable reduced />);
      settle(page);

      // Well inside the 500 ms window the animated disc would still be running.
      await waitFor(() => expect(disc(page)).toBeUndefined(), 80);
    } finally {
      page.unmount();
    }
  });

  it("paints no ripple for a disabled action", () => {
    const { page, onClick } = render({ disabled: true });
    try {
      const box = requireBounds(page, "action");
      page.renderer.nativeSimulateClick(box.x + 4, box.y + 4);
      settle(page);

      expect(onClick).not.toHaveBeenCalled();
      expect(disc(page)).toBeUndefined();
    } finally {
      page.unmount();
    }
  });

  it("paints the label's ink, not the action's fill", () => {
    const { page } = render();
    try {
      const box = requireBounds(page, "action");
      page.renderer.nativeSimulateClick(box.x + 4, box.y + 4);
      settle(page);

      const wash = disc(page)?.style.backgroundColor;
      expect(wash).toBe(
        alpha(actionOnColor(darkTheme, "primary"), rippleOpacity),
      );
      expect(wash).not.toBe(darkTheme.colors.primary);
    } finally {
      page.unmount();
    }
  });
});
