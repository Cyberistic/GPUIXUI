import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import {
  boxStyle,
  decideScroll,
  GRID_TRACK_MINS,
  gridStyle,
  resolveScroll,
  scrollLine,
  stackStyle,
  type ScrollMove,
} from "./layout.js";
import { testTheme } from "./testing/theme.fixture.js";

/**
 * Guards the geometry resolvers, because nothing else can.
 *
 * A wrong `gap` step or an inverted `direction` is a layout that is subtly off
 * on screen and perfectly valid to the compiler. With no runtime to render into
 * (plan 020 §3), the numeric contract asserted here is the only proof that a
 * Stack and a Box agree about direction, spacing and flex behaviour.
 */

describe("stackStyle", () => {
  it("maps the logical direction onto the runtime's flex value", () => {
    expect(stackStyle({ direction: "column" }, testTheme).flexDirection).toBe(
      "column",
    );
    expect(stackStyle({ direction: "row" }, testTheme).flexDirection).toBe(
      "row",
    );
  });

  it("takes the gap from the theme's spacing scale, not from a literal", () => {
    expect(stackStyle({ direction: "row", gap: "lg" }, testTheme).gap).toBe(
      testTheme.spacing.lg,
    );
    expect(stackStyle({ direction: "row" }, testTheme).gap).toBeUndefined();
  });

  it("translates align and justify words into flex values", () => {
    const style = stackStyle(
      { direction: "row", align: "end", justify: "between" },
      testTheme,
    );
    expect(style.alignItems).toBe("flex-end");
    expect(style.justifyContent).toBe("space-between");
  });

  it("grows, fills and wraps only when asked", () => {
    const plain = stackStyle({ direction: "row" }, testTheme);
    expect(plain.flexGrow).toBeUndefined();
    expect(plain.width).toBeUndefined();
    const asked = stackStyle(
      {
        direction: "row",
        grow: true,
        fullWidth: true,
        fullHeight: true,
        wrap: true,
      },
      testTheme,
    );
    expect(asked.flexGrow).toBe(1);
    expect(asked.width).toBe("100%");
    expect(asked.height).toBe("100%");
    expect(asked.flexWrap).toBe("wrap");
  });
});

describe("gridStyle", () => {
  it("uses the runtime's numeric tracks", () => {
    const style = gridStyle({ columns: 3, rows: 2, gap: "md" }, testTheme);
    expect(style.display).toBe("grid");
    expect(style.gridTemplateColumns).toBe(3);
    expect(style.gridTemplateRows).toBe(2);
    expect(style.gap).toBe(testTheme.spacing.md);
  });

  it("refuses a track count the runtime cannot draw", () => {
    expect(gridStyle({ columns: 0 }, testTheme).gridTemplateColumns).toBe(1);
    expect(gridStyle({ columns: 2.9 }, testTheme).gridTemplateColumns).toBe(2);
  });

  it("reads a count that is not a number as one track", () => {
    // The bug guarded (plan 371): `Math.max(1, NaN)` is NaN, so the grid asked
    // the runtime for `NaN` tracks.
    expect(
      gridStyle({ columns: Number.NaN }, testTheme).gridTemplateColumns,
    ).toBe(1);
    expect(
      gridStyle({ columns: Number.POSITIVE_INFINITY }, testTheme)
        .gridTemplateColumns,
    ).toBe(1);
    expect(gridStyle({ columns: -3 }, testTheme).gridTemplateColumns).toBe(1);
    expect(
      gridStyle({ columns: 2, rows: Number.NaN }, testTheme).gridTemplateRows,
    ).toBe(1);
  });

  it("leaves the track minimums to the runtime unless asked", () => {
    // The bug guarded (plan 376): the page said content-sized tracks were
    // impossible, so the component had no way to reach `gridColumnMin`. A plain
    // grid must stay exactly as it was — equal tracks.
    const plain = gridStyle({ columns: 2 }, testTheme);
    expect(plain.gridColumnMin).toBeUndefined();
    expect(plain.gridRowMin).toBeUndefined();
  });

  it.each(GRID_TRACK_MINS)(
    "mirrors the runtime's `%s` track minimum on each axis",
    (min) => {
      const columns = gridStyle({ columns: 2, columnMin: min }, testTheme);
      expect(columns.gridColumnMin).toBe(min);
      expect(columns.gridRowMin).toBeUndefined();
      const rows = gridStyle({ columns: 2, rows: 2, rowMin: min }, testTheme);
      expect(rows.gridRowMin).toBe(min);
      expect(rows.gridColumnMin).toBeUndefined();
    },
  );
});

