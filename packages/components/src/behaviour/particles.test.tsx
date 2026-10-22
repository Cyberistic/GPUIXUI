/**
 * Particles in the real GPUix renderer.
 *
 * The bugs these guard: a field seeded outside the box it was measured in; a
 * seed that is not the identity it claims (a background that reshuffles between
 * mounts); motes that never move, or that travel and never come back, because the
 * runtime tweens one target and a float has to turn around; a reduced preference
 * that deletes the field instead of stilling it; a decorative field that leaks
 * into the accessibility tree or swallows the presses on the content in front of
 * it; and a field that keeps the box it was first laid out in after a resize.
 *
 * The motion clock is paused before the mount, so the first frame is the declared
 * initial position rather than wherever the frame loop had got. A headless tree
 * reports bounds, not paint, so the drift is the observable half of the motion.
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
import { Particles } from "../particles.js";
import {
  particleField,
  particleMaxSize,
  particleMinSize,
  particleTravel,
  type ParticleFieldInput,
  type ParticleSpec,
} from "../particles/logic.js";

/** The leg the drift cases run with, short enough to finish in a test. */
const legMs = 2_000;

/** A field's pure layout for the box the renderer measured. */
const fieldIn = (
  page: ReturnType<typeof renderComponent>,
  overrides: Partial<ParticleFieldInput> = {},
): ReadonlyArray<ParticleSpec> => {
  const box = requireBounds(page, "field");
  return particleField({
    width: box.width,
    height: box.height,
    count: 6,
    seed: 3,
    minSize: particleMinSize,
    maxSize: particleMaxSize,
    driftMs: legMs,
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
  // The field positions itself from its own layout, so the motes arrive on the
  // second frame; the second settle paints what the measurement changed.
  settle(page);
  settle(page);
  return { page, show };
};

/** How far a mote's top-left sits from the field's own top-left. */
const offsetOf = (
  page: ReturnType<typeof renderComponent>,
  index: number,
): { readonly x: number; readonly y: number } => {
  const field = requireBounds(page, "field");
  const mote = requireBounds(page, `particle-${index}`);
  return { x: mote.x - field.x, y: mote.y - field.y };
};

const specAt = (
  specs: ReadonlyArray<ParticleSpec>,
  index: number,
): ParticleSpec => {
  const spec = specs[index];
  if (spec === undefined) {
    throw new Error(`behaviour: no mote at ${index}`);
  }
  return spec;
};

const Field = ({ reduced = false }: { readonly reduced?: boolean }) => (
  <MotionProvider preference={reduced ? "reduced" : "animated"}>
    <Particles
      testId="field"
      count={6}
      seed={3}
      driftMs={legMs}
      style={{ width: 300, height: 200 }}
    />
  </MotionProvider>
);

describe("Particles", () => {
  it("lays its motes out inside the box it measured", () => {
    const { page } = mountFrozen(<Field />);
    try {
      const specs = fieldIn(page);

      expect(Arr.length(specs)).toBe(6);
      Arr.forEach(specs, (spec, index) => {
        const offset = offsetOf(page, index);
        expect(offset.x).toBeCloseTo(spec.x, 0);
        expect(offset.y).toBeCloseTo(spec.y, 0);
      });
    } finally {
      page.unmount();
    }
  });

  it("paints the same field for the same seed and a different one otherwise", () => {
    const { page, show } = mountFrozen(<Field />);
    try {
      const seeded = Arr.map(fieldIn(page), (_, index) =>
        offsetOf(page, index),
      );

      // The same seed is the same field: a decorative background must not
      // reshuffle when the component remounts or re-renders.
      show(<Field />);
      settle(page);
      settle(page);
      expect(
        Arr.map(fieldIn(page), (_, index) => offsetOf(page, index)),
      ).toEqual(seeded);

      // Another seed is another field.
      show(
        <Particles
          testId="field"
          count={6}
          seed={4}
          driftMs={legMs}
          style={{ width: 300, height: 200 }}
        />,
      );
      settle(page);
      settle(page);
      const reseeded = Arr.map(fieldIn(page, { seed: 4 }), (_, index) =>
        offsetOf(page, index),
      );
      expect(reseeded).not.toEqual(seeded);
    } finally {
      page.unmount();
    }
  });

  it("drifts a mote out and turns it around when the tween completes", () => {
    const { page } = mountFrozen(<Field />);
    try {
      const spec = specAt(fieldIn(page), 0);
      const far = particleTravel(spec, 1);

      expect(offsetOf(page, 0).x).toBeCloseTo(spec.x, 0);

      page.renderer.clockFastForward(spec.durationMs);
      settle(page);
      expect(offsetOf(page, 0).x).toBeCloseTo(far.left, 0);
      expect(offsetOf(page, 0).y).toBeCloseTo(far.top, 0);

      // The turnaround is the completion edge: the same mote returns to the
      // seeded place instead of drifting away from it.
      page.renderer.clockFastForward(spec.durationMs);
      settle(page);
      expect(offsetOf(page, 0).x).toBeCloseTo(spec.x, 0);
      expect(offsetOf(page, 0).y).toBeCloseTo(spec.y, 0);
    } finally {
      page.unmount();
    }
  });

  it("paints the seeded field still under the reduced preference", () => {
    const { page } = mountFrozen(<Field reduced />);
    try {
      const spec = specAt(fieldIn(page), 1);

      expect(byTestId(page.renderer, "particle-1")).not.toHaveProperty(
        "customProps.motion",
      );
      expect(
        byTestId(page.renderer, "field").customProps?.motion,
      ).toMatchObject({
        transition: { duration: 0 },
      });

      page.renderer.clockFastForward(legMs * 3);
      settle(page);
      expect(offsetOf(page, 1).x).toBeCloseTo(spec.x, 0);
      expect(offsetOf(page, 1).y).toBeCloseTo(spec.y, 0);
    } finally {
      page.unmount();
    }
  });

  it("publishes no accessibility node and takes no pointer input", () => {
    const { page } = mountFrozen(<Field />);
    try {
      // The window itself is the only node: the field adds no role and no name.
      expect(Arr.map(a11yNodes(page.renderer), (node) => node.role)).toEqual([
        "window",
      ]);
      expect(byTestId(page.renderer, "field").style.pointerEvents).toBe("none");
      // A mote is a filled, positioned box, so it needs the opt-out of its own.
      expect(byTestId(page.renderer, "particle-0").style.pointerEvents).toBe(
        "none",
      );
    } finally {
      page.unmount();
    }
  });

  it("paints no motes when the caller asks for none", () => {
    const { page } = mountFrozen(
      <Particles
        testId="field"
        count={0}
        style={{ width: 300, height: 200 }}
      />,
    );
    try {
      expect(page.renderer.findByTestId("field")).toBeDefined();
      expect(page.renderer.findByTestId("particle-0")).toBeUndefined();
    } finally {
      page.unmount();
    }
  });

  it("re-draws the field in the box a resize reports", () => {
    const { page, show } = mountFrozen(<Field />);
    try {
      show(
        <Particles
          testId="field"
          count={6}
          seed={3}
          driftMs={legMs}
          style={{ width: 500, height: 320 }}
        />,
      );
      settle(page);
      settle(page);

      const box = requireBounds(page, "field");
      expect(box.width).toBe(500);

      const specs = particleField({
        width: box.width,
        height: box.height,
        count: 6,
        seed: 3,
        minSize: particleMinSize,
        maxSize: particleMaxSize,
        driftMs: legMs,
      });
      Arr.forEach(specs, (spec, index) => {
        const offset = offsetOf(page, index);
        expect(offset.x).toBeCloseTo(spec.x, 0);
        expect(offset.y).toBeCloseTo(spec.y, 0);
      });
    } finally {
      page.unmount();
    }
  });

  it("fades the field in at the house slow level", () => {
    const { page } = mountFrozen(<Field />);
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
