/**
 * Topography in the real GPUix renderer.
 *
 * The bugs these guard: a map generated for a different box than the one painted
 * (the view box would scale to the wrong size, or leak a centred square); a field
 * that generates nothing after its first layout; a breath that runs one way and
 * stops, because the runtime tweens a target once; a reduced preference that keeps
 * breathing; a decorative field that leaks into the accessibility tree or swallows
 * presses; and a resize that keeps painting the old map.
 *
 * The motion clock is paused before the mount, so the first frame is the declared
 * initial frame rather than wherever the frame loop had got. The markup is read
 * from the prop the component hands the runtime; the pixels it paints are the
 * `svg-pattern` probe's measurement.
 */

import type { TestElement, TestRoot } from "@gpuix/react/testing";
import * as Arr from "effect/Array";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { a11yNodes } from "../internal/a11y.js";
import {
  clickCentreOf,
  requireBounds,
  settle,
} from "../internal/interaction.js";
import { patternBreatheMs, patternDim } from "../internal/pattern-field.js";
import { renderComponent } from "../internal/test-root.js";
import { MotionProvider } from "../motion.js";
import { Topography } from "../topography.js";

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

/** The markup one field handed the runtime. */
const sourceOf = (page: ReturnType<typeof renderComponent>): string =>
  String(byTestId(page.renderer, "field-lines").customProps?.source ?? "");

/** Mount under a paused motion clock, then let the box measurement land. */
const mountFrozen = (node: ReactNode): ReturnType<typeof renderComponent> => {
  const page = renderComponent(<div />);
  page.renderer.clockPause();
  page.rerender(node);
  page.renderer.flush();
  // The field generates from its own layout, so the picture arrives on the
  // frame after the measurement.
  settle(page);
  settle(page);
  return page;
};

const FIELD = { width: 400, height: 240 } as const;

describe("Topography", () => {
  it("paints its map in a view box the size of the measured box", () => {
    const page = mountFrozen(
      <Topography
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
      expect(source.split("M ").length - 1).toBeGreaterThan(1);
      expect(byTestId(page.renderer, "field-lines").style.width).toBe(400);
    } finally {
      page.unmount();
    }
  });

  it("breathes the line art and turns around when a leg completes", () => {
    const page = mountFrozen(
      <Topography
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

  it("paints the map still and full under the reduced preference", () => {
    const page = mountFrozen(
      <MotionProvider preference="reduced">
        <Topography
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
      <Topography
        testId="field"
        style={{ width: FIELD.width, height: FIELD.height }}
      />,
    );
    try {
      // The window itself is the only node: the field adds no role and no name.
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

  it("paints its content above the map and lets a press through", () => {
    const onClick = vi.fn();
    const page = mountFrozen(
      <Topography
        testId="field"
        style={{ width: FIELD.width, height: FIELD.height }}
      >
        <div testId="content" onClick={onClick} style={{ height: 80 }}>
          Content
        </div>
      </Topography>,
    );
    try {
      const field = byTestId(page.renderer, "field");
      const layer = byTestId(page.renderer, "field-breath");
      const content = byTestId(page.renderer, "content");

      // Paint order is tree order, so the map is behind the content.
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

  it("regenerates the map for a resized box", () => {
    const page = mountFrozen(
      <Topography
        testId="field"
        style={{ width: FIELD.width, height: FIELD.height }}
      />,
    );
    try {
      expect(sourceOf(page)).toContain('viewBox="0 0 400 240"');
      page.rerender(
        <Topography testId="field" style={{ width: 300, height: 200 }} />,
      );
      settle(page);
      settle(page);
      expect(sourceOf(page)).toContain('viewBox="0 0 300 200"');
    } finally {
      page.unmount();
    }
  });
});
