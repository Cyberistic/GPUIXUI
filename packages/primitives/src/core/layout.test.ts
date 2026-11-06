import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import {
  boxStyle,
  fieldRows,
  gridStyle,
  isStackDirection,
  stackDirection,
  stackStyle,
} from "./layout.js";
import { testTheme } from "./testing/theme.fixture.js";

describe("stackStyle", () => {
  it("maps the logical direction onto the runtime's flex value", () => {
    expect(stackStyle({ direction: "column" }, testTheme).flexDirection).toBe(
      "column",
    );
    expect(stackStyle({ direction: "row" }, testTheme).flexDirection).toBe(
      "row",
    );
  });

  it("reads a stored direction this release does not carry as the column it painted", () => {
    const stored: ReadonlyArray<unknown> = [
      "vertical",
      "horizontal",
      "ROW",
      "",
      "row-reverse",
      null,
      2,
      { axis: "row" },
    ];
    expect(stackDirection(undefined)).toBe("column");
    expect(stackDirection("row")).toBe("row");
    expect(stackDirection("column")).toBe("column");
    Arr.forEach(stored, (value) => {
      expect(stackDirection(value), String(value)).toBe("column");

      expect(
        stackStyle({ direction: value as "row" | "column" }, testTheme)
          .flexDirection,
        String(value),
      ).toBe("column");
    });
  });

  it("tests membership against the two axes the runtime draws", () => {
    expect(isStackDirection("row")).toBe(true);
    expect(isStackDirection("column")).toBe(true);

    expect(isStackDirection("row-reverse")).toBe(false);
    expect(isStackDirection("toString")).toBe(false);
    expect(isStackDirection(null)).toBe(false);
    expect(isStackDirection(0)).toBe(false);
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
    expect(fieldRows(4, 2)).toEqual({ minRows: 4, maxRows: 4 });
  });

  it("leaves a saved row count it cannot read to the runtime", () => {
    expect(fieldRows(null, null)).toEqual({
      minRows: undefined,
      maxRows: undefined,
    });
    expect(fieldRows("3", "8")).toEqual({
      minRows: undefined,
      maxRows: undefined,
    });
    expect(fieldRows(null, 8)).toEqual({ minRows: undefined, maxRows: 8 });
    expect(fieldRows(3, null)).toEqual({ minRows: 3, maxRows: undefined });
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
