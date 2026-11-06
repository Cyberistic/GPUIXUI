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
import { Stars } from "../stars.js";
import {
  starAt,
  starField,
  starMaxSize,
  starMinSize,
  type StarFieldInput,
  type StarSpec,
} from "../stars/logic.js";

const twinkleMs = 2_000;

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
  const star = requireBounds(page, `star-${index}`);
  return { x: star.x - field.x, y: star.y - field.y };
};

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

      expect(byTestId(page.renderer, "star-0").style.opacity).toBe(spec.dim);
      expectTarget(page, 0, starAt(spec, 1));

      page.renderer.clockFastForward(spec.durationMs + spec.delayMs);
      settle(page);
      expectTarget(page, 0, starAt(spec, -1));

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
