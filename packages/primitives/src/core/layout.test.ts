import { describe, expect, it } from "vitest";
import { boxStyle, fieldRows, gridStyle, stackStyle } from "./layout.js";
import { testTheme } from "./testing/theme.fixture.js";

/**
 * Guards the geometry resolvers, because nothing else can.
 *
 * A wrong `gap` step or an inverted `direction` is a layout that is subtly off
 * on screen and perfectly valid to the compiler. With no runtime to render into
 * (see `docs/gpuix-capabilities.md`), the numeric contract asserted here is the only proof that a
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

  it("reads a count it cannot draw as one track", () => {
    // The bug guarded: `Math.max(1, Math.floor(NaN))` is `NaN`, so a count from
    // a measurement that never arrived reached the runtime as no template at all
    // and the element painted as a block — not a grid, and nothing said so.
    expect(
      gridStyle({ columns: Number.NaN }, testTheme).gridTemplateColumns,
    ).toBe(1);
    expect(
      gridStyle({ columns: Number.POSITIVE_INFINITY }, testTheme)
        .gridTemplateColumns,
    ).toBe(1);
    expect(
      gridStyle({ columns: 2, rows: Number.NaN }, testTheme).gridTemplateRows,
    ).toBe(1);
    expect(
      gridStyle({ columns: 2, rows: Number.NEGATIVE_INFINITY }, testTheme)
        .gridTemplateRows,
    ).toBe(1);
  });
});

describe("fieldRows", () => {
  it("floors a fractional row count the runtime would drop", () => {
    // The bug guarded: the runtime reads `minRows`/`maxRows` as whole rows and
    // discards a fractional count rather than flooring it, so a floor computed
    // from a measured height (2.5 rows) painted ONE row — fewer than
    // `minRows={2}` — and a fractional cap painted the whole field.
    expect(fieldRows(2.5, undefined)).toEqual({
      minRows: 2,
      maxRows: undefined,
    });
    expect(fieldRows(undefined, 2.5)).toEqual({
      minRows: undefined,
      maxRows: 2,
    });
    expect(fieldRows(3.9, 4.9)).toEqual({ minRows: 3, maxRows: 4 });
  });

  it("reads a row count it cannot lay out as one row", () => {
    expect(fieldRows(0, 0)).toEqual({ minRows: 1, maxRows: 1 });
    expect(fieldRows(-3, Number.NaN)).toEqual({ minRows: 1, maxRows: 1 });
    expect(fieldRows(Number.POSITIVE_INFINITY, -2)).toEqual({
      minRows: 1,
      maxRows: 1,
    });
  });

  it("leaves an absent count to the runtime's own height control", () => {
    expect(fieldRows(undefined, undefined)).toEqual({
      minRows: undefined,
      maxRows: undefined,
    });
    expect(fieldRows(3, undefined)).toEqual({
      minRows: 3,
      maxRows: undefined,
    });
  });

  it("never caps a field below the floor it paints", () => {
    // The runtime paints the floor when the pair is inverted, so a passed-through
    // cap of 2 described a box the field never drew (it painted four rows).
    expect(fieldRows(4, 2)).toEqual({ minRows: 4, maxRows: 4 });
  });
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
