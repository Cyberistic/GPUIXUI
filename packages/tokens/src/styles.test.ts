import { readFileSync } from "node:fs";
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
  filledFeedback,
  filledHover,
  filledPressed,
  statusTone,
  statusTones,
  isStatusTone,
  textStyle,
  type DensitySource,
  type FilledAction,
  type FilledRole,
  type StatusTone,
  type TypeSource,
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
  type Theme,
} from "./theme.js";
import { controlSizes, type ControlSize } from "./scale.js";
import type { TextRole } from "./typography.js";

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

  it("reads a role the scale does not carry as the body role", () => {
    const stored = JSON.parse('"subtitle"') as TextRole;

    expect(textStyle(lightTheme, stored)).toEqual(
      textStyle(lightTheme, "body"),
    );

    expect(textStyle(lightTheme, stored).fontFamily).toBe(
      lightTheme.typography.sans,
    );

    expect(textStyle(lightTheme, "h1")).toEqual({
      fontSize: lightTheme.typography.h1.fontSize,
      lineHeight: lightTheme.typography.h1.lineHeight,
      fontWeight: lightTheme.typography.h1.fontWeight,
      fontFamily: lightTheme.typography.sans,
    });
  });

  it("answers the library's type for a theme that lost it", () => {
    const stored = (typography: unknown) =>
      ({ ...lightTheme, typography }) as Theme;
    const lost = stored(undefined);
    const nulled = stored(null);

    expect(textStyle(lost, "body")).toEqual(textStyle(lightTheme, "body"));
    expect(textStyle(nulled, "codeBlock")).toEqual(
      textStyle(lightTheme, "codeBlock"),
    );

    expect(textStyle(lost, "code").fontFamily).toBe(lightTheme.typography.mono);
    const blank = stored({
      typography: { ...lightTheme.typography, sans: " " },
    });
    expect(textStyle(blank, "h2").fontFamily).toBe(lightTheme.typography.sans);
    const droppedRole = stored({
      typography: { ...lightTheme.typography, body: null },
    });
    expect(textStyle(droppedRole, "body")).toEqual(
      textStyle(lightTheme, "body"),
    );

    const droppedSize = stored({
      typography: {
        ...lightTheme.typography,
        caption: { ...lightTheme.typography.caption, fontSize: Number.NaN },
      },
    });
    expect(textStyle(droppedSize, "caption").fontSize).toBe(
      lightTheme.typography.caption.fontSize,
    );

    const brand = extendTheme(lightTheme, {
      typography: { body: { fontSize: 16, lineHeight: 24 }, sans: "Brand" },
    });
    expect(textStyle(brand, "body")).toMatchObject({
      fontSize: 16,
      lineHeight: 24,
      fontFamily: "Brand",
    });
  });

  it("reads the shape a store hands back, without a cast", () => {
    const stored: TypeSource = {
      typography: {
        body: { fontSize: 18, lineHeight: 26, fontWeight: 500 },
        sans: "Inter",
      },
    };
    expect(textStyle(stored, "body")).toEqual({
      fontSize: 18,
      lineHeight: 26,
      fontWeight: 500,
      fontFamily: "Inter",
    });

    const partial: TypeSource = { typography: { h1: { fontSize: 40 } } };
    expect(textStyle(partial, "h1")).toEqual(textStyle(lightTheme, "h1"));

    const empty: TypeSource = {};
    const nulled: TypeSource = { typography: null };
    expect(textStyle(empty, "code")).toEqual(textStyle(lightTheme, "code"));
    expect(textStyle(nulled, "body")).toEqual(textStyle(lightTheme, "body"));
  });
});

