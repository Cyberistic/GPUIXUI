/**
 * Glyph in the real GPUix renderer.
 *
 * The bugs these guard: a wall generated for a different box than the one
 * painted; a wall that reshuffles between mounts; a decorative wall of text that
 * leaks into the accessibility tree (the absence that deferred `glyph` in the
 * first place); a breath that runs one way and stops, because the runtime tweens
 * a target once; a reduced preference that keeps breathing; a field that
 * swallows the presses of the content in front of it; and a resize that keeps
 * painting the old wall.
 *
 * The motion clock is paused before the mount, so the first frame is the declared
 * initial frame rather than wherever the frame loop had got.
 */

import type { TestElement } from "@gpuix/react/testing";
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
import { glyphField } from "../glyph/logic.js";
import { Glyph } from "../glyph.js";
import { MotionProvider } from "../motion.js";

/** One element by test id, failing rather than casting. */
const byTestId = (
  renderer: ReturnType<typeof renderComponent>["renderer"],
  testId: string,
): TestElement => {
  const element = renderer.findByTestId(testId);
  if (element === undefined) {
    throw new Error(`behaviour: no element with testId "${testId}"`);
  }
  return element;
};

/** The wall's painted glyphs, in paint order. */
const glyphsOf = (
  page: ReturnType<typeof renderComponent>,
): ReadonlyArray<TestElement> =>
  Arr.filter(
    page.renderer.findByType("text"),
    (element) => element.testId?.startsWith("wall-cell-") ?? false,
  );

/** Mount under a paused motion clock, then let the box measurement land. */
const mountFrozen = (node: ReactNode): ReturnType<typeof renderComponent> => {
  const page = renderComponent(<div />);
  page.renderer.clockPause();
  page.rerender(node);
  page.renderer.flush();
  // The wall generates from its own layout, so the glyphs arrive on the frame
  // after the measurement.
  settle(page);
  settle(page);
  return page;
};

const WALL = { width: 400, height: 240 } as const;

