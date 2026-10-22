import { describe, expect, it } from "vitest";
import {
  filledActionStyles,
  toggleFillStyles,
} from "./action-states.example.js";
import { alpha, blend, type ThemeColors } from "./color.js";
import {
  contrastFloors,
  contrastFloorsFor,
  contrastRatio,
} from "./contrast.js";
import { platformNames } from "./platforms.js";
import { retroNames, retroTheme } from "./retro.js";
import { statusToneStyles } from "./status-tone.example.js";
import {
  controlHeight,
  controlPaddingX,
  filledHover,
  filledPressed,
  statusTone,
  statusTones,
  textStyle,
  type FilledAction,
  type FilledRole,
} from "./styles.js";
import {
  darkTheme,
  extendTheme,
  highContrastDarkTheme,
  highContrastLightTheme,
  highContrastThemes,
  lightTheme,
  platformTheme,
  themes,
} from "./theme.js";
import { controlSizes } from "./scale.js";

const tones = statusTones;

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

  it("gives a status message text the page floor measures", () => {
    // The same role a component paints on the soft surface is the one it paints
    // as page text (a field error, an inline warning), so both surfaces are
    // measured. The solid status fill would read 4.4:1 here, below the body
    // floor — which is why the soft foreground is the text role.
    toneThemes.forEach(([label, theme]) => {
      tones.forEach((tone) => {
        const ratio = contrastRatio(
          statusTone(theme, tone).foreground,
          theme.colors.background,
        );
        expect(ratio, `${label} ${tone}`).toBeGreaterThanOrEqual(
          contrastFloors.body,
        );
      });
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

/**
 * Guards the defect the `filledHover` / `filledPressed` helpers were written
 * for: components painted a filled button's hover as `alpha(primary, 0.5)`.
 * A half-alpha fill is translucent, so the button showed whatever surface was
 * behind it — the same action read as two colours on a card and on a dialog —
 * and it could not be checked for label contrast. The derived fill is opaque,
 * moves per channel, and belongs to the theme it came from.
 */

const filledActions: readonly FilledAction[] = [
  "primary",
  "secondary",
  "destructive",
];

const filledRoles: readonly FilledRole[] = [...filledActions, "accent"];

/** The label role each filled face paints over its own fill. */
const filledOn: Readonly<Record<FilledRole, keyof ThemeColors>> = {
  primary: "primaryForeground",
  secondary: "secondaryForeground",
  destructive: "destructiveForeground",
  accent: "accentForeground",
};

const fillThemes = [
  ["light", lightTheme],
  ["dark", darkTheme],
  ["high-contrast light", highContrastLightTheme],
  ["high-contrast dark", highContrastDarkTheme],
] as const;

/** Every shipped, high-contrast, platform and authored style. */
const shippedStyles = [
  ...Object.values(themes),
  ...Object.values(highContrastThemes),
  ...platformNames.flatMap((platform) =>
    Object.values(themes).map((theme) => platformTheme(theme, platform)),
  ),
  ...retroNames.flatMap((look) =>
    Object.values(themes).map((theme) => retroTheme(theme, look)),
  ),
] as const;

/** One `#RRGGBB` channel: 1 red, 3 green, 5 blue. */
const channelAt = (color: string, at: number): number =>
  Number.parseInt(color.slice(at, at + 2), 16);

/** How far each channel of `fill` is from `target`, summed. */
const channelDistance = (fill: string, target: string): number =>
  [1, 3, 5].reduce(
    (total, at) =>
      total + Math.abs(channelAt(fill, at) - channelAt(target, at)),
    0,
  );

describe("filled action fills", () => {
  it("paints an opaque fill in every theme", () => {
    fillThemes.forEach(([label, theme]) => {
      filledActions.forEach((action) => {
        expect(filledHover(theme, action), `${label} ${action} hover`).toMatch(
          /^#[0-9A-F]{6}$/,
        );
        expect(
          filledPressed(theme, action),
          `${label} ${action} press`,
        ).toMatch(/^#[0-9A-F]{6}$/);
      });
    });
  });

  it("moves every channel from the fill toward the theme's foreground", () => {
    fillThemes.forEach(([label, theme]) => {
      filledActions.forEach((action) => {
        [filledHover(theme, action), filledPressed(theme, action)].forEach(
          (derived) => {
            [1, 3, 5].forEach((at) => {
              const value = channelAt(derived, at);
              const low = Math.min(
                channelAt(theme.colors[action], at),
                channelAt(theme.colors.foreground, at),
              );
              const high = Math.max(
                channelAt(theme.colors[action], at),
                channelAt(theme.colors.foreground, at),
              );
              expect(
                value,
                `${label} ${action} channel ${at}`,
              ).toBeGreaterThanOrEqual(low);
              expect(
                value,
                `${label} ${action} channel ${at}`,
              ).toBeLessThanOrEqual(high);
            });
          },
        );
        expect(filledHover(theme, action), `${label} ${action}`).not.toBe(
          theme.colors[action],
        );
      });
    });
  });

  it("presses further than it hovers, and stops short of the foreground", () => {
    fillThemes.forEach(([label, theme]) => {
      filledActions.forEach((action) => {
        const fill = theme.colors[action];
        const hover = channelDistance(filledHover(theme, action), fill);
        const press = channelDistance(filledPressed(theme, action), fill);
        expect(press, `${label} ${action} press > hover`).toBeGreaterThan(
          hover,
        );
        expect(press, `${label} ${action} press < foreground`).toBeLessThan(
          channelDistance(theme.colors.foreground, fill),
        );
      });
    });
  });

  it("keeps the three action fills distinct", () => {
    fillThemes.forEach(([label, theme]) => {
      const hovers = filledActions.map((action) => filledHover(theme, action));
      expect(new Set(hovers).size, label).toBe(filledActions.length);
    });
  });

  it("follows a brand's own primary rather than a stored value", () => {
    const brand = extendTheme(lightTheme, { colors: { primary: "#0F7A4A" } });
    expect(filledHover(brand, "primary")).toBe("#106F46");
    expect(filledHover(lightTheme, "primary")).toBe("#5745C5");
  });
});

describe("action state example", () => {
  it("holds the label colour while the fill moves", () => {
    const states = filledActionStyles(lightTheme, "destructive");
    expect(states.resting.backgroundColor).toBe(lightTheme.colors.destructive);
    expect(states.hover.backgroundColor).toBe(
      filledHover(lightTheme, "destructive"),
    );
    expect(states.pressed.backgroundColor).toBe(
      filledPressed(lightTheme, "destructive"),
    );
    expect(states.hover.color).toBe(states.resting.color);
    expect(states.pressed.color).toBe(states.resting.color);
  });

  it("paints its disabled state with the neutral pair, not a faded fill", () => {
    // The fade is a page mechanism: on a card it lands under the disabled floor
    // (`disabled.test.ts`). The example therefore teaches the pair, which keeps
    // its label readable and does not depend on what is painted behind it.
    const states = filledActionStyles(lightTheme, "primary");
    expect(states.disabled).toEqual({
      backgroundColor: lightTheme.colors.disabled,
      color: lightTheme.colors.disabledForeground,
    });
    expect(states.disabled.backgroundColor).not.toBe(
      states.resting.backgroundColor,
    );
  });
});

/**
 * Guards the widened filled-role contract: a toggle's on-state paints the
 * `accent` role, and both packages lifted that role's alpha for hover and press
 * (`0.9` / `0.8`) instead of deriving an opaque fill. That is the same defect
 * the action fills were written for — the surface behind the control shows
 * through, so the same toggle reads as two colours on a card and on a dialog —
 * and the accent label has less headroom than any action: at the fixed 18% press
 * it lands at 4.42:1 in macOS dark (under 4.5) and 6.90/6.94:1 in the two
 * high-contrast themes (under 7), so the step has to stop where the label's
 * floor starts.
 */
describe("filled role fills", () => {
  it("keeps every role's label on its floor in every shipped style", () => {
    expect(shippedStyles.length).toBeGreaterThanOrEqual(16);
    shippedStyles.forEach((theme) => {
      filledRoles.forEach((role) => {
        const floor = contrastFloorsFor(theme).secondary;
        [filledHover(theme, role), filledPressed(theme, role)].forEach(
          (fill) => {
            const ratio = contrastRatio(theme.colors[filledOn[role]], fill);
            expect(
              ratio,
              `${theme.name} ${role} (needs ${floor})`,
            ).toBeGreaterThanOrEqual(floor);
            expect(fill, `${theme.name} ${role}`).toMatch(/^#[0-9A-F]{6}$/);
          },
        );
      });
    });
  });

  it("clamps the accent press where the full step loses the label", () => {
    const fullStep = (theme: typeof lightTheme): string =>
      blend(theme.colors.accent, theme.colors.foreground, 0.18);
    const cases = [
      ["macOS dark", platformTheme(darkTheme, "darwin"), 4.5, "4.42"],
      ["high-contrast light", highContrastLightTheme, 7, "6.90"],
      ["high-contrast dark", highContrastDarkTheme, 7, "6.94"],
    ] as const;

    cases.forEach(([label, theme, floor, printed]) => {
      const raw = contrastRatio(theme.colors.accentForeground, fullStep(theme));
      expect(raw, label).toBeDefined();
      expect(raw, label).toBeLessThan(floor);
      expect(raw?.toFixed(2), label).toBe(printed);

      const pressed = filledPressed(theme, "accent");
      expect(pressed, label).not.toBe(fullStep(theme));
      expect(
        contrastRatio(theme.colors.accentForeground, pressed),
        label,
      ).toBeGreaterThanOrEqual(floor);
      // The clamp stops the step short; it does not flatten the press.
      expect(pressed, label).not.toBe(filledHover(theme, "accent"));
    });
  });

  it("leaves the three action roles at their full step", () => {
    shippedStyles.forEach((theme) => {
      filledActions.forEach((action) => {
        expect(filledHover(theme, action), `${theme.name} ${action}`).toBe(
          blend(theme.colors[action], theme.colors.foreground, 0.12),
        );
        expect(filledPressed(theme, action), `${theme.name} ${action}`).toBe(
          blend(theme.colors[action], theme.colors.foreground, 0.18),
        );
      });
    });
  });

  it("presses further than it hovers in every role the themes ship", () => {
    shippedStyles.forEach((theme) => {
      filledRoles.forEach((role) => {
        const fill = theme.colors[role];
        const hover = channelDistance(filledHover(theme, role), fill);
        const press = channelDistance(filledPressed(theme, role), fill);
        expect(press, `${theme.name} ${role}`).toBeGreaterThan(hover);
        expect(hover, `${theme.name} ${role}`).toBeGreaterThan(0);
      });
    });
  });

  it("keeps the nominal step when the resting pair already misses", () => {
    // Nothing can be derived that reads when the role it derives from does not,
    // and the gate already reports the theme. Dropping the step to zero would
    // remove the pointer cue as well, so the fill still moves.
    const broken = extendTheme(lightTheme, {
      colors: { accent: lightTheme.colors.accentForeground },
    });
    expect(filledHover(broken, "accent")).toBe(
      blend(broken.colors.accent, broken.colors.foreground, 0.12),
    );
    expect(filledPressed(broken, "accent")).toBe(
      blend(broken.colors.accent, broken.colors.foreground, 0.18),
    );
    expect(filledHover(broken, "accent")).not.toBe(broken.colors.accent);
  });

  it("executes the toggle example in the accent role", () => {
    const states = toggleFillStyles(lightTheme);
    expect(states.resting.backgroundColor).toBe(lightTheme.colors.accent);
    expect(states.hover.backgroundColor).toBe(
      filledHover(lightTheme, "accent"),
    );
    expect(states.pressed.backgroundColor).toBe(
      filledPressed(lightTheme, "accent"),
    );
    expect(states.hover.color).toBe(lightTheme.colors.accentForeground);
    expect(states.pressed.color).toBe(lightTheme.colors.accentForeground);
  });
});
