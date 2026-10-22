/**
 * ShineButton in the real GPUix renderer.
 *
 * The bugs these guard: a sheen that is never painted on hover; a band that
 * starts inside the control (a pop); halves that do not travel together; a
 * layer that outlives its sweep; a re-entry that does not restart the sweep; a
 * reduced-motion reader who still gets the journey; a disabled action that
 * shines; and a sheen painted in the action's own fill, where it would vanish.
 *
 * The motion clock is paused for the frame readings, so the band's position is
 * the declared fraction rather than wherever real time had got. Its removal is a
 * real timer, so that half polls.
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
import { MotionProvider } from "../motion.js";
import { ShineButton, type ShineButtonProps } from "../shine-button.js";
import { sheenOpacity } from "../shine-button/logic.js";

/** A wide primary action, so a quarter of it is a whole band. */
const width = 240;

const render = (props: Partial<ShineButtonProps> = {}) => {
  const onClick = vi.fn();
  const page = renderComponent(
    <ShineButton
      testId="action"
      variant="primary"
      style={{ width }}
      onClick={onClick}
      {...props}
    >
      Ship
    </ShineButton>,
  );
  settle(page);
  return { page, onClick };
};

/**
 * One mounted action whose preference the case can change, so a flip keeps the
 * component (and the sheen it is running) rather than remounting it.
 */
const Hoverable = ({ reduced }: { readonly reduced: boolean }) => (
  <MotionProvider preference={reduced ? "reduced" : "animated"}>
    <ShineButton testId="action" style={{ width }}>
      Ship
    </ShineButton>
  </MotionProvider>
);

/** Every painted half of the sheen. */
const shines = (page: ReturnType<typeof renderComponent>) =>
  page.renderer
    .findByType("div")
    .filter((element) => element.testId === "shine");

/** The painted box of the half at `index`: the lead is first, the trail second. */
const half = (page: ReturnType<typeof renderComponent>, index: number) => {
  const element = shines(page)[index];
  if (element === undefined) {
    throw new Error(`behaviour: the sheen painted no half at ${index}`);
  }
  const box = page.renderer.getElementBounds(element.id);
  if (box === null) {
    throw new Error(`behaviour: half ${index} was not laid out`);
  }
  return box;
};

describe("ShineButton", () => {
  it("sweeps a band from outside the action to outside the far edge", () => {
    const { page } = render();
    try {
      const box = requireBounds(page, "action");
      page.renderer.clockPause();
      hoverCentreOf(page, "action");
      settle(page);

      expect(shines(page)).toHaveLength(2);
      const trail = half(page, 1);
      expect(trail.x + trail.width).toBeCloseTo(box.x, 0);
      expect(half(page, 0).width).toBe(60);

      page.renderer.clockFastForward(250);
      settle(page);
      const middle = half(page, 0);
      expect(middle.x).toBeGreaterThan(box.x);
      expect(middle.x).toBeLessThan(box.x + width);

      page.renderer.clockFastForward(400);
      settle(page);
      expect(half(page, 0).x).toBeGreaterThanOrEqual(box.x + width);
    } finally {
      page.unmount();
    }
  });

  it("removes the sheen when the sweep is over", async () => {
    const { page } = render();
    try {
      page.renderer.clockPause();
      hoverCentreOf(page, "action");
      settle(page);
      expect(shines(page)).toHaveLength(2);

      await waitFor(() => expect(shines(page)).toHaveLength(0));
    } finally {
      page.unmount();
    }
  });

  it("drops a sheen already crossing when the setting turns on", async () => {
    // A sheen is pure journey. The preference is read on every render, so the
    // band a hovered action is wearing goes with the travel the setting
    // removed instead of staying mounted for the rest of the level.
    const page = renderComponent(<Hoverable reduced={false} />);
    try {
      page.renderer.clockPause();
      hoverCentreOf(page, "action");
      settle(page);
      page.renderer.clockFastForward(250);
      settle(page);
      expect(shines(page)).toHaveLength(2);

      page.rerender(<Hoverable reduced />);
      settle(page);

      // Well inside the 500 ms window the animated sweep would still be running.
      await waitFor(() => expect(shines(page)).toHaveLength(0), 80);
    } finally {
      page.unmount();
    }
  });

  it("sweeps again when the pointer re-enters", () => {
    const { page } = render();
    try {
      const box = requireBounds(page, "action");
      page.renderer.clockPause();
      hoverCentreOf(page, "action");
      settle(page);
      page.renderer.clockFastForward(250);
      settle(page);
      expect(requireBounds(page, "shine").x).toBeGreaterThan(box.x);

      page.renderer.nativeSimulateMouseExit(1, 1);
      settle(page);
      hoverCentreOf(page, "action");
      settle(page);

      const again = half(page, 1);
      expect(again.x + again.width).toBeCloseTo(box.x, 0);
    } finally {
      page.unmount();
    }
  });

  it("paints no sheen under the reduced preference", () => {
    const page = renderComponent(
      <MotionProvider preference="reduced">
        <ShineButton testId="action" style={{ width }}>
          Ship
        </ShineButton>
      </MotionProvider>,
    );
    settle(page);
    try {
      hoverCentreOf(page, "action");
      settle(page);

      expect(shines(page)).toHaveLength(0);
    } finally {
      page.unmount();
    }
  });

  it("paints no sheen on a disabled action", () => {
    const { page } = render({ disabled: true });
    try {
      hoverCentreOf(page, "action");
      settle(page);

      expect(shines(page)).toHaveLength(0);
    } finally {
      page.unmount();
    }
  });

  it("paints the label's ink, not the action's fill", () => {
    const { page } = render();
    try {
      hoverCentreOf(page, "action");
      settle(page);

      const lit = alpha(actionOnColor(darkTheme, "primary"), sheenOpacity);
      expect(shines(page)[0]?.style.background).toMatchObject({
        type: "linear-gradient",
        angle: 90,
        stops: [
          { color: alpha(actionOnColor(darkTheme, "primary"), 0), position: 0 },
          { color: lit, position: 1 },
        ],
      });
      expect(lit).not.toBe(darkTheme.colors.primary);
    } finally {
      page.unmount();
    }
  });
});
