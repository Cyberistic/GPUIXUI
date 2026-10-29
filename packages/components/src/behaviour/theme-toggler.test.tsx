/**
 * ThemeToggler in the real GPUix renderer.
 *
 * The bugs these guard: a control whose accessible name describes the current
 * theme instead of the press (so a reader cannot tell what pressing it does); a
 * press that reports the mode it is already in, or one that reports nothing at
 * all; a flip that is a hard swap rather than the sun/crescent crossover, or one
 * that ignores `level="none"` and the reduced preference; a glyph whose size
 * per theme moved the control's box; and a caller's own copy being ignored.
 *
 * The crossover is measured on the runtime's motion clock as geometry: each
 * glyph's own box grows or shrinks inside one fixed wrapper, so both stay
 * centred and the button cannot reflow. The fade itself is a paint value the
 * tree does not expose — the `surface-fade` live probe proves it for the seam
 * this control shares with every overlay.
 */

import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import type { TestRenderer } from "@gpuix/react/testing";
import { nodesWithRole } from "../internal/a11y.js";
import {
  clickCentreOf,
  requireBounds,
  settle,
} from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";
import { MotionProvider, surfaceLevelOf } from "../motion.js";
import { ThemeToggler } from "../theme-toggler.js";

/** The one `button` node's accessible name, `""` when there is none. */
const buttonName = (renderer: TestRenderer): string =>
  nodesWithRole(renderer, "button")[0]?.name ?? "";

/** One glyph layer's painted box. */
const layer = (
  page: ReturnType<typeof renderComponent>,
  part: "sun" | "moon",
) => requireBounds(page, `theme-toggler-${part}`);

/** The centre of a painted box on the x axis. */
const centreX = (bounds: { readonly x: number; readonly width: number }) =>
  bounds.x + bounds.width / 2;

describe("ThemeToggler", () => {
  it("names the press and paints one decorative glyph", () => {
    const page = renderComponent(
      <ThemeToggler mode="dark" onChange={() => undefined} />,
    );
    try {
      expect(buttonName(page.renderer)).toBe("Switch to light theme");
      expect(page.renderer.getAllText()).toEqual([]);
      const glyph = page.renderer.findByTestId("theme-toggler-glyph");
      const child = Option.getOrUndefined(
        Option.fromNullishOr(glyph?.children[0]),
      );
      expect(
        child === undefined ? undefined : page.renderer.getElement(child)?.type,
      ).toBe("svg");
    } finally {
      page.unmount();
    }
  });

  it("reports the other mode on a press, both ways", () => {
    const requested: Array<string> = [];
    const page = renderComponent(
      <ThemeToggler mode="dark" onChange={(mode) => requested.push(mode)} />,
    );
    try {
      clickCentreOf(page, "theme-toggler");
      settle(page);
      page.rerender(
        <ThemeToggler mode="light" onChange={(mode) => requested.push(mode)} />,
      );
      settle(page);
      clickCentreOf(page, "theme-toggler");
      settle(page);

      expect(requested).toEqual(["light", "dark"]);
      expect(buttonName(page.renderer)).toBe("Switch to dark theme");
    } finally {
      page.unmount();
    }
  });

  it("takes the caller's names per direction", () => {
    const page = renderComponent(
      <ThemeToggler
        mode="light"
        lightLabel="Go light"
        darkLabel="Go dark"
        onChange={() => undefined}
      />,
    );
    try {
      expect(buttonName(page.renderer)).toBe("Go dark");
      page.rerender(
        <ThemeToggler
          mode="dark"
          lightLabel="Go light"
          darkLabel="Go dark"
          onChange={() => undefined}
        />,
      );
      settle(page);
      expect(buttonName(page.renderer)).toBe("Go light");
    } finally {
      page.unmount();
    }
  });

  it("paints the rest frames for a stored none read through the reader", () => {
    // The `level` prop is a persisted choice as often as a literal; the reader
    // beside the vocabulary is what keeps a saved `"none"` still.
    const saved: unknown = "none";
    const page = renderComponent(
      <ThemeToggler
        mode="dark"
        level={surfaceLevelOf(saved)}
        onChange={() => undefined}
      />,
    );
    try {
      page.renderer.clockPause();
      page.rerender(
        <ThemeToggler
          mode="light"
          level={surfaceLevelOf(saved)}
          onChange={() => undefined}
        />,
      );
      settle(page);
      expect(layer(page, "sun").width).toBeLessThan(layer(page, "moon").width);
      expect(
        page.renderer.findByTestId("theme-toggler-sun")?.customProps?.motion,
      ).toBeUndefined();
    } finally {
      page.unmount();
    }
  });

  it("keeps the control's box identical when the mode flips", () => {
    // The layout shift this guards: a glyph that changed the control's size
    // moved the button (and everything centred with it) on every press. Both
    // glyphs share one fixed box, so the control cannot reflow.
    const page = renderComponent(
      <ThemeToggler mode="dark" onChange={() => undefined} />,
    );
    try {
      const before = requireBounds(page, "theme-toggler");
      page.renderer.clockPause();
      page.rerender(<ThemeToggler mode="light" onChange={() => undefined} />);
      settle(page);
      page.renderer.clockFastForward(400);
      settle(page);
      expect(requireBounds(page, "theme-toggler")).toStrictEqual(before);
    } finally {
      page.unmount();
    }
  });

  it("crosses the sun into the crescent, both glyphs centred", () => {
    const page = renderComponent(
      <ThemeToggler mode="dark" onChange={() => undefined} />,
    );
    try {
      const sun = layer(page, "sun");
      const moon = layer(page, "moon");
      // At rest: the sun owns the box, the crescent waits at 55% of it.
      expect(sun.width).toBeGreaterThan(moon.width);
      expect(centreX(sun)).toBeCloseTo(centreX(moon), 0);

      page.renderer.clockPause();
      page.rerender(<ThemeToggler mode="light" onChange={() => undefined} />);
      settle(page);
      // Half the slow level: the two are crossing, not jumping.
      page.renderer.clockFastForward(160);
      settle(page);
      const crossingSun = layer(page, "sun");
      const crossingMoon = layer(page, "moon");
      expect(crossingSun.width).toBeLessThan(sun.width);
      expect(crossingSun.width).toBeGreaterThan(moon.width);
      expect(crossingMoon.width).toBeGreaterThan(moon.width);
      expect(crossingMoon.width).toBeLessThan(sun.width);
      expect(centreX(crossingSun)).toBeCloseTo(centreX(crossingMoon), 0);

      page.renderer.clockFastForward(400);
      settle(page);
      expect(layer(page, "sun").width).toBeCloseTo(moon.width, 1);
      expect(layer(page, "moon").width).toBeCloseTo(sun.width, 1);
      expect(centreX(layer(page, "sun"))).toBeCloseTo(
        centreX(layer(page, "moon")),
        0,
      );
    } finally {
      page.unmount();
    }
  });

  it("snaps the crossover under the reduced preference", () => {
    const page = renderComponent(
      <MotionProvider preference="reduced">
        <ThemeToggler mode="dark" onChange={() => undefined} />
      </MotionProvider>,
    );
    try {
      const sun = layer(page, "sun").width;
      page.renderer.clockPause();
      page.rerender(
        <MotionProvider preference="reduced">
          <ThemeToggler mode="light" onChange={() => undefined} />
        </MotionProvider>,
      );
      settle(page);
      // No clock advance: the journey is removed, the final frame is not.
      expect(layer(page, "moon").width).toBeCloseTo(sun, 1);
      expect(layer(page, "sun").width).toBeLessThan(sun);
    } finally {
      page.unmount();
    }
  });
});
