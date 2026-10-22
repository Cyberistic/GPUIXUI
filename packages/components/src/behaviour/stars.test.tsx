/**
 * Stars in the real GPUix renderer.
 *
 * The bugs these guard: a sky seeded outside the box it was measured in; a seed
 * that is not the identity it claims (a background that reshuffles between
 * mounts); a star handed one target and never the other, because the runtime
 * tweens a target once and a twinkle has to turn around; a twinkle that starts
 * from the peak instead of its own floor; a reduced preference that deletes the
 * sky instead of stilling it; a decorative field that leaks into the
 * accessibility tree or swallows presses; and a field whose entrance ignores the
 * house level.
 *
 * The motion clock is paused before the mount, so the first frame is the declared
 * initial frame rather than wherever the frame loop had got. A headless tree
 * reports bounds and the motion description, not paint, so the twinkle is read
 * from the targets the component hands the runtime — the sampler that paints them
 * is measured by the overlay and mote suites.
 */

import type { TestElement, TestRoot } from "@gpuix/react/testing";
import { motionLevels } from "@gpuixui/motion/timing";
import * as Arr from "effect/Array";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { a11yNodes } from "../internal/a11y.js";
import { requireBounds, settle } from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";
import { MotionProvider } from "../motion.js";
import { Stars } from "../stars.js";
import {
  starAt,
  starField,
  starMaxSize,
  starMinSize,
  type StarFieldInput,
  type StarSpec,
} from "../stars/logic.js";

/** The twinkle the cases run with, short enough to finish in a test. */
const twinkleMs = 2_000;

/** A sky's pure layout for the box the renderer measured. */
const skyIn = (
  page: ReturnType<typeof renderComponent>,
  overrides: Partial<StarFieldInput> = {},
): ReadonlyArray<StarSpec> => {
  const box = requireBounds(page, "field");
  return starField({
    width: box.width,
    height: box.height,
    count: 8,
    seed: 3,
    minSize: starMinSize,
    maxSize: starMaxSize,
    twinkleMs,
    ...overrides,
  });
};

/** One element by test id, failing rather than casting. */
const byTestId = (
  renderer: TestRoot["renderer"],
  testId: string,
): TestElement => {
  const element = renderer.findByTestId(testId);
  if (element === undefined) {
    throw new Error(`behaviour: no element with testId "${testId}"`);
  }
  return element;
};

/** Mount under a paused motion clock, then let the box measurement land. */
const mountFrozen = (node: ReactNode) => {
  const page = renderComponent(<div />);
  page.renderer.clockPause();
  const show = (next: ReactNode): void => {
    page.rerender(next);
    page.renderer.flush();
  };
  show(node);
  // The field positions itself from its own layout, so the stars arrive on the
  // second frame; the second settle paints what the measurement changed.
  settle(page);
  settle(page);
  return { page, show };
};

/** How far a star's top-left sits from the field's own top-left. */
const offsetOf = (
  page: ReturnType<typeof renderComponent>,
  index: number,
): { readonly x: number; readonly y: number } => {
  const field = requireBounds(page, "field");
  const star = requireBounds(page, `star-${index}`);
  return { x: star.x - field.x, y: star.y - field.y };
};

/** The target opacity the component handed the runtime for one star. */
const expectTarget = (
  page: ReturnType<typeof renderComponent>,
  index: number,
  opacity: number,
): void => {
  expect(
    byTestId(page.renderer, `star-${index}`).customProps?.motion,
  ).toMatchObject({ animate: { opacity } });
};

const specAt = (specs: ReadonlyArray<StarSpec>, index: number): StarSpec => {
  const spec = specs[index];
  if (spec === undefined) {
    throw new Error(`behaviour: no star at ${index}`);
  }
  return spec;
};

const Sky = ({ reduced = false }: { readonly reduced?: boolean }) => (
  <MotionProvider preference={reduced ? "reduced" : "animated"}>
    <Stars
      testId="field"
      count={8}
      seed={3}
      twinkleMs={twinkleMs}
      style={{ width: 300, height: 200 }}
    />
  </MotionProvider>
);

