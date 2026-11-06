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
import {
  bubbleField,
  bubbleMaxSize,
  bubbleMinSize,
  type BubbleFieldInput,
  type BubbleSpec,
} from "../bubbles/logic.js";
import { Bubbles } from "../bubbles.js";
import { MotionProvider } from "@gpuixui/components/motion";

const riseMs = 2_000;

const fieldIn = (
  page: ReturnType<typeof renderComponent>,
  overrides: Partial<BubbleFieldInput> = {},
): ReadonlyArray<BubbleSpec> => {
  const box = requireBounds(page, "field");
  return bubbleField({
    width: box.width,
    height: box.height,
    count: 8,
    seed: 3,
    minSize: bubbleMinSize,
    maxSize: bubbleMaxSize,
    riseMs,
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

const specAt = (
  specs: ReadonlyArray<BubbleSpec>,
  index: number,
): BubbleSpec => {
  const spec = specs[index];
  if (spec === undefined) {
    throw new Error(`behaviour: no bubble at ${index}`);
  }
  return spec;
};

const Field = ({ reduced = false }: { readonly reduced?: boolean }) => (
  <MotionProvider preference={reduced ? "reduced" : "animated"}>
    <Bubbles
      testId="field"
      count={8}
      seed={3}
      riseMs={riseMs}
      style={{ width: 300, height: 200 }}
    />
  </MotionProvider>
);

describe("Bubbles", () => {
  it("lays its bubbles out along the box it measured", () => {
    const { page } = mountFrozen(<Field />);
    try {
      const specs = fieldIn(page);
      expect(Arr.length(specs)).toBe(8);

      Arr.forEach(specs, (spec, index) => {
        const bubble = byTestId(page.renderer, `bubble-${index}`);
        expect(bubble.style.left).toBeCloseTo(spec.x, 0);
        expect(bubble.style.width).toBe(spec.size);

        expect(bubble.style.top).toBe(requireBounds(page, "field").height);
      });
    } finally {
      page.unmount();
    }
  });

  it("hands each bubble a rise from below the box to above it", () => {
    const { page } = mountFrozen(<Field />);
    try {
      const spec = specAt(fieldIn(page), 0);
      const motion = byTestId(page.renderer, "bubble-0").customProps?.motion;

      expect(motion).toMatchObject({
        initial: { opacity: 0, top: requireBounds(page, "field").height },
        animate: { opacity: spec.peak, top: -spec.size },
        transition: {
          duration: spec.durationMs / 1000,
          delay: spec.delayMs / 1000,
        },
      });
    } finally {
      page.unmount();
    }
  });

  it("starts another lap when the rise completes, so the field never empties", () => {
    const { page } = mountFrozen(<Field />);
    try {
      const field = requireBounds(page, "field");
      const spec = specAt(fieldIn(page), 0);
      const firstLap = byTestId(page.renderer, "bubble-0");

      page.renderer.clockFastForward(spec.durationMs + spec.delayMs);
      settle(page);

      const bubble = byTestId(page.renderer, "bubble-0");
      expect(bubble.id).not.toBe(firstLap.id);
      expect(bubble.style.top).toBe(field.height);
      expect(bubble.style.opacity).toBe(0);
      expect(bubble.customProps?.motion).toMatchObject({
        animate: { top: -spec.size },
      });

      page.renderer.clockFastForward(spec.durationMs + spec.delayMs);
      settle(page);
      const thirdLap = byTestId(page.renderer, "bubble-0");
      expect(thirdLap.id).not.toBe(bubble.id);
      expect(thirdLap.style.top).toBe(field.height);
    } finally {
      page.unmount();
    }
  });

  it("paints the same field for the same seed and a different one otherwise", () => {
    const { page, show } = mountFrozen(<Field />);
    try {
      const seeded = Arr.map(
        fieldIn(page),
        (_, index) => byTestId(page.renderer, `bubble-${index}`).style.left,
      );

      show(<Field />);
      settle(page);
      settle(page);
      expect(
        Arr.map(
          fieldIn(page),
          (_, index) => byTestId(page.renderer, `bubble-${index}`).style.left,
        ),
      ).toEqual(seeded);

      show(
        <Bubbles
          testId="field"
          count={8}
          seed={4}
          riseMs={riseMs}
          style={{ width: 300, height: 200 }}
        />,
      );
      settle(page);
      settle(page);
      expect(
        Arr.map(
          fieldIn(page, { seed: 4 }),
          (_, index) => byTestId(page.renderer, `bubble-${index}`).style.left,
        ),
      ).not.toEqual(seeded);
    } finally {
      page.unmount();
    }
  });

  it("paints the field still at its resting places under the reduced preference", () => {
    const { page } = mountFrozen(<Field reduced />);
    try {
      const spec = specAt(fieldIn(page), 1);
      const bubble = byTestId(page.renderer, "bubble-1");

      expect(bubble).not.toHaveProperty("customProps.motion");

      expect(bubble.style.left).toBeCloseTo(spec.x, 0);
      expect(bubble.style.top).toBeCloseTo(spec.y, 0);
      expect(bubble.style.opacity).toBe(spec.peak);
      expect(
        byTestId(page.renderer, "field").customProps?.motion,
      ).toMatchObject({
        transition: { duration: 0 },
      });

      page.renderer.clockFastForward(riseMs * 3);
      settle(page);
      expect(byTestId(page.renderer, "bubble-1").style.top).toBeCloseTo(
        spec.y,
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
      expect(byTestId(page.renderer, "bubble-0").style.pointerEvents).toBe(
        "none",
      );
    } finally {
      page.unmount();
    }
  });

  it("paints no bubbles when the caller asks for none", () => {
    const { page } = mountFrozen(
      <Bubbles testId="field" count={0} style={{ width: 300, height: 200 }} />,
    );
    try {
      expect(page.renderer.findByTestId("field")).toBeDefined();
      expect(page.renderer.findByTestId("bubble-0")).toBeUndefined();
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
