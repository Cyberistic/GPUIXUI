import type { TestElement, TestRoot } from "@gpuix/react/testing";
import { motionLevels } from "@gpuixui/motion/timing";
import * as Arr from "effect/Array";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import {
  a11yNodes,
  requireBounds,
  settle,
  renderComponent,
} from "@gpuixui/components/authoring/testing";
import { MotionProvider } from "@gpuixui/components/motion";
import { Particles } from "../particles.js";
import {
  particleField,
  particleMaxSize,
  particleMinSize,
  particleTravel,
  type ParticleFieldInput,
  type ParticleSpec,
} from "../particles/logic.js";

const legMs = 2_000;

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

const mountFrozen = (node: ReactNode) => {
  const page = renderComponent(<div />);
  page.renderer.clockPause();
  const show = (next: ReactNode): void => {
    page.rerender(next);
    page.renderer.flush();
  };
  show(node);

  settle(page);
  settle(page);
  return { page, show };
};

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

      show(<Field />);
      settle(page);
      settle(page);
      expect(
        Arr.map(fieldIn(page), (_, index) => offsetOf(page, index)),
      ).toEqual(seeded);

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
      expect(Arr.map(a11yNodes(page.renderer), (node) => node.role)).toEqual([
        "window",
      ]);
      expect(byTestId(page.renderer, "field").style.pointerEvents).toBe("none");

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
