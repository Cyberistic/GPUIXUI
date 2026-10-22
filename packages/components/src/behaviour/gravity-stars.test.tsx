/**
 * GravityStars in the real GPUix renderer.
 *
 * The bugs these guard: a star born inside the box instead of on its edge; a
 * first leg that never hands over to the fade, so the star stays lit at the well;
 * a fall that replays its approach instead of retargeting from the frame on
 * screen; a field that stops after one fall because the runtime tweens a target
 * once; a reduced preference that deletes the field instead of stilling it; a
 * decorative field that leaks into the accessibility tree or swallows presses;
 * and an entrance that ignores the house level.
 *
 * The motion clock is paused before the mount, so the first frame is the declared
 * initial frame rather than wherever the frame loop had got. A headless tree
 * reports bounds and the motion description, not paint, so the fall is read from
 * the targets the component hands the runtime.
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
import { GravityStars } from "../gravity-stars.js";
import {
  gravityField,
  gravityMaxSize,
  gravityMinSize,
  gravityPhases,
  gravityRest,
  type GravityFieldInput,
  type GravityStar,
} from "../gravity-stars/logic.js";

/** The fall the cases run with, short enough to finish in a test. */
const fallMs = 2_000;

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

/** The field's pure layout for the box the renderer measured. */
const fieldIn = (
  page: ReturnType<typeof renderComponent>,
  overrides: Partial<GravityFieldInput> = {},
): ReadonlyArray<GravityStar> => {
  const box = requireBounds(page, "field");
  return gravityField({
    width: box.width,
    height: box.height,
    count: 10,
    seed: 3,
    minSize: gravityMinSize,
    maxSize: gravityMaxSize,
    fallMs,
    ...overrides,
  });
};

const specAt = (
  specs: ReadonlyArray<GravityStar>,
  index: number,
): GravityStar => {
  const spec = specs[index];
  if (spec === undefined) {
    throw new Error(`behaviour: no star at ${index}`);
  }
  return spec;
};

const Field = ({ reduced = false }: { readonly reduced?: boolean }) => (
  <MotionProvider preference={reduced ? "reduced" : "animated"}>
    <GravityStars
      testId="field"
      count={10}
      seed={3}
      fallMs={fallMs}
      style={{ width: 300, height: 200 }}
    />
  </MotionProvider>
);

