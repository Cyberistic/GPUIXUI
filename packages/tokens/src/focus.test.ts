import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrastPairs } from "./contrast.js";
import { focusExample } from "./focus-ring.example.js";
import {
  controlFocusRing,
  focusRing,
  keyboardFocusRing,
  type BorderSource,
  type FocusRingSource,
} from "./styles.js";
import { borderWidth as shippedBorderWidth } from "./scale.js";
import {
  darkTheme,
  extendTheme,
  highContrastDarkTheme,
  highContrastLightTheme,
  lightTheme,
  type Theme,
} from "./theme.js";

const themes: ReadonlyArray<readonly [string, Theme]> = [
  ["light", lightTheme],
  ["dark", darkTheme],
  ["high-contrast light", highContrastLightTheme],
  ["high-contrast dark", highContrastDarkTheme],
];

const hex = /^#[0-9A-Fa-f]{6}(?:[0-9A-Fa-f]{2})?$/;

describe("keyboardFocusRing", () => {
  it("is the runtime's focusVisible state, not a shadow", () => {
    expect(Object.keys(keyboardFocusRing(lightTheme))).toEqual([
      "focusVisible",
    ]);
    expect(keyboardFocusRing(lightTheme)).not.toHaveProperty("boxShadow");
  });

  it("is an outline drawn outside the border box without taking layout space", () => {
    const { focusVisible } = keyboardFocusRing(lightTheme);
    expect(Object.keys(focusVisible).toSorted()).toEqual([
      "outlineColor",
      "outlineOffset",
      "outlineWidth",
    ]);
    expect(focusVisible.outlineWidth).toBe(lightTheme.borderWidth.strong);
    expect(focusVisible.outlineWidth).toBeGreaterThan(0);

    expect(focusVisible.outlineOffset).toBe(lightTheme.borderWidth.strong);
    expect(focusVisible.outlineOffset).toBeGreaterThan(0);
  });

  it("takes the outline width from the theme, not a literal", () => {
    const wide = extendTheme(lightTheme, { borderWidth: { strong: 3 } });
    expect(keyboardFocusRing(wide).focusVisible.outlineWidth).toBe(3);
    expect(keyboardFocusRing(wide).focusVisible.outlineWidth).not.toBe(
      keyboardFocusRing(lightTheme).focusVisible.outlineWidth,
    );

    expect(keyboardFocusRing(wide).focusVisible.outlineOffset).toBe(3);
  });

  it("paints the ring role of every shipped theme", () => {
    themes.forEach(([label, theme]) => {
      const { focusVisible } = keyboardFocusRing(theme);
      expect(focusVisible.outlineColor, label).toBe(theme.colors.ring);
      expect(focusVisible.outlineColor, label).toMatch(hex);
    });
  });

  it("differs between light and dark", () => {
    expect(keyboardFocusRing(lightTheme).focusVisible.outlineColor).not.toBe(
      keyboardFocusRing(darkTheme).focusVisible.outlineColor,
    );
  });

  it("keeps its geometry when the theme lost the border scale", () => {
    const stored: ReadonlyArray<readonly [string, BorderSource]> = [
      ["no group", { colors: lightTheme.colors }],
      ["a nulled group", { borderWidth: null, colors: lightTheme.colors }],
      ["a step a store wrote", JSON.parse('{"borderWidth":{"strong":"3"}}')],
      [
        "a step that is not a number",
        { borderWidth: { strong: NaN }, colors: lightTheme.colors },
      ],
    ];

    stored.forEach(([label, theme]) => {
      const { focusVisible } = keyboardFocusRing(theme);
      expect(focusVisible.outlineWidth, label).toBe(shippedBorderWidth.strong);
      expect(focusVisible.outlineOffset, label).toBe(shippedBorderWidth.strong);
    });

    expect(
      keyboardFocusRing({ colors: lightTheme.colors }).focusVisible
        .outlineColor,
    ).toBe(lightTheme.colors.ring);

    expect(
      keyboardFocusRing({
        borderWidth: { strong: 3 },
        colors: lightTheme.colors,
      }).focusVisible.outlineWidth,
    ).toBe(3);
  });
});

describe("controlFocusRing", () => {
  it("is the keyboard ring while the control can act", () => {
    themes.forEach(([label, theme]) => {
      expect(controlFocusRing(theme), label).toEqual(keyboardFocusRing(theme));
      expect(controlFocusRing(theme, { invalid: false }), label).toEqual(
        keyboardFocusRing(theme),
      );
    });
  });

  it("recolours the outline for an invalid control and leaves its geometry alone", () => {
    const ring = controlFocusRing(lightTheme, { invalid: true });
    const rest = keyboardFocusRing(lightTheme).focusVisible;

    expect(ring?.focusVisible.outlineColor).toBe(lightTheme.colors.destructive);
    expect(ring?.focusVisible.outlineColor).not.toBe(lightTheme.colors.ring);
    expect(ring?.focusVisible.outlineWidth).toBe(rest.outlineWidth);
    expect(ring?.focusVisible.outlineOffset).toBe(rest.outlineOffset);
  });

  it("declares no ring at all for a disabled control", () => {
    expect(controlFocusRing(lightTheme, { disabled: true })).toBeUndefined();
    expect(
      controlFocusRing(darkTheme, { disabled: true, invalid: true }),
    ).toBeUndefined();
  });

  it("follows the ring's width for a theme that lost the border scale", () => {
    const stored: FocusRingSource = { colors: lightTheme.colors };
    expect(controlFocusRing(stored)?.focusVisible).toEqual(
      keyboardFocusRing(stored).focusVisible,
    );
    expect(controlFocusRing(stored, { invalid: true })?.focusVisible).toEqual({
      outlineWidth: shippedBorderWidth.strong,
      outlineColor: lightTheme.colors.destructive,
      outlineOffset: shippedBorderWidth.strong,
    });
  });

  it("reads the width and the two roles from the theme, not a literal", () => {
    const brand = extendTheme(lightTheme, {
      borderWidth: { strong: 3 },
      colors: { ring: "#0A7F5A", destructive: "#8A1020" },
    });

    expect(controlFocusRing(brand)?.focusVisible.outlineWidth).toBe(3);
    expect(controlFocusRing(brand)?.focusVisible.outlineColor).toBe("#0A7F5A");
    expect(
      controlFocusRing(brand, { invalid: true })?.focusVisible.outlineColor,
    ).toBe("#8A1020");
  });

  it("paints an invalid control's outline from a role the contract measures", () => {
    expect(
      contrastPairs.some(
        (pair) =>
          pair.foreground === "destructive" && pair.floor === "boundary",
      ),
    ).toBe(true);
  });
});

