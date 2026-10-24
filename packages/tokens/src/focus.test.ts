/**
 * Guards the focus-ring contract after plan 053's native probe.
 *
 * 1. The keyboard ring must be an outline in the runtime's `focusVisible` state,
 *    not a shadow. It is applied at rest, so the runtime paints it only after a
 *    Tab — a click must not show it. `@gpuix/native@0.11.0` declares
 *    `outline*` and `focusVisible`; a regression to a `boxShadow` would make the
 *    two input paths look identical again.
 * 2. The unconditional ring must stay available. The probe measured that
 *    `focusVisible` does not paint for a programmatic focus before any keyboard
 *    input, which is exactly how a mouse-opened dialog or menu focuses its
 *    content; that path paints `focusRing`'s shadow while focused.
 * 3. Both take their width from the theme's `borderWidth.strong` and their
 *    colour from the `ring` role, so a brand's border and focus colour follow.
 */

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
    // The line is separated from the control's own fill by one line's width, so
    // the strip behind the control shows through the gap and the ring is read
    // against that strip. A flush line on a filled action is drawn in the
    // action's own colour (`ring` is the brand).
    expect(focusVisible.outlineOffset).toBe(lightTheme.borderWidth.strong);
    expect(focusVisible.outlineOffset).toBeGreaterThan(0);
  });

  it("takes the outline width from the theme, not a literal", () => {
    const wide = extendTheme(lightTheme, { borderWidth: { strong: 3 } });
    expect(keyboardFocusRing(wide).focusVisible.outlineWidth).toBe(3);
    expect(keyboardFocusRing(wide).focusVisible.outlineWidth).not.toBe(
      keyboardFocusRing(lightTheme).focusVisible.outlineWidth,
    );
    // The gap is the line's own width, so it widens with it.
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

  /**
   * A stored theme is unknown input, and a store that truncated the theme past
   * `borderWidth` is exactly the shape `missingTokens` refuses — but the seams
   * paint mid-render, so the gate cannot be the answer. Both rings read
   * `theme.borderWidth.strong` straight off the group, so that theme threw
   * `TypeError: Cannot read properties of undefined (reading 'strong')` from the
   * first control a window focused: the keyboard affordance, the one paint a
   * reader needs to find where Tab went, took the window down instead. The line
   * answers the library's own width now — the rule `textStyle` and
   * `nativeTextTheme` follow for a lost type, radius or spacing step — while a
   * brand that carries the scale still paints its own number.
   */
  it("keeps its geometry when the theme lost the border scale", () => {
    // The storage boundary: a restored theme is read through `BorderSource`.
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

    // A lost group is a lost width, not a lost ring: the colour still paints.
    expect(
      keyboardFocusRing({ colors: lightTheme.colors }).focusVisible
        .outlineColor,
    ).toBe(lightTheme.colors.ring);

    // A brand that carries the scale still paints its own number.
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
    // The runtime does not move the focus off an element that becomes disabled,
    // so a declaration made anyway would stay painted on a control that refuses
    // every key. `undefined` is the absence, not an empty ring.
    expect(controlFocusRing(lightTheme, { disabled: true })).toBeUndefined();
    expect(
      controlFocusRing(darkTheme, { disabled: true, invalid: true }),
    ).toBeUndefined();
  });

  it("follows the ring's width for a theme that lost the border scale", () => {
    // The control's ring is the keyboard ring plus a state, so the width
    // fallback has one home: a stored theme's invalid ring keeps the library's
    // line and still takes the destructive colour.
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
    // The recolour is only as good as the role: `destructive` is held to the
    // boundary floor on the strips an invalid control sits on, so the ring is
    // not a colour nobody checked. This is the premise the recolour rests on.
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
    // A programmatic focus is the one path with no `focusVisible` fallback, so
    // the ring has to answer rather than empty the window — the rule
    // `controlFocusRing` follows for a disabled control.
    expect(focusRing({ borderWidth: lightTheme.borderWidth })).toBeUndefined();
    expect(
      focusRing({ borderWidth: lightTheme.borderWidth, colors: {} }),
    ).toBeUndefined();
    // The absence is the role, not the group: one role still paints.
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

  /**
   * The shadow has one property that is not a colour: its spread is the border
   * scale's strong step. A stored theme that lost that group — the shape the
   * gate refuses, and one a surface can still paint before the audit runs —
   * threw `TypeError: Cannot read properties of undefined (reading 'strong')`
   * out of a mouse-opened dialog's first focused frame. The width answers the
   * library's own step; the missing colour still answers `undefined`, because a
   * ring drawn in no colour is a ring nobody can see.
   */
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

    // A brand that carries the scale still spreads by its own number.
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
    // The example is what a reader copies: a failed validation keeps the
    // geometry and takes the destructive role, and a disabled control keeps its
    // quiet fill and declares no `focusVisible` at all.
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
  /**
   * §Paint-ready values promises that "the focus ring keeps its geometry with no
   * colour" for a stored theme, and that was only true for the colour: both
   * rings read the width off `theme.borderWidth` and threw on the group. The
   * sentence a consumer plans a truncated theme around is now the seam's own
   * rule, and it is printed wherever the ring is taught so a reader meets the
   * fallback before the audit does.
   */
  it("states the library's line a stored theme gets, on every page that teaches a ring", () => {
    const pages = [
      ["docs/tokens.md", "../../../docs/tokens.md"],
      ["docs/design-system.md", "../../../docs/design-system.md"],
      ["packages/tokens/README.md", "../README.md"],
      ["COMPONENTS.md", "../../../COMPONENTS.md"],
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
