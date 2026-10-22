/**
 * SlidingNumber in the real GPUix renderer.
 *
 * The bugs these guard: a column painted at the wrong digit; a value change that
 * rolls every column instead of the one that changed; a column that appears
 * already grown and rolls up from zero; a point painted where the value has no
 * fraction; affixes painted on the wrong side; a reduced-motion reader who still
 * gets a tween; ten stacked glyphs published to the accessibility tree where the
 * value should be; and a value no column can paint, painted as blanks.
 *
 * The motion clock is paused around a change, so a roll is read at the fraction
 * it declares rather than wherever the frame loop had got.
 */

import type { ComponentTestRoot } from "../internal/test-root.js";
import { describe, expect, it } from "vitest";
import { a11yNodes } from "../internal/a11y.js";
import { requireBounds, settle } from "../internal/interaction.js";
import { darkTheme, textStyle } from "../internal/theme.js";
import { renderComponent } from "../internal/test-root.js";
import { MotionProvider } from "../motion.js";
import { SlidingNumber, type SlidingNumberProps } from "../sliding-number.js";

/** One line of the theme's body role: the height of a column's frame. */
const LINE = textStyle(darkTheme, "body").lineHeight;

/** Mount a value, with the props a case needs. */
const render = (props: Partial<SlidingNumberProps> = {}) => {
  const page = renderComponent(
    <SlidingNumber testId="number" value={42} {...props} />,
  );
  settle(page);
  return page;
};

/** How far a column's plate is raised above its column's top. */
const riseOf = (page: ComponentTestRoot, key: string): number =>
  requireBounds(page, `cell-${key}-plate`).y -
  requireBounds(page, `cell-${key}`).y;

/** The painted runs, in paint order. */
const painted = (page: ComponentTestRoot): ReadonlyArray<string> =>
  page.renderer.getAllText();

describe("SlidingNumber", () => {
  it("paints each digit as the tenth cell of its own column", () => {
    const page = render({ value: 42 });
    try {
      expect(riseOf(page, "i1")).toBeCloseTo(-4 * LINE, 5);
      expect(riseOf(page, "i0")).toBeCloseTo(-2 * LINE, 5);
      expect(painted(page)).toEqual([..."0123456789", ..."0123456789"]);
    } finally {
      page.unmount();
    }
  });

  it("shows exactly one digit per column, the one the value names", () => {
    const page = render({ value: 42 });
    try {
      const hosts = page.renderer
        .findByType("text")
        .filter((element) => element.text === null);
      const runs = painted(page);
      const visibleIn = (key: string): ReadonlyArray<string> => {
        const column = requireBounds(page, `cell-${key}`);
        return hosts.flatMap((host, index) => {
          const box = page.renderer.getElementBounds(host.id);
          if (box === null) return [];
          const inside =
            box.x >= column.x - 0.5 &&
            box.x + box.width <= column.x + column.width + 0.5 &&
            box.y >= column.y - 0.5 &&
            box.y + box.height <= column.y + column.height + 0.5;
          return inside ? [runs[index] ?? "?"] : [];
        });
      };

      expect(visibleIn("i1")).toEqual(["4"]);
      expect(visibleIn("i0")).toEqual(["2"]);
    } finally {
      page.unmount();
    }
  });

  it("rolls only the column whose digit changed", () => {
    const page = render({ value: 42 });
    try {
      page.renderer.clockPause();
      page.rerender(<SlidingNumber testId="number" value={43} />);
      settle(page);
      page.renderer.clockFastForward(100);
      settle(page);

      const ones = riseOf(page, "i0");
      expect(ones).toBeLessThan(-2 * LINE);
      expect(ones).toBeGreaterThan(-3 * LINE);
      expect(riseOf(page, "i1")).toBeCloseTo(-4 * LINE, 5);
    } finally {
      page.unmount();
    }
  });

  it("paints a column that appears at its own digit, not grown from zero", () => {
    const page = render({ value: 9 });
    try {
      expect(riseOf(page, "i0")).toBeCloseTo(-9 * LINE, 5);
      page.renderer.clockPause();
      page.rerender(<SlidingNumber testId="number" value={10} />);
      settle(page);

      expect(riseOf(page, "i1")).toBeCloseTo(-1 * LINE, 5);
    } finally {
      page.unmount();
    }
  });

  it("paints the point and the fraction columns a value carries", () => {
    const page = render({ value: 3.5, decimals: 1 });
    try {
      expect(riseOf(page, "i0")).toBeCloseTo(-3 * LINE, 5);
      expect(riseOf(page, "f1")).toBeCloseTo(-5 * LINE, 5);
      expect(requireBounds(page, "cell-point").width).toBeGreaterThan(0);
      expect(painted(page).at(10)).toBe(".");
      expect(a11yNodes(page.renderer).map((node) => node.name)).toContain(
        "3.5",
      );
    } finally {
      page.unmount();
    }
  });

  it("paints a caller's affixes on the outside of the digits", () => {
    const page = render({ value: 42, prefix: "$", suffix: "/mo" });
    try {
      const runs = painted(page);
      expect(runs[0]).toBe("$");
      expect(runs.at(-1)).toBe("/mo");
    } finally {
      page.unmount();
    }
  });

  it("names the reading, not the ten digits a column stacks", () => {
    const page = render({ value: 42 });
    try {
      const nodes = a11yNodes(page.renderer).filter(
        (node) => node.role !== "window",
      );
      expect(nodes.map((node) => `${node.role}:${node.name}`)).toEqual([
        "status:42",
      ]);
    } finally {
      page.unmount();
    }
  });

  it("takes a caller's label for the reading", () => {
    const page = render({ value: 42, label: "Open pull requests" });
    try {
      expect(a11yNodes(page.renderer).map((node) => node.name)).toContain(
        "Open pull requests",
      );
    } finally {
      page.unmount();
    }
  });

  it("paints the new digit at once under the reduced preference", () => {
    const page = renderComponent(
      <MotionProvider preference="reduced">
        <SlidingNumber testId="number" value={42} />
      </MotionProvider>,
    );
    settle(page);
    try {
      page.renderer.clockPause();
      page.rerender(
        <MotionProvider preference="reduced">
          <SlidingNumber testId="number" value={47} />
        </MotionProvider>,
      );
      settle(page);

      expect(riseOf(page, "i0")).toBeCloseTo(-7 * LINE, 5);
    } finally {
      page.unmount();
    }
  });

  it("paints a value no column can paint as one run", () => {
    const page = render({ value: Number.NaN });
    try {
      expect(page.renderer.findByTestId("cell-i0")).toBeUndefined();
      expect(painted(page)).toEqual(["NaN"]);
      expect(a11yNodes(page.renderer).map((node) => node.name)).toContain(
        "NaN",
      );
    } finally {
      page.unmount();
    }
  });
});
