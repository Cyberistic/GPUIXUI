import { describe, expect, it } from "vitest";
import { alpha } from "./color.js";
import { statusToneStyles } from "./status-tone.example.js";
import {
  controlHeight,
  controlPaddingX,
  statusTone,
  textStyle,
  type StatusTone,
} from "./styles.js";
import {
  darkTheme,
  extendTheme,
  highContrastLightTheme,
  lightTheme,
} from "./theme.js";
import type { ControlSize } from "./scale.js";

const sizes: readonly ControlSize[] = ["sm", "md", "lg"];

const tones: readonly StatusTone[] = [
  "info",
  "success",
  "warning",
  "destructive",
];

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

const toneThemes = [
  ["light", lightTheme],
  ["dark", darkTheme],
] as const;

describe("statusTone", () => {
  it("resolves every tone to its soft roles in every theme", () => {
    toneThemes.forEach(([label, theme]) => {
      tones.forEach((tone) => {
        const style = statusTone(theme, tone);
        expect(style.background, `${label} ${tone}`).toBe(
          theme.colors[`${tone}Soft`],
        );
        expect(style.foreground, `${label} ${tone}`).toBe(
          theme.colors[`${tone}SoftForeground`],
        );
        expect(style.border, `${label} ${tone}`).toBe(
          alpha(theme.colors[tone], 0.3),
        );
      });
    });
  });

  it("gives the four tones four distinct surfaces", () => {
    const backgrounds = tones.map(
      (tone) => statusTone(lightTheme, tone).background,
    );
    expect(new Set(backgrounds).size).toBe(tones.length);
  });

  it("does not reuse the light tones in dark mode", () => {
    tones.forEach((tone) => {
      expect(statusTone(lightTheme, tone)).not.toEqual(
        statusTone(darkTheme, tone),
      );
    });
  });

  it("follows a high-contrast theme", () => {
    tones.forEach((tone) => {
      const style = statusTone(highContrastLightTheme, tone);
      expect(style.background).toBe(
        highContrastLightTheme.colors[`${tone}Soft`],
      );
      expect(style.foreground).toBe(
        highContrastLightTheme.colors[`${tone}SoftForeground`],
      );
      expect(style.background).not.toBe(
        statusTone(lightTheme, tone).background,
      );
    });
  });
});

describe("status tone example", () => {
  it("spreads a tone into a container and label style", () => {
    const style = statusToneStyles(lightTheme, "warning");
    expect(style.container.backgroundColor).toBe(lightTheme.colors.warningSoft);
    expect(style.container.borderColor).toBe(
      alpha(lightTheme.colors.warning, 0.3),
    );
    expect(style.text.color).toBe(lightTheme.colors.warningSoftForeground);
    expect(style.text.fontSize).toBe(lightTheme.typography.label.fontSize);
  });
});