describe("focusRing", () => {
  it("stays the unconditional shadow for a programmatic focus", () => {
    const { boxShadow } = focusRing(lightTheme);
    expect(Object.keys(focusRing(lightTheme))).toEqual(["boxShadow"]);
    expect(boxShadow.offsetX).toBe(0);
    expect(boxShadow.offsetY).toBe(0);
    expect(boxShadow.blurRadius).toBe(0);
    expect(boxShadow.spreadRadius).toBe(lightTheme.borderWidth.strong);
    expect(boxShadow.color).toBe(lightTheme.colors.ring);
  });

  it("spreads by the theme's border scale, not a literal", () => {
    const wide = extendTheme(lightTheme, { borderWidth: { strong: 3 } });
    expect(focusRing(wide).boxShadow.spreadRadius).toBe(3);
    expect(focusRing(wide).boxShadow.spreadRadius).not.toBe(
      focusRing(lightTheme).boxShadow.spreadRadius,
    );
  });

  it("paints no ring for a theme that lost the role, not a throw", () => {
    expect(focusRing({ borderWidth: lightTheme.borderWidth })).toBeUndefined();
    expect(
      focusRing({ borderWidth: lightTheme.borderWidth, colors: {} }),
    ).toBeUndefined();

    expect(
      focusRing({
        borderWidth: lightTheme.borderWidth,
        colors: { ring: "#7A57FA" },
      }),
    ).toEqual({
      boxShadow: {
        offsetX: 0,
        offsetY: 0,
        blurRadius: 0,
        spreadRadius: lightTheme.borderWidth.strong,
        color: "#7A57FA",
      },
    });
  });

  it("spreads by the library's line when the theme lost the border scale", () => {
    const stored: ReadonlyArray<readonly [string, BorderSource]> = [
      ["no group", { colors: { ring: "#7A57FA" } }],
      ["a nulled group", { borderWidth: null, colors: { ring: "#7A57FA" } }],
      [
        "a step a store wrote",
        JSON.parse(
          '{"borderWidth":{"strong":"3"},"colors":{"ring":"#7A57FA"}}',
        ),
      ],
    ];

    stored.forEach(([label, theme]) => {
      expect(focusRing(theme)?.boxShadow.spreadRadius, label).toBe(
        shippedBorderWidth.strong,
      );
    });

    expect(
      focusRing({ borderWidth: { strong: 3 }, colors: { ring: "#7A57FA" } })
        ?.boxShadow.spreadRadius,
    ).toBe(3);
  });
});

describe("focus example", () => {
  it("applies the keyboard ring at rest and keeps a shadow for programmatic focus", () => {
    const { rest, programmatic } = focusExample(lightTheme);
    expect(rest.focusVisible).toEqual(
      keyboardFocusRing(lightTheme).focusVisible,
    );
    expect(rest).not.toHaveProperty("boxShadow");
    expect(programmatic).toEqual(focusRing(lightTheme));
  });

  it("shows a control's two states around the same call", () => {
    const { invalid, disabled, rest } = focusExample(lightTheme);

    expect(rest.focusVisible).toBeDefined();
    expect(invalid.focusVisible?.outlineColor).toBe(
      lightTheme.colors.destructive,
    );
    expect(invalid.focusVisible?.outlineWidth).toBe(
      rest.focusVisible?.outlineWidth,
    );
    expect(disabled.focusVisible).toBeUndefined();
    expect(disabled.backgroundColor).toBe(lightTheme.colors.disabled);
  });
});

describe("the ring's width rule", () => {
  it("states the library's line a stored theme gets, on every page that teaches a ring", () => {
    const pages = [
      ["docs/tokens.md", "../../../docs/tokens.md"],
      ["docs/design-system.md", "../../../docs/design-system.md"],
      ["packages/tokens/README.md", "../README.md"],
      [".agents/slop/COMPONENTS.md", "../../../.agents/slop/COMPONENTS.md"],
    ] as const;

    pages.forEach(([path, url]) => {
      const page = readFileSync(new URL(url, import.meta.url), "utf8").replace(
        /\s+/g,
        " ",
      );
      expect(page, path).toContain(
        "`keyboardFocusRing` and `focusRing` fall back to the library's `borderWidth.strong`",
      );
    });
  });
});