describe("boxStyle", () => {
  it("keeps chrome from shrinking by default, and grows only on request", () => {
    const plain = boxStyle({ tone: "card" }, testTheme);
    expect(plain.flexShrink).toBe(0);
    expect(plain.flexGrow).toBeUndefined();
    expect(boxStyle({ tone: "card", grow: true }, testTheme).flexGrow).toBe(1);
    expect(boxStyle({ tone: "card", shrink: true }, testTheme).flexShrink).toBe(
      1,
    );
  });

  it("inherits the surface chrome it extends", () => {
    const style = boxStyle(
      { tone: "card", padding: "lg", radius: "md", border: true },
      testTheme,
    );
    expect(style.padding).toBe(testTheme.spacing.lg);
    expect(style.borderRadius).toBe(testTheme.radius.md);
    expect(style.borderColor).toBe(testTheme.colors.border);
    expect(style.borderWidth).toBe(testTheme.borderWidth.thin);
  });
});

const move = (
  key: string,
  axis: "vertical" | "horizontal" | "both",
): Option.Option<ScrollMove> => decideScroll(key, axis);

describe("decideScroll", () => {
  it("maps the keys a platform scroll region uses", () => {
    expect(move("down", "vertical")).toStrictEqual(
      Option.some({ axis: "vertical", direction: "line-forward" }),
    );
    expect(move("up", "vertical")).toStrictEqual(
      Option.some({ axis: "vertical", direction: "line-back" }),
    );
    expect(move("pagedown", "vertical")).toStrictEqual(
      Option.some({ axis: "vertical", direction: "page-forward" }),
    );
    expect(move("pageup", "vertical")).toStrictEqual(
      Option.some({ axis: "vertical", direction: "page-back" }),
    );
    expect(move("End", "vertical")).toStrictEqual(
      Option.some({ axis: "vertical", direction: "end" }),
    );
  });

  it("ignores keys the axis cannot scroll, and keys that are not scrolls", () => {
    expect(move("right", "vertical")).toStrictEqual(Option.none());
    expect(move("down", "horizontal")).toStrictEqual(Option.none());
    expect(move("enter", "both")).toStrictEqual(Option.none());
    expect(move("space", "both")).toStrictEqual(Option.none());
  });

  it("scrolls both axes on Home/End only when the area does", () => {
    expect(move("home", "vertical")).toStrictEqual(
      Option.some({ axis: "vertical", direction: "start" }),
    );
    expect(move("end", "horizontal")).toStrictEqual(
      Option.some({ axis: "horizontal", direction: "end" }),
    );
    expect(move("home", "both")).toStrictEqual(
      Option.some({ axis: "both", direction: "start" }),
    );
  });
});

describe("resolveScroll", () => {
  const geometry = {
    offset: { x: -20, y: -100 },
    viewport: { width: 200, height: 400 },
    line: 40,
  };

  it("moves one line, or one page less one line, and leaves the other axis", () => {
    expect(
      resolveScroll({ axis: "vertical", direction: "line-forward" }, geometry),
    ).toStrictEqual({ x: -20, y: -140 });
    expect(
      resolveScroll({ axis: "vertical", direction: "page-forward" }, geometry),
    ).toStrictEqual({ x: -20, y: -460 });
    expect(
      resolveScroll({ axis: "horizontal", direction: "line-back" }, geometry),
    ).toStrictEqual({ x: 20, y: -100 });
  });

  it("starts at zero and ends at the runtime's clamp sentinel", () => {
    expect(
      resolveScroll({ axis: "vertical", direction: "start" }, geometry),
    ).toStrictEqual({ x: -20, y: 0 });
    expect(
      resolveScroll({ axis: "both", direction: "end" }, geometry),
    ).toStrictEqual({
      x: -Number.MAX_SAFE_INTEGER,
      y: -Number.MAX_SAFE_INTEGER,
    });
  });

  it("never pages by less than one line, whatever the viewport", () => {
    const tiny = { ...geometry, viewport: { width: 200, height: 10 } };
    expect(
      resolveScroll({ axis: "vertical", direction: "page-forward" }, tiny),
    ).toStrictEqual({ x: -20, y: -140 });
  });

  it("takes the line step from the theme's body leading", () => {
    expect(scrollLine(testTheme)).toBe(
      3 * testTheme.typography.body.lineHeight,
    );
  });
});
