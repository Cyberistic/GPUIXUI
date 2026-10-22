/**
 * Fireworks in the real GPUix renderer.
 *
 * The bugs these guard: a field seeded outside the box it was measured in; a
 * spark that is already at its ring on the first frame, so nothing travels; a
 * fly phase that replays from the centre instead of retargeting, so the fade
 * starts over; a fade that never fires, so the burst stays lit at the rim; a
 * field that stops after one burst because the runtime tweens a target once; a
 * reduced preference that deletes the field instead of stilling it; a decorative
 * field that leaks into the accessibility tree or swallows presses; and an
 * entrance that ignores the house level.
 *
 * The motion clock is paused before the mount, so the first frame is the declared
 * initial frame rather than wherever the frame loop had got. A headless tree
 * reports bounds and the motion description, not paint, so the life is read from
 * the targets the component hands the runtime — the sampler that paints them is
 * measured by the overlay and mote suites.
 */

import type { TestElement, TestRoot } from "@gpuix/react/testing";
import { motionLevels } from "@gpuixui/motion/timing";
import * as Arr from "effect/Array";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { Fireworks } from "../fireworks.js";
import {
  fireworkField,
  fireworkMaxSize,
  fireworkMinSize,
  sparkPhases,
  sparkRest,
  type FireworkFieldInput,
  type FireworkSpark,
} from "../fireworks/logic.js";
import { a11yNodes } from "../internal/a11y.js";
import { requireBounds, settle } from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";
import { MotionProvider } from "../motion.js";

/** The burst the cases run with, short enough to finish in a test. */
const burstMs = 1_000;

