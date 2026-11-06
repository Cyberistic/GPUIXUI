import type { TestElement, TestRoot } from "@gpuix/react/testing";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import {
  a11yNodes,
  renderComponent,
} from "@gpuixui/components/authoring/testing";
import { MotionProvider } from "@gpuixui/components/motion";
import { SplittingText } from "../splitting-text.js";

const units = (renderer: TestRoot["renderer"]): ReadonlyArray<TestElement> =>
  renderer.findByType("text").filter((element) => element.text === null);

const painted = (renderer: TestRoot["renderer"], glue = ""): string =>
  renderer.getAllText().join(glue);

const unitAt = (renderer: TestRoot["renderer"], index: number): TestElement => {
  const unit = units(renderer)[index];
  if (unit === undefined) {
    throw new Error(`behaviour: no unit at ${index}`);
  }
  return unit;
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

const yOf = (renderer: TestRoot["renderer"], element: TestElement): number => {
  const bounds = renderer.getElementBounds(element.id);
  if (bounds === null) {
    throw new Error("behaviour: the unit painted no box");
  }
  return bounds.y;
};

const riseOf = (
  renderer: TestRoot["renderer"],
  element: TestElement,
  container: TestElement,
): number => yOf(renderer, element) - yOf(renderer, container);

const mountFrozen = (node: ReactNode) => {
  const page = renderComponent(<div />);
  page.renderer.clockPause();
  const show = (next: ReactNode): void => {
    page.rerender(next);
    page.renderer.flush();
  };
  show(node);
  return { page, show };
};

describe("SplittingText", () => {
  it("paints every word of the phrase, in reading order on one line", () => {
    const { page } = mountFrozen(
      <SplittingText testId="split" text="Ship it today" />,
    );
    try {
      expect(painted(page.renderer, " ")).toBe("Ship it today");
      expect(page.renderer.getAllText()).toEqual(["Ship", "it", "today"]);
      expect(yOf(page.renderer, unitAt(page.renderer, 1))).toBe(
        yOf(page.renderer, unitAt(page.renderer, 0)),
      );
    } finally {
      page.unmount();
    }
  });

  it("starts each unit above its resting place by the offset, then rises it", () => {
    const { page } = mountFrozen(
      <SplittingText testId="split" text="Ship it" offset={12} />,
    );
    try {
      const container = byTestId(page.renderer, "split");
      const first = unitAt(page.renderer, 0);
      const entering = riseOf(page.renderer, first, container);

      page.renderer.clockFastForward(400);
      page.renderer.flush();
      const resting = riseOf(page.renderer, first, container);

      expect(entering).toBeCloseTo(12, 1);
      expect(resting).toBeCloseTo(0, 1);
    } finally {
      page.unmount();
    }
  });

  it("staggers the units by the step, in seconds the runtime reads", () => {
    const { page } = mountFrozen(
      <SplittingText text="Ship it today" stepMs={40} />,
    );
    try {
      const motions = units(page.renderer).map(
        (unit) => unit.customProps?.motion,
      );

      expect(motions[0]).not.toHaveProperty("transition.delay");
      expect(motions[1]).toMatchObject({ transition: { delay: 0.04 } });
      expect(motions[2]).toMatchObject({ transition: { delay: 0.08 } });
    } finally {
      page.unmount();
    }
  });

  it("replays the unit whose text changed, and only that unit", () => {
    const { page, show } = mountFrozen(<SplittingText text="Ship it today" />);
    try {
      const ship = unitAt(page.renderer, 0).id;
      const replaced = unitAt(page.renderer, 1).id;
      const today = unitAt(page.renderer, 2).id;

      show(<SplittingText text="Ship now today" />);

      expect(unitAt(page.renderer, 0).id).toBe(ship);
      expect(unitAt(page.renderer, 2).id).toBe(today);
      expect(unitAt(page.renderer, 1).id).not.toBe(replaced);
    } finally {
      page.unmount();
    }
  });

  it("paints the resting frame at once under the reduced preference", () => {
    const { page } = mountFrozen(
      <MotionProvider preference="reduced">
        <SplittingText testId="split" text="Ship it" offset={12} />
      </MotionProvider>,
    );
    try {
      const reduced = unitAt(page.renderer, 1).customProps?.motion;
      expect(reduced).toMatchObject({ transition: { duration: 0 } });
      expect(reduced).not.toHaveProperty("transition.delay");
      expect(
        riseOf(
          page.renderer,
          unitAt(page.renderer, 0),
          byTestId(page.renderer, "split"),
        ),
      ).toBeCloseTo(0, 1);
    } finally {
      page.unmount();
    }
  });

  it("puts each explicit line in its own row", () => {
    const { page } = mountFrozen(<SplittingText text={"Ship it\ntoday"} />);
    try {
      expect(page.renderer.getAllText()).toEqual(["Ship", "it", "today"]);
      expect(yOf(page.renderer, unitAt(page.renderer, 2))).toBeGreaterThan(
        yOf(page.renderer, unitAt(page.renderer, 0)),
      );
    } finally {
      page.unmount();
    }
  });

  it("splits characters by code point and keeps the word gap", () => {
    const { page } = mountFrozen(
      <SplittingText text="Hi 🖥 now" split="characters" />,
    );
    try {
      expect(painted(page.renderer)).toBe("Hi\u00A0🖥\u00A0now");
      expect(a11yNodes(page.renderer).map((node) => node.name)).toContain("🖥");
    } finally {
      page.unmount();
    }
  });

  it("paints no units for a stored phrase that was not text", () => {
    const { page } = mountFrozen(
      <SplittingText testId="split" text={null as unknown as string} />,
    );
    try {
      expect(page.renderer.findByTestId("split")).toBeDefined();
      expect(painted(page.renderer)).toBe("");
      expect(units(page.renderer)).toEqual([]);
    } finally {
      page.unmount();
    }
  });
});
