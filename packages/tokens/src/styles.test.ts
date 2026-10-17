import { describe, expect, it } from "vitest";
import { appRootStyle, chromeStyle } from "./selection.example.js";
import { statusToneStyles } from "./status-tone.example.js";
import { statusTextStyles } from "./status-text.example.js";
import {
  controlHeight,
  controlPaddingX,
  selectionStyle,
  statusTone,
  statusTones,
  textStyle,
} from "./styles.js";
import {
  darkTheme,
  extendTheme,
  highContrastLightTheme,
  lightTheme,
} from "./theme.js";
import { controlSizes } from "./scale.js";

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
    controlSizes.forEach((size) => {
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
      statusTones.forEach((tone) => {
        const style = statusTone(theme, tone);
        expect(style.background, `${label} ${tone}`).toBe(
          theme.colors[`${tone}Soft`],
        );
        expect(style.foreground, `${label} ${tone}`).toBe(
          theme.colors[`${tone}SoftForeground`],
        );
        expect(style.border, `${label} ${tone}`).toBe(
          theme.colors[`${tone}SoftBorder`],
        );
        expect(style.text, `${label} ${tone}`).toBe(
          theme.colors[`${tone}Text`],
        );
      });
    });
  });

  it("gives the four tones four distinct surfaces", () => {
    const backgrounds = statusTones.map(
      (tone) => statusTone(lightTheme, tone).background,
    );
    expect(new Set(backgrounds).size).toBe(statusTones.length);
  });

  it("does not reuse the light tones in dark mode", () => {
    statusTones.forEach((tone) => {
      expect(statusTone(lightTheme, tone)).not.toEqual(
        statusTone(darkTheme, tone),
      );
    });
  });

  it("follows a high-contrast theme", () => {
    statusTones.forEach((tone) => {
      const style = statusTone(highContrastLightTheme, tone);
      expect(style.background).toBe(
        highContrastLightTheme.colors[`${tone}Soft`],
      );
      expect(style.foreground).toBe(
        highContrastLightTheme.colors[`${tone}SoftForeground`],
      );
      expect(style.text).toBe(highContrastLightTheme.colors[`${tone}Text`]);
      expect(style.background).not.toBe(
        statusTone(lightTheme, tone).background,
      );
    });
  });
});

describe("status text example", () => {
  it("paints the label and the indicator dot from the tone's text role", () => {
    const style = statusTextStyles(lightTheme, "warning");
    expect(style.label.color).toBe(lightTheme.colors.warningText);
    expect(style.dot.backgroundColor).toBe(lightTheme.colors.warningText);
    expect(style.dot.width).toBe(lightTheme.iconSize.xs);
  });

  it("uses a text role that is not the solid fill", () => {
    const style = statusTextStyles(lightTheme, "warning");
    expect(style.label.color).not.toBe(lightTheme.colors.warning);
  });
});

describe("status tone example", () => {
  it("spreads a tone into a container and label style", () => {
    const style = statusToneStyles(lightTheme, "warning");
    expect(style.container.backgroundColor).toBe(lightTheme.colors.warningSoft);
    expect(style.container.borderColor).toBe(
      lightTheme.colors.warningSoftBorder,
    );
    expect(style.text.color).toBe(lightTheme.colors.warningSoftForeground);
    expect(style.text.fontSize).toBe(lightTheme.typography.label.fontSize);
  });
});

describe("selectionStyle", () => {
  it("maps the theme's wash to the runtime's selection property", () => {
    expect(selectionStyle(lightTheme)).toEqual({
      selectionColor: lightTheme.colors.selection,
    });
  });

  it("follows the active theme", () => {
    [darkTheme, highContrastLightTheme].forEach((theme) => {
      expect(selectionStyle(theme).selectionColor).toBe(theme.colors.selection);
    });
    expect(selectionStyle(darkTheme).selectionColor).not.toBe(
      selectionStyle(lightTheme).selectionColor,
    );
  });
});

describe("selection example", () => {
  it("sets the wash on the root and opts chrome out", () => {
    expect(appRootStyle(lightTheme)).toEqual(selectionStyle(lightTheme));
    expect(chromeStyle.userSelect).toBe("none");
  });
});
