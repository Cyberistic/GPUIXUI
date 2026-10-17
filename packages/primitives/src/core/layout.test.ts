import { describe, expect, it } from "vitest";
import { boxStyle, gridStyle, stackStyle } from "./layout.js";
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