describe("the type group's paint rule", () => {
  const read = (path: string): string =>
    readFileSync(new URL(path, import.meta.url), "utf8").replace(/\s+/g, " ");
  const catalogue = read("../../../docs/tokens.md");
  const designSystem = read("../../../docs/design-system.md");
  const readme = read("../README.md");
  const seam = read("./styles.ts");
  const host = read("./native-text.ts");

  it("reads the library's role in the seam, not the theme group alone", () => {
    expect(seam).toContain("shippedTypography[name]");
    expect(seam).toContain("shippedTypography[roleFamily[name]]");
    expect(host).toContain('familyOf(theme, "sans")');
    expect(host).toContain("stepOf(theme.radius, radius");
    expect(host).toContain("stepOf(theme.spacing, spacing");

    expect(seam).not.toContain("theme.typography[name];");
    expect(host).not.toContain("theme.typography.sans");
  });

  it("states the split on the catalogue, the design system and the README", () => {
    expect(catalogue).toContain("the paint is a fallback");
    expect(designSystem).toContain("The paint seams still do not throw");
    expect(readme).toContain("The paint seams are not the refusal");
    [catalogue, designSystem, readme].forEach((page) => {
      expect(page).toContain("missingTokens");
      expect(page).toContain("library's own role");

      expect(page).not.toContain("so an absent role throws");
    });
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

  it("reads a size the scale does not carry as the default step", () => {
    const stored = JSON.parse('"xs"') as ControlSize;

    expect(controlHeight(lightTheme, stored)).toBe(
      controlHeight(lightTheme, "md"),
    );
    expect(controlPaddingX(lightTheme, stored)).toBe(
      controlPaddingX(lightTheme, "md"),
    );
    expect(controlHeight(lightTheme, stored)).toBeGreaterThan(0);
  });

  it("answers a density the theme lost as no box, not a throw", () => {
    const lost: DensitySource = { density: null };
    const empty: DensitySource = { density: {} };
    const noGroup: DensitySource = {};

    [lost, empty, noGroup].forEach((theme) => {
      expect(controlHeight(theme, "md")).toBeUndefined();
      expect(controlPaddingX(theme, "md")).toBeUndefined();
    });

    expect(
      controlHeight({ density: { controlHeight: { md: 30 } } }, "md"),
    ).toBe(30);
    expect(
      controlPaddingX({ density: { controlHeight: { md: 30 } } }, "md"),
    ).toBeUndefined();

    const stored: DensitySource = JSON.parse(
      '{"density":{"controlHeight":{"md":"8"},"controlPaddingX":{"md":null}}}',
    );
    expect(controlHeight(stored, "md")).toBeUndefined();
    expect(controlPaddingX(stored, "md")).toBeUndefined();

    expect(controlHeight(lightTheme, "md")).toBe(
      lightTheme.density.controlHeight.md,
    );
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

  it("reads a tone this release does not ship as the default tone", () => {
    const stored = JSON.parse('"danger"') as StatusTone;

    toneThemes.forEach(([label, theme]) => {
      expect(statusTone(theme, stored), label).toEqual(
        statusTone(theme, "info"),
      );
    });

    expect(isStatusTone(stored)).toBe(false);
    expect(isStatusTone("destructive")).toBe(true);

    tones.forEach((tone) => {
      expect(statusTone(lightTheme, tone).background).toBe(
        lightTheme.colors[`${tone}Soft`],
      );
    });

    expect(statusTone({ colors: {} }, stored)).toBeUndefined();
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

const filledActions: readonly FilledAction[] = [
  "primary",
  "secondary",
  "destructive",
];

const filledRoles: readonly FilledRole[] = [...filledActions, "accent"];

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

const channelAt = (color: string, at: number): number =>
  Number.parseInt(color.slice(at, at + 2), 16);

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

  it("reads a theme that lost the colour group as no fill, not a throw", () => {
    expect(filledHover({}, "primary")).toBeUndefined();
    expect(filledPressed({}, "primary")).toBeUndefined();

    expect(
      filledHover({ colors: { primary: "#5F4BDB" } }, "primary"),
    ).toBeUndefined();

    filledRoles.forEach((role) => {
      expect(filledHover(lightTheme, role)).toBe(
        filledFeedback(lightTheme, role, "hover"),
      );
      expect(filledPressed(lightTheme, role)).toBe(
        filledFeedback(lightTheme, role, "pressed"),
      );
    });

    const page = (path: string): string =>
      readFileSync(new URL(path, import.meta.url), "utf8").replace(/\s+/g, " ");
    expect(page("../../../docs/tokens.md")).toContain(
      "a control keeps the resting fill",
    );
    expect(page("../../../.agents/slop/COMPONENTS.md")).toContain(
      "both helpers delegate to `filledFeedback`",
    );
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

describe("the edge a filled action keeps", () => {
  const painter = readFileSync(
    new URL("../../components/src/internal/button.tsx", import.meta.url),
    "utf8",
  );

  it("reads the one variant that paints an edge, and the default it is", () => {
    expect(painter).toMatch(
      /secondary:\s*(?:"[^"]*border border-strong[^"]*"|\{[^}]*border border-strong[^}]*\})/,
    );
    expect(painter).toContain('variant = "secondary"');
    ["primary", "ghost", "danger"].forEach((variant) => {
      expect(painter, variant).not.toContain(`${variant}: "border`);
    });
  });

  it("clears the boundary floor on both fills in every shipped style", () => {
    const placements = shippedStyles.flatMap((theme) =>
      [filledHover(theme, "secondary"), filledPressed(theme, "secondary")].map(
        (fill, index) => ({
          name: `${theme.name} ${index === 0 ? "hover" : "pressed"}`,
          ratio: contrastRatio(theme.colors.borderStrong, fill),
          floor: contrastFloorsFor(theme).boundary,
        }),
      ),
    );
    placements.forEach(({ name, ratio, floor }) => {
      expect(ratio, `${name} (needs ${floor}:1)`).toBeDefined();
      expect(ratio, `${name} (needs ${floor}:1)`).toBeGreaterThanOrEqual(floor);
    });
  });

  it("prints the tightest derived placement", () => {
    const tightest = shippedStyles
      .map((theme) => ({
        name: theme.name,
        ratio: contrastRatio(
          theme.colors.borderStrong,
          filledPressed(theme, "secondary"),
        ),
      }))
      .reduce((low, next) =>
        (next.ratio ?? 0) < (low.ratio ?? 0) ? next : low,
      );

    expect(tightest.name).toBe("Dark · Windows");
    expect(tightest.ratio?.toFixed(2)).toBe("3.00");

    expect(
      readFileSync(
        new URL("../../../docs/tokens.md", import.meta.url),
        "utf8",
      ).replace(/\s+/g, " "),
    ).toContain(`pressed fill at ${tightest.ratio?.toFixed(2)}:1`);
  });

  it("reports the palette this contract moved", () => {
    const before = extendTheme(lightTheme, {
      colors: { borderStrong: "#6A7483" },
    });
    expect(
      contrastRatio(
        before.colors.borderStrong,
        before.colors.secondary,
      )?.toFixed(2),
    ).toBe("3.74");
    expect(
      contrastRatio(
        before.colors.borderStrong,
        filledPressed(before, "secondary"),
      )?.toFixed(2),
    ).toBe("2.62");

    expect(lightTheme.colors.borderStrong).toBe("#616A79");
  });

  it("prints the sixteen-style figures as the set they were measured on", () => {
    const catalogue = readFileSync(
      new URL("../../../docs/tokens.md", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");
    const design = readFileSync(
      new URL("../../../docs/design-system.md", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");
    const readme = readFileSync(
      new URL("../README.md", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");

    expect(shippedStyles.length, "the sweep this history sits beside").toBe(18);
    expect(catalogue).toContain(
      "**twelve** of the sixteen styles that shipped at the time hovered",
    );
    expect(design).toContain(
      "fifteen of the sixteen styles that shipped at the time on the pressed fill",
    );
    expect(design).toContain(
      "fifteen of the sixteen styles that shipped at the time under the floor",
    );
    expect(readme).toContain("over the 16 styles that shipped at the time");

    const retired = [
      "of the sixteen shipped styles",
      "twelve of the sixteen shipped",
      "over the 16 styles (",
    ];
    [catalogue, design, readme].forEach((text) => {
      retired.forEach((phrase) => expect(text).not.toContain(phrase));
    });
  });
});

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