describe("Stars", () => {
  it("lays its stars out inside the box it measured", () => {
    const { page } = mountFrozen(<Sky />);
    try {
      const specs = skyIn(page);
      expect(Arr.length(specs)).toBe(8);

      Arr.forEach(specs, (spec, index) => {
        const offset = offsetOf(page, index);
        expect(offset.x).toBeCloseTo(spec.x, 0);
        expect(offset.y).toBeCloseTo(spec.y, 0);
        expect(byTestId(page.renderer, `star-${index}`).style.width).toBe(
          spec.size,
        );
      });
    } finally {
      page.unmount();
    }
  });

  it("paints the same sky for the same seed and a different one otherwise", () => {
    const { page, show } = mountFrozen(<Sky />);
    try {
      const seeded = Arr.map(skyIn(page), (_, index) => offsetOf(page, index));

      show(<Sky />);
      settle(page);
      settle(page);
      expect(Arr.map(skyIn(page), (_, index) => offsetOf(page, index))).toEqual(
        seeded,
      );

      show(
        <Stars
          testId="field"
          count={8}
          seed={4}
          twinkleMs={twinkleMs}
          style={{ width: 300, height: 200 }}
        />,
      );
      settle(page);
      settle(page);
      expect(
        Arr.map(skyIn(page, { seed: 4 }), (_, index) => offsetOf(page, index)),
      ).not.toEqual(seeded);
    } finally {
      page.unmount();
    }
  });

  it("twinkles a star to its peak and back when the tween completes", () => {
    const { page } = mountFrozen(<Sky />);
    try {
      const spec = specAt(skyIn(page), 0);
      // Born at its own floor and heading for its own peak.
      expect(byTestId(page.renderer, "star-0").style.opacity).toBe(spec.dim);
      expectTarget(page, 0, starAt(spec, 1));

      page.renderer.clockFastForward(spec.durationMs + spec.delayMs);
      settle(page);
      expectTarget(page, 0, starAt(spec, -1));

      // The next completion turns it around again, so the sky keeps breathing.
      page.renderer.clockFastForward(spec.durationMs + spec.delayMs);
      settle(page);
      expectTarget(page, 0, starAt(spec, 1));
    } finally {
      page.unmount();
    }
  });

  it("paints the sky still at its floor under the reduced preference", () => {
    const { page } = mountFrozen(<Sky reduced />);
    try {
      const spec = specAt(skyIn(page), 1);

      expect(byTestId(page.renderer, "star-1")).not.toHaveProperty(
        "customProps.motion",
      );
      expect(byTestId(page.renderer, "star-1").style.opacity).toBe(spec.dim);
      expect(
        byTestId(page.renderer, "field").customProps?.motion,
      ).toMatchObject({
        transition: { duration: 0 },
      });

      page.renderer.clockFastForward(twinkleMs * 3);
      settle(page);
      expect(byTestId(page.renderer, "star-1").style.opacity).toBe(spec.dim);
    } finally {
      page.unmount();
    }
  });

  it("publishes no accessibility node and takes no pointer input", () => {
    const { page } = mountFrozen(<Sky />);
    try {
      // The window itself is the only node: the field adds no role and no name.
      expect(Arr.map(a11yNodes(page.renderer), (node) => node.role)).toEqual([
        "window",
      ]);
      expect(byTestId(page.renderer, "field").style.pointerEvents).toBe("none");
      expect(byTestId(page.renderer, "star-0").style.pointerEvents).toBe(
        "none",
      );
    } finally {
      page.unmount();
    }
  });

  it("paints no stars when the caller asks for none", () => {
    const { page } = mountFrozen(
      <Stars testId="field" count={0} style={{ width: 300, height: 200 }} />,
    );
    try {
      expect(page.renderer.findByTestId("field")).toBeDefined();
      expect(page.renderer.findByTestId("star-0")).toBeUndefined();
    } finally {
      page.unmount();
    }
  });

  it("fades the field in at the house slow level", () => {
    const { page } = mountFrozen(<Sky />);
    try {
      expect(
        byTestId(page.renderer, "field").customProps?.motion,
      ).toMatchObject({
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: motionLevels.slow / 1000 },
      });
    } finally {
      page.unmount();
    }
  });
});