/** The pure layout for the box the renderer measured. */
const fieldIn = (
  page: ReturnType<typeof renderComponent>,
  overrides: Partial<FireworkFieldInput> = {},
): ReadonlyArray<FireworkSpark> => {
  const box = requireBounds(page, "field");
  return fireworkField({
    width: box.width,
    height: box.height,
    bursts: 2,
    sparks: 6,
    seed: 3,
    minSize: fireworkMinSize,
    maxSize: fireworkMaxSize,
    burstMs,
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
  // The field positions itself from its own layout, so the sparks arrive on the
  // second frame; the second settle paints what the measurement changed.
  settle(page);
  settle(page);
  return { page, show };
};

const specAt = (
  specs: ReadonlyArray<FireworkSpark>,
  index: number,
): FireworkSpark => {
  const spec = specs[index];
  if (spec === undefined) {
    throw new Error(`behaviour: no spark at ${index}`);
  }
  return spec;
};

const Field = ({ reduced = false }: { readonly reduced?: boolean }) => (
  <MotionProvider preference={reduced ? "reduced" : "animated"}>
    <Fireworks
      testId="field"
      bursts={2}
      sparks={6}
      seed={3}
      burstMs={burstMs}
      style={{ width: 300, height: 200 }}
    />
  </MotionProvider>
);

describe("Fireworks", () => {
  it("lays its sparks out at the centres the box allows", () => {
    const { page } = mountFrozen(<Field />);
    try {
      const specs = fieldIn(page);
      expect(specs).toHaveLength(12);

      Arr.forEach(specs, (spec) => {
        const spark = byTestId(page.renderer, `spark-${spec.key}`);
        expect(spark.style.left).toBeCloseTo(spec.x, 0);
        expect(spark.style.top).toBeCloseTo(spec.y, 0);
        expect(spark.style.width).toBe(spec.size);
        expect(spark.style.opacity).toBe(0);
      });
    } finally {
      page.unmount();
    }
  });

  it("flies a spark out to its ring, brightening", () => {
    const { page } = mountFrozen(<Field />);
    try {
      const spec = specAt(fieldIn(page), 0);
      const fly = sparkPhases(spec).fly;
      const spark = byTestId(page.renderer, "spark-0-0");

      expect(spark.customProps?.motion).toMatchObject({
        initial: { left: spec.x, top: spec.y, opacity: 0 },
        animate: { left: fly.left, top: fly.top, opacity: fly.opacity },
        transition: {
          duration: fly.durationMs / 1000,
          delay: fly.delayMs / 1000,
        },
      });
    } finally {
      page.unmount();
    }
  });

  it("fades from where the fly left it, then starts another burst", () => {
    const { page } = mountFrozen(<Field />);
    try {
      const spec = specAt(fieldIn(page), 0);
      const phases = sparkPhases(spec);
      const born = byTestId(page.renderer, "spark-0-0");

      page.renderer.clockFastForward(
        phases.fly.durationMs + phases.fly.delayMs,
      );
      settle(page);

      // The fade retargets from the ring rather than replaying the entry.
      const fading = byTestId(page.renderer, "spark-0-0");
      expect(fading.id).toBe(born.id);
      expect(fading.customProps?.motion).toMatchObject({
        initial: false,
        animate: {
          left: phases.fade.left,
          top: phases.fade.top,
          opacity: 0,
        },
        transition: { duration: phases.fade.durationMs / 1000, delay: 0 },
      });

      page.renderer.clockFastForward(phases.fade.durationMs);
      settle(page);

      // A fresh spark at the centre, heading out again.
      const next = byTestId(page.renderer, "spark-0-0");
      expect(next.id).not.toBe(born.id);
      expect(next.style.left).toBeCloseTo(spec.x, 0);
      expect(next.style.top).toBeCloseTo(spec.y, 0);
      expect(next.style.opacity).toBe(0);
      expect(next.customProps?.motion).toMatchObject({
        animate: { opacity: phases.fly.opacity },
      });
    } finally {
      page.unmount();
    }
  });

  it("paints the same sequence for the same seed and a different one otherwise", () => {
    const { page, show } = mountFrozen(<Field />);
    try {
      const seeded = Arr.map(
        fieldIn(page),
        (spec) => byTestId(page.renderer, `spark-${spec.key}`).style.left,
      );

      show(<Field />);
      settle(page);
      settle(page);
      expect(
        Arr.map(
          fieldIn(page),
          (spec) => byTestId(page.renderer, `spark-${spec.key}`).style.left,
        ),
      ).toEqual(seeded);

      show(
        <Fireworks
          testId="field"
          bursts={2}
          sparks={6}
          seed={4}
          burstMs={burstMs}
          style={{ width: 300, height: 200 }}
        />,
      );
      settle(page);
      settle(page);
      expect(
        Arr.map(
          fieldIn(page, { seed: 4 }),
          (spec) => byTestId(page.renderer, `spark-${spec.key}`).style.left,
        ),
      ).not.toEqual(seeded);
    } finally {
      page.unmount();
    }
  });

  it("paints the field still at its ring under the reduced preference", () => {
    const { page } = mountFrozen(<Field reduced />);
    try {
      const spec = specAt(fieldIn(page), 1);
      const rest = sparkRest(spec);
      const spark = byTestId(page.renderer, "spark-0-1");

      expect(spark).not.toHaveProperty("customProps.motion");
      // The field stays where it was drawn; the flight is what is removed.
      expect(spark.style.left).toBeCloseTo(rest.left, 0);
      expect(spark.style.top).toBeCloseTo(rest.top, 0);
      expect(spark.style.opacity).toBe(spec.peak);
      expect(
        byTestId(page.renderer, "field").customProps?.motion,
      ).toMatchObject({
        transition: { duration: 0 },
      });

      page.renderer.clockFastForward(burstMs * 3);
      settle(page);
      expect(byTestId(page.renderer, "spark-0-1").style.left).toBeCloseTo(
        rest.left,
        0,
      );
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
      expect(byTestId(page.renderer, "spark-0-0").style.pointerEvents).toBe(
        "none",
      );
    } finally {
      page.unmount();
    }
  });

  it("paints no sparks when the caller asks for none", () => {
    const { page } = mountFrozen(
      <Fireworks
        testId="field"
        bursts={0}
        style={{ width: 300, height: 200 }}
      />,
    );
    try {
      expect(page.renderer.findByTestId("field")).toBeDefined();
      expect(page.renderer.findByTestId("spark-0-0")).toBeUndefined();
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
