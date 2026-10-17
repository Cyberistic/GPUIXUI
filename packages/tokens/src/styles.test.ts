import { describe, expect, it } from "vitest";
import { controlHeight, controlPaddingX, textStyle } from "./styles.js";
import { extendTheme, lightTheme } from "./theme.js";
import type { ControlSize } from "./scale.js";

const sizes: readonly ControlSize[] = ["sm", "md", "lg"];

describe("textStyle", () => {
  it("uses the sans family for prose roles", () => {
    expect(textStyle(lightTheme, "body").fontFamily).toBe(
      lightTheme.typography.sans,
    );
    expect(textStyle(lightTheme, "h1").fontFamily).toBe(
      lightTheme.typography.sans,
    );
  });

  it("uses the mono family for code roles", () => {
    expect(textStyle(lightTheme, "code").fontFamily).toBe(
      lightTheme.typography.mono,
    );
    expect(textStyle(lightTheme, "codeBlock").fontFamily).toBe(
      lightTheme.typography.mono,
    );
  });

  it("returns exactly the inline text properties", () => {
    const body = textStyle(lightTheme, "body");
    const keys = Object.keys(body);
    expect(keys).toHaveLength(4);
    expect(keys).toEqual(
      expect.arrayContaining([
        "fontSize",
        "lineHeight",
        "fontWeight",
        "fontFamily",
      ]),
    );
    expect(body.fontSize).toBe(lightTheme.typography.body.fontSize);
    expect(body.lineHeight).toBe(lightTheme.typography.body.lineHeight);
    expect(body.fontWeight).toBe(lightTheme.typography.body.fontWeight);
  });

  it("follows the active theme's density", () => {
    const compact = extendTheme(lightTheme, { density: "compact" });
    expect(controlHeight(compact, "md")).toBe(compact.density.controlHeight.md);
    expect(controlHeight(compact, "md")).not.toBe(
      controlHeight(lightTheme, "md"),
    );
  });
});

describe("control metrics", () => {
  it("delegates to the active density for every size", () => {
    sizes.forEach((size) => {
      expect(controlHeight(lightTheme, size)).toBe(
        lightTheme.density.controlHeight[size],
      );
      expect(controlPaddingX(lightTheme, size)).toBe(
        lightTheme.density.controlPaddingX[size],
      );
    });
  });
});
