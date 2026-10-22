/**
 * MotionGrid in the real GPUix renderer.
 *
 * The bugs these guard: a cell placed by flow layout, so a reorder paints it in
 * its new slot in the frame the array changes (nothing to tween); a cell that is
 * keyed by position, so reordering remounts the row and every cell replays its
 * entrance instead of travelling; a frame sized by the *current* arrangement, so
 * the box jumps a row ahead of the cells that are still moving; a reorder that
 * moves cells but leaves the frame's height behind; a reduced-motion reader who
 * still watches a tween; and a cell whose absolutely positioned content stops
 * receiving presses at the box it is painted in.
 *
 * The motion clock is paused before a read, so a mid-travel claim is the frame
 * named rather than wherever real time had got.
 */

import type { TestElement, TestRoot } from "@gpuix/react/testing";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { nodesWithRole } from "../internal/a11y.js";
import {
  clickCentreOf,
  requireBounds,
  settle,
} from "../internal/interaction.js";
import {
  renderComponent,
  type ComponentTestRoot,
} from "../internal/test-root.js";
import { MotionGrid, type MotionGridItem } from "../motion-grid.js";
import { MotionProvider } from "../motion.js";

/** The suite's grid is 3 × 100 px wide, 80 px a row, with 10 px gaps. */
const grid = {
  columns: 3,
  cellWidth: 100,
  rowHeight: 80,
  gap: 10,
} as const;

/** The frame a full first row reserves, and a two-row frame under the suite. */
const FRAME_WIDTH = 320;
const ONE_ROW = 80;
const TWO_ROWS = 170;

/** A cell body, so a press can be measured where the cell is painted. */
const body = (id: string): ReactNode => (
  <div testId={`body-${id}`} style={{ width: "100%", height: "100%" }} />
);

/** Cells for the given ids, in that order. */
const cells = (...ids: ReadonlyArray<string>): ReadonlyArray<MotionGridItem> =>
  ids.map((id) => ({ id, content: body(id) }));

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

/**
 * Mount a grid and run its entrance to rest.
 *
 * The clock is paused first, so the frame it settles on is exactly the house
 * level rather than a frame the paint loop happened to reach.
 */
const mount = (node: ReactNode): ComponentTestRoot => {
  const page = renderComponent(node);
  page.renderer.clockPause();
  page.renderer.clockFastForward(1_000);
  settle(page);
  return page;
};

/** Render a new arrangement and paint the frame it asks for. */
const show = (page: ComponentTestRoot, node: ReactNode): void => {
  page.rerender(node);
  settle(page);
};

/** Where a cell is painted, as its left/top inside the window. */
const at = (page: ComponentTestRoot, id: string) => {
  const box = requireBounds(page, `motion-grid-cell-${id}`);
  return { x: box.x, y: box.y };
};