describe("Glyph", () => {
  it("paints one glyph per painted cell, inside the measured box", () => {
    const page = mountFrozen(
      <Glyph
        testId="wall"
        seed={7}
        density={1}
        style={{ width: WALL.width, height: WALL.height }}
      />,
    );
    try {
      const field = glyphField({ ...WALL, seed: 7, density: 1 });
      const glyphs = glyphsOf(page);
      expect(glyphs).toHaveLength(field.cells.length);

      const box = requireBounds(page, "wall");
      expect({ width: box.width, height: box.height }).toEqual(WALL);
      Arr.forEach(glyphs, (glyph) => {
        const bounds = page.renderer.getElementBounds(glyph.id);
        expect(bounds).not.toBeNull();
        expect(bounds?.x ?? -1).toBeGreaterThanOrEqual(box.x);
        expect(bounds?.y ?? -1).toBeGreaterThanOrEqual(box.y);
        expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(
          box.x + box.width,
        );
        expect((bounds?.y ?? 0) + (bounds?.height ?? 0)).toBeLessThanOrEqual(
          box.y + box.height,
        );
      });
    } finally {
      page.unmount();
    }
  });

  it("paints the same wall for the same seed and another for a new seed", () => {
    const page = mountFrozen(
      <Glyph
        testId="wall"
        seed={7}
        style={{ width: WALL.width, height: WALL.height }}
      />,
    );
    try {
      const first = page.renderer.getPaintedText();
      expect(first.length).toBeGreaterThan(1);

      page.rerender(
        <Glyph
          testId="wall"
          seed={7}
          style={{ width: WALL.width, height: WALL.height }}
        />,
      );
      settle(page);
      expect(page.renderer.getPaintedText()).toEqual(first);

      page.rerender(
        <Glyph
          testId="wall"
          seed={8}
          style={{ width: WALL.width, height: WALL.height }}
        />,
      );
      settle(page);
      expect(page.renderer.getPaintedText()).not.toEqual(first);
    } finally {
      page.unmount();
    }
  });

  it("publishes no accessibility node and takes no pointer input", () => {
    const page = mountFrozen(
      <Glyph
        testId="wall"
        density={1}
        style={{ width: WALL.width, height: WALL.height }}
      />,
    );
    try {
      // The window itself is the only node: a glyph is `role="presentation"`,
      // which the runtime maps to no node at all, so a wall of characters is
      // not read aloud.
      expect(Arr.map(a11yNodes(page.renderer), (node) => node.role)).toEqual([
        "window",
      ]);
      const glyphs = glyphsOf(page);
      expect(glyphs.length).toBeGreaterThan(1);
      Arr.forEach(glyphs, (glyph) => {
        expect(glyph.style.pointerEvents).toBe("none");
      });
      expect(byTestId(page.renderer, "wall").style.overflow).toBe("hidden");
    } finally {
      page.unmount();
    }
  });

  it("breathes the wall and turns around when a leg completes", () => {
    const page = mountFrozen(
      <Glyph
        testId="wall"
        style={{ width: WALL.width, height: WALL.height }}
      />,
    );
    try {
      const breath = byTestId(page.renderer, "wall-breath");
      expect(breath.customProps?.motion).toMatchObject({
        initial: { opacity: patternDim },
        animate: { opacity: 1 },
        transition: { duration: patternBreatheMs / 1000, ease: "easeInOut" },
      });

      page.renderer.clockFastForward(patternBreatheMs);
      settle(page);
      expect(
        byTestId(page.renderer, "wall-breath").customProps?.motion,
      ).toMatchObject({ animate: { opacity: patternDim } });

      page.renderer.clockFastForward(patternBreatheMs);
      settle(page);
      expect(
        byTestId(page.renderer, "wall-breath").customProps?.motion,
      ).toMatchObject({ animate: { opacity: 1 } });
    } finally {
      page.unmount();
    }
  });

  it("paints the wall still and full under the reduced preference", () => {
    const page = mountFrozen(
      <MotionProvider preference="reduced">
        <Glyph
          testId="wall"
          style={{ width: WALL.width, height: WALL.height }}
        />
      </MotionProvider>,
    );
    try {
      expect(page.renderer.findByTestId("wall-breath")).toBeUndefined();
      expect(glyphsOf(page).length).toBeGreaterThan(1);
      // The wall is still painted — the preference removes the journey, not the
      // field — and its entrance is an instant assignment.
      expect(byTestId(page.renderer, "wall").customProps?.motion).toMatchObject(
        {
          transition: { duration: 0 },
        },
      );
    } finally {
      page.unmount();
    }
  });

  it("paints its content above the wall and lets a press through", () => {
    const onClick = vi.fn();
    const page = mountFrozen(
      <Glyph
        testId="wall"
        density={1}
        style={{ width: WALL.width, height: WALL.height }}
      >
        <div testId="content" onClick={onClick} style={{ height: 80 }}>
          Content
        </div>
      </Glyph>,
    );
    try {
      const wall = byTestId(page.renderer, "wall");
      const layer = byTestId(page.renderer, "wall-breath");
      const content = byTestId(page.renderer, "content");

      // Paint order is tree order, so the wall is behind the content.
      expect(wall.children.indexOf(layer.id)).toBeLessThan(
        wall.children.indexOf(content.id),
      );

      clickCentreOf(page, "content");
      expect(onClick).toHaveBeenCalledTimes(1);
    } finally {
      page.unmount();
    }
  });

  it("lays the wall out again for a resized box", () => {
    const page = mountFrozen(
      <Glyph
        testId="wall"
        density={1}
        style={{ width: WALL.width, height: WALL.height }}
      />,
    );
    try {
      const wide = glyphsOf(page).length;
      page.rerender(
        <Glyph testId="wall" density={1} style={{ width: 200, height: 120 }} />,
      );
      settle(page);
      settle(page);
      expect(glyphsOf(page).length).toBeLessThan(wide);
      Arr.forEach(glyphsOf(page), (glyph) => {
        const bounds = page.renderer.getElementBounds(glyph.id);
        expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(
          201,
        );
        expect((bounds?.y ?? 0) + (bounds?.height ?? 0)).toBeLessThanOrEqual(
          121,
        );
      });
    } finally {
      page.unmount();
    }
  });
});
