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

const fallMs = 2_000;

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