describe("MotionGrid", () => {
  it("places every cell in its slot and sizes the frame to the columns", () => {
    const page = mount(
      <MotionGrid
        testId="grid"
        items={cells("a", "b", "c", "d", "e")}
        {...grid}
      />,
    );
    try {
      const frame = requireBounds(page, "grid");
      expect(frame.width).toBe(FRAME_WIDTH);
      expect(frame.height).toBe(TWO_ROWS);

      const origin = at(page, "a");
      expect(at(page, "b")).toEqual({ x: origin.x + 110, y: origin.y });
      expect(at(page, "c")).toEqual({ x: origin.x + 220, y: origin.y });
      expect(at(page, "d")).toEqual({ x: origin.x, y: origin.y + 90 });
      expect(at(page, "e")).toEqual({ x: origin.x + 110, y: origin.y + 90 });

      const cell = requireBounds(page, "motion-grid-cell-a");
      expect({ width: cell.width, height: cell.height }).toEqual({
        width: 100,
        height: 80,
      });
    } finally {
      page.unmount();
    }
  });

  it("travels a cell to its new slot when the order changes", () => {
    const page = mount(
      <MotionGrid testId="grid" items={cells("a", "b", "c")} {...grid} />,
    );
    try {
      const before = at(page, "b");
      // `c` keeps its slot, so it is the control: it must not move because a
      // cell before it did.
      const still = at(page, "c");

      show(
        page,
        <MotionGrid testId="grid" items={cells("b", "a", "c")} {...grid} />,
      );
      page.renderer.clockFastForward(100);
      settle(page);

      const moving = at(page, "b");
      expect(moving.x).toBeGreaterThan(0);
      expect(moving.x).toBeLessThan(before.x);
      expect(moving.x).not.toBe(before.x);
      expect(at(page, "c")).toEqual(still);

      page.renderer.clockFastForward(1_000);
      settle(page);
      // The swap is complete: `b` took the first slot and `a` the second.
      expect(at(page, "b").x).toBe(0);
      expect(at(page, "a").x).toBe(110);
    } finally {
      page.unmount();
    }
  });

  it("closes the gap a removed cell leaves without remounting the rest", () => {
    const page = mount(
      <MotionGrid testId="grid" items={cells("a", "b", "c")} {...grid} />,
    );
    try {
      const b = byTestId(page.renderer, "motion-grid-cell-b");
      const c = byTestId(page.renderer, "motion-grid-cell-c");
      const from = at(page, "b");

      show(
        page,
        <MotionGrid testId="grid" items={cells("b", "c")} {...grid} />,
      );
      page.renderer.clockFastForward(100);
      settle(page);

      const mid = at(page, "b");
      expect(mid.x).toBeLessThan(from.x);
      expect(mid.x).toBeGreaterThan(0);
      // A cell keyed by its id keeps its element: removing `a` travels the two
      // survivors rather than remounting them at their new slots.
      expect(byTestId(page.renderer, "motion-grid-cell-b").id).toBe(b.id);
      expect(byTestId(page.renderer, "motion-grid-cell-c").id).toBe(c.id);

      page.renderer.clockFastForward(1_000);
      settle(page);
      expect(at(page, "b").x).toBe(0);
      expect(at(page, "c").x).toBe(110);
    } finally {
      page.unmount();
    }
  });

  it("fades a new cell in at its slot without replaying the ones on screen", () => {
    const page = mount(
      <MotionGrid testId="grid" items={cells("a", "b")} {...grid} />,
    );
    try {
      const a = byTestId(page.renderer, "motion-grid-cell-a");
      const b = byTestId(page.renderer, "motion-grid-cell-b");

      show(
        page,
        <MotionGrid testId="grid" items={cells("a", "b", "c")} {...grid} />,
      );

      expect(byTestId(page.renderer, "motion-grid-cell-a").id).toBe(a.id);
      expect(byTestId(page.renderer, "motion-grid-cell-b").id).toBe(b.id);
      // The arriving cell is the one that declares an entrance...
      expect(
        byTestId(page.renderer, "motion-grid-cell-c").customProps?.motion,
      ).toMatchObject({ initial: { opacity: 0 } });
      // ...and it starts at the slot it is arriving into, not off-stage.
      expect(at(page, "c").x).toBe(220);
    } finally {
      page.unmount();
    }
  });

  it("grows the frame with the row it gains instead of jumping ahead", () => {
    const page = mount(
      <MotionGrid testId="grid" items={cells("a", "b", "c")} {...grid} />,
    );
    try {
      expect(requireBounds(page, "grid").height).toBe(ONE_ROW);

      show(
        page,
        <MotionGrid
          testId="grid"
          items={cells("a", "b", "c", "d")}
          {...grid}
        />,
      );
      page.renderer.clockFastForward(100);
      settle(page);

      const growing = requireBounds(page, "grid").height;
      expect(growing).toBeGreaterThan(ONE_ROW);
      expect(growing).toBeLessThan(TWO_ROWS);

      page.renderer.clockFastForward(1_000);
      settle(page);
      expect(requireBounds(page, "grid").height).toBe(TWO_ROWS);
      expect(at(page, "d").y).toBe(at(page, "a").y + 90);
    } finally {
      page.unmount();
    }
  });

  it("keeps the frame's box while two cells cross between slots", () => {
    const page = mount(
      <MotionGrid testId="grid" items={cells("a", "b", "c")} {...grid} />,
    );
    try {
      const frame = requireBounds(page, "grid");
      const sizes = ["a", "b", "c"].map((id) => {
        const box = requireBounds(page, `motion-grid-cell-${id}`);
        return { width: box.width, height: box.height };
      });

      show(
        page,
        <MotionGrid testId="grid" items={cells("c", "b", "a")} {...grid} />,
      );
      page.renderer.clockFastForward(100);
      settle(page);

      // The frame is arithmetic over the cell size, not over where the cells
      // happen to be this frame.
      expect(requireBounds(page, "grid")).toEqual(frame);
      expect(
        ["a", "b", "c"].map((id) => {
          const box = requireBounds(page, `motion-grid-cell-${id}`);
          return { width: box.width, height: box.height };
        }),
      ).toEqual(sizes);
    } finally {
      page.unmount();
    }
  });

  it("paints the reordered slots in the frame the order changes when reduced", () => {
    const page = renderComponent(
      <MotionProvider preference="reduced">
        <MotionGrid testId="grid" items={cells("a", "b", "c")} {...grid} />
      </MotionProvider>,
    );
    try {
      page.renderer.clockPause();
      page.renderer.clockFastForward(1_000);
      settle(page);

      show(
        page,
        <MotionProvider preference="reduced">
          <MotionGrid testId="grid" items={cells("b", "a", "c")} {...grid} />
        </MotionProvider>,
      );

      // No clock advance: a reduced reorder is an assignment, and a mounted cell
      // paints opaque.
      expect(at(page, "b").x).toBe(0);
      const motion = byTestId(page.renderer, "motion-grid-cell-b").customProps
        ?.motion;
      expect(motion).toMatchObject({
        initial: false,
        transition: { duration: 0 },
      });
    } finally {
      page.unmount();
    }
  });

  it("keeps a cell's content pressable where the cell is painted", () => {
    const pressed = vi.fn();
    const page = mount(
      <MotionGrid
        testId="grid"
        items={[
          { id: "a", content: body("a") },
          { id: "b", content: body("b") },
          {
            id: "c",
            content: (
              <div
                testId="action"
                onClick={pressed}
                style={{ width: "100%", height: "100%" }}
              />
            ),
          },
        ]}
        {...grid}
      />,
    );
    try {
      clickCentreOf(page, "action");
      settle(page);

      expect(pressed).toHaveBeenCalledTimes(1);
    } finally {
      page.unmount();
    }
  });

  it("names the frame only when the caller names it", () => {
    const page = mount(
      <MotionGrid
        testId="grid"
        items={cells("a", "b")}
        label="Pinned tools"
        {...grid}
      />,
    );
    try {
      expect(
        nodesWithRole(page.renderer, "group").map((node) => node.name),
      ).toEqual(["Pinned tools"]);
    } finally {
      page.unmount();
    }

    const unnamed = mount(
      <MotionGrid testId="grid" items={cells("a", "b")} {...grid} />,
    );
    try {
      expect(nodesWithRole(unnamed.renderer, "group")).toEqual([]);
    } finally {
      unnamed.unmount();
    }
  });
});
