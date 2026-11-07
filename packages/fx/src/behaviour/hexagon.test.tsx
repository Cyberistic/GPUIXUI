import type { TestElement, TestRoot } from "@gpuix/react/testing";
import * as Arr from "effect/Array";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { Hexagon } from "../hexagon.js";
import {
  a11yNodes,
  clickCentreOf,
  requireBounds,
  settle,
  renderComponent,
} from "@gpuixui/components/authoring/testing";
import { patternBreatheMs, patternDim } from "@gpuixui/components/authoring";
import { MotionProvider } from "@gpuixui/components/motion";

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

const sourceOf = (page: ReturnType<typeof renderComponent>): string =>
  String(byTestId(page.renderer, "field-lines").customProps?.source ?? "");

const mountFrozen = (node: ReactNode): ReturnType<typeof renderComponent> => {
  const page = renderComponent(<div />);
  page.renderer.clockPause();
  page.rerender(node);
  page.renderer.flush();

  settle(page);
  settle(page);
  return page;
};

const FIELD = { width: 400, height: 240 } as const;

describe("Hexagon", () => {
  it("paints its grid in a view box the size of the measured box", () => {
    const page = mountFrozen(
      <Hexagon
        testId="field"
        style={{ width: FIELD.width, height: FIELD.height }}
      />,
    );
    try {
      const box = requireBounds(page, "field");
      expect({ width: box.width, height: box.height }).toEqual(FIELD);

      const source = sourceOf(page);
      expect(source).toContain('viewBox="0 0 400 240"');
      expect(source.match(/<path /g)).toHaveLength(1);
      expect(source.split("Z").length - 1).toBeGreaterThan(1);
      expect(byTestId(page.renderer, "field-lines").style.width).toBe(400);
    } finally {
      page.unmount();
    }
  });

  it("breathes the line art and turns around when a leg completes", () => {
    const page = mountFrozen(
      <Hexagon
        testId="field"
        style={{ width: FIELD.width, height: FIELD.height }}
      />,
    );
    try {
      const breath = byTestId(page.renderer, "field-breath");
      expect(breath.customProps?.motion).toMatchObject({
        initial: { opacity: patternDim },
        animate: { opacity: 1 },
        transition: { duration: patternBreatheMs / 1000, ease: "easeInOut" },
      });

      page.renderer.clockFastForward(patternBreatheMs);
      settle(page);
      expect(
        byTestId(page.renderer, "field-breath").customProps?.motion,
      ).toMatchObject({ animate: { opacity: patternDim } });

      page.renderer.clockFastForward(patternBreatheMs);
      settle(page);
      expect(
        byTestId(page.renderer, "field-breath").customProps?.motion,
      ).toMatchObject({ animate: { opacity: 1 } });
    } finally {
      page.unmount();
    }
  });

  it("paints the grid still and full under the reduced preference", () => {
    const page = mountFrozen(
      <MotionProvider preference="reduced">
        <Hexagon
          testId="field"
          style={{ width: FIELD.width, height: FIELD.height }}
        />
      </MotionProvider>,
    );
    try {
      expect(page.renderer.findByTestId("field-breath")).toBeUndefined();
      const lines = byTestId(page.renderer, "field-lines");
      expect(lines.customProps?.motion).toBeUndefined();
      expect(lines.style.opacity).toBe(1);
      expect(sourceOf(page)).toContain("<path");
    } finally {
      page.unmount();
    }
  });

  it("publishes no accessibility node and takes no pointer input", () => {
    const page = mountFrozen(
      <Hexagon
        testId="field"
        style={{ width: FIELD.width, height: FIELD.height }}
      />,
    );
    try {
      expect(Arr.map(a11yNodes(page.renderer), (node) => node.role)).toEqual([
        "window",
      ]);
      expect(byTestId(page.renderer, "field-lines").style.pointerEvents).toBe(
        "none",
      );
      expect(byTestId(page.renderer, "field-breath").style.pointerEvents).toBe(
        "none",
      );
    } finally {
      page.unmount();
    }
  });

  it("paints its content above the grid and lets a press through", () => {
    const onClick = vi.fn();
    const page = mountFrozen(
      <Hexagon
        testId="field"
        style={{ width: FIELD.width, height: FIELD.height }}
      >
        <div testId="content" onClick={onClick} style={{ height: 80 }}>
          Content
        </div>
      </Hexagon>,
    );
    try {
      const field = byTestId(page.renderer, "field");
      const layer = byTestId(page.renderer, "field-breath");
      const content = byTestId(page.renderer, "content");

      expect(field.children.indexOf(layer.id)).toBeLessThan(
        field.children.indexOf(content.id),
      );
      expect(layer.style.pointerEvents).toBe("none");

      const layerBox = requireBounds(page, "field-breath");
      const contentBox = requireBounds(page, "content");
      expect(layerBox.x).toBeLessThanOrEqual(contentBox.x);
      expect(layerBox.y).toBeLessThanOrEqual(contentBox.y);
      expect(layerBox.x + layerBox.width).toBeGreaterThanOrEqual(
        contentBox.x + contentBox.width,
      );
      expect(layerBox.y + layerBox.height).toBeGreaterThanOrEqual(
        contentBox.y + contentBox.height,
      );

      clickCentreOf(page, "content");
      expect(onClick).toHaveBeenCalledTimes(1);
    } finally {
      page.unmount();
    }
  });

  it("regenerates the grid for a resized box", () => {
    const page = mountFrozen(
      <Hexagon
        testId="field"
        style={{ width: FIELD.width, height: FIELD.height }}
      />,
    );
    try {
      expect(sourceOf(page)).toContain('viewBox="0 0 400 240"');
      page.rerender(
        <Hexagon testId="field" style={{ width: 300, height: 200 }} />,
      );
      settle(page);
      settle(page);
      expect(sourceOf(page)).toContain('viewBox="0 0 300 200"');
    } finally {
      page.unmount();
    }
  });
});