describe("GravityStars", () => {
  it("births its stars on the edge it measured and lands them in one well", () => {
    const { page } = mountFrozen(<Field />);
    try {
      const specs = fieldIn(page);
      expect(Arr.length(specs)).toBe(10);

      Arr.forEach(specs, (spec) => {
        const star = byTestId(page.renderer, `gravity-star-${spec.key}`);
        expect(star.style.left).toBeCloseTo(spec.x, 0);
        expect(star.style.top).toBeCloseTo(spec.y, 0);
        expect(star.style.width).toBe(spec.size);
      });

      // Every star aims its centre at the same well.
      expect(
        Arr.length(
          Arr.dedupe(
            Arr.map(
              specs,
              (spec) =>
                `${Math.round(spec.endX + spec.size / 2)},${Math.round(spec.endY + spec.size / 2)}`,
            ),
          ),
        ),
      ).toBe(1);
      // The first star's declared box sits inside the field it was laid out in.
      const field = requireBounds(page, "field");
      const first = requireBounds(page, `gravity-star-${specAt(specs, 0).key}`);
      expect(first.x).toBeGreaterThanOrEqual(field.x);
      expect(first.y).toBeGreaterThanOrEqual(field.y);
      expect(first.x + first.width).toBeLessThanOrEqual(field.x + field.width);
      expect(first.y + first.height).toBeLessThanOrEqual(
        field.y + field.height,
      );
    } finally {
      page.unmount();
    }
  });

  it("brightens toward the well and then fades into it", () => {
    const { page } = mountFrozen(<Field />);
    try {
      const spec = specAt(fieldIn(page), 0);
      const phases = gravityPhases(spec);
      const born = byTestId(page.renderer, "gravity-star-0");

      // Born transparent on the edge, heading for the approach frame.
      expect(born.style.opacity).toBe(0);
      expect(born.customProps?.motion).toMatchObject({
        initial: { left: spec.x, top: spec.y, opacity: 0 },
        animate: {
          left: phases.approach.left,
          top: phases.approach.top,
          opacity: phases.approach.opacity,
        },
        transition: {
          duration: phases.approach.durationMs / 1000,
          delay: phases.approach.delayMs / 1000,
          ease: "easeIn",
        },
      });

      page.renderer.clockFastForward(
        phases.approach.durationMs + phases.approach.delayMs,
      );
      settle(page);

      // The plunge retargets from the frame on screen rather than replaying.
      const landing = byTestId(page.renderer, "gravity-star-0");
      expect(landing.id).toBe(born.id);
      expect(landing.customProps?.motion).toMatchObject({
        initial: false,
        animate: {
          left: phases.plunge.left,
          top: phases.plunge.top,
          opacity: 0,
        },
        transition: { duration: phases.plunge.durationMs / 1000 },
      });
    } finally {
      page.unmount();
    }
  });

  it("rebirths a landed star on the box's edge", () => {
    const { page } = mountFrozen(<Field />);
    try {
      const spec = specAt(fieldIn(page), 0);
      const phases = gravityPhases(spec);
      const born = byTestId(page.renderer, "gravity-star-0");

      page.renderer.clockFastForward(
        phases.approach.durationMs + phases.approach.delayMs,
      );
      settle(page);
      page.renderer.clockFastForward(phases.plunge.durationMs);
      settle(page);

      // A fresh star back on the edge, heading inward again.
      const next = byTestId(page.renderer, "gravity-star-0");
      expect(next.id).not.toBe(born.id);
      expect(next.style.left).toBeCloseTo(spec.x, 0);
      expect(next.style.top).toBeCloseTo(spec.y, 0);
      expect(next.style.opacity).toBe(0);
      expect(next.customProps?.motion).toMatchObject({
        animate: { opacity: phases.approach.opacity },
      });
    } finally {
      page.unmount();
    }
  });

  it("paints the same fall for the same seed and a different one otherwise", () => {
    const { page, show } = mountFrozen(<Field />);
    try {
      const seeded = Arr.map(fieldIn(page), (spec) => {
        const star = byTestId(page.renderer, `gravity-star-${spec.key}`);
        return `${star.style.left},${star.style.top}`;
      });

      show(<Field />);
      settle(page);
      settle(page);
      expect(
        Arr.map(fieldIn(page), (spec) => {
          const star = byTestId(page.renderer, `gravity-star-${spec.key}`);
          return `${star.style.left},${star.style.top}`;
        }),
      ).toEqual(seeded);

      show(
        <GravityStars
          testId="field"
          count={10}
          seed={4}
          fallMs={fallMs}
          style={{ width: 300, height: 200 }}
        />,
      );
      settle(page);
      settle(page);
      expect(
        Arr.map(fieldIn(page, { seed: 4 }), (spec) => {
          const star = byTestId(page.renderer, `gravity-star-${spec.key}`);
          return `${star.style.left},${star.style.top}`;
        }),
      ).not.toEqual(seeded);
    } finally {
      page.unmount();
    }
  });

  it("paints the field still on its approach frame under the reduced preference", () => {
    const { page } = mountFrozen(<Field reduced />);
    try {
      const spec = specAt(fieldIn(page), 1);
      const rest = gravityRest(spec);
      const star = byTestId(page.renderer, "gravity-star-1");

      // The field stays, the fall goes: no target, the approach frame painted.
      expect(star).not.toHaveProperty("customProps.motion");
      expect(star.style.left).toBeCloseTo(rest.left, 0);
      expect(star.style.top).toBeCloseTo(rest.top, 0);
      expect(star.style.opacity).toBe(spec.peak);
      expect(
        byTestId(page.renderer, "field").customProps?.motion,
      ).toMatchObject({
        transition: { duration: 0 },
      });

      page.renderer.clockFastForward(fallMs * 3);
      settle(page);
      expect(byTestId(page.renderer, "gravity-star-1").style.left).toBeCloseTo(
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
      expect(
        byTestId(page.renderer, "gravity-star-0").style.pointerEvents,
      ).toBe("none");
    } finally {
      page.unmount();
    }
  });

  it("paints no stars when the caller asks for none", () => {
    const { page } = mountFrozen(
      <GravityStars
        testId="field"
        count={0}
        style={{ width: 300, height: 200 }}
      />,
    );
    try {
      expect(page.renderer.findByTestId("field")).toBeDefined();
      expect(page.renderer.findByTestId("gravity-star-0")).toBeUndefined();
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
